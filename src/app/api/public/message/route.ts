import { NextResponse } from 'next/server';
import { isValidClaimToken, jsonDbError, jsonError, tooManyRequests } from '@/lib/api';
import { sendCapReachedEmail } from '@/lib/email';
import { fetchContributorPostState } from '@/lib/quota';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { getAppSettings } from '@/lib/settings';
import { siteUrl } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac']);
const TRIGGER_RADIUS_M = 70;
/** Deux messages ne peuvent pas partager le meme metre de parcours. */
const MIN_GAP_M = 120;
/** Ni la meme minute de course, en mode temps. */
const MIN_GAP_S = 60;

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Previent le coureur • une seule fois • que sa course a atteint le plafond
 * offert. `cap_notified_at` sert de garde atomique : seul le premier appel qui
 * bascule la colonne envoie l'e-mail.
 */
async function notifyRunnerCapReached(
  supabase: AdminClient,
  race: { id: string; name: string; user_id: string },
  freeCap: number,
  unlockedCap: number,
  priceCents: number,
): Promise<void> {
  const { data: claimed } = await supabase
    .from('races')
    .update({ cap_notified_at: new Date().toISOString() })
    .eq('id', race.id)
    .is('cap_notified_at', null)
    .select('id')
    .maybeSingle();

  // Un autre message concurrent a deja declenche l'e-mail.
  if (!claimed) return;

  const { data: owner } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', race.user_id)
    .maybeSingle();

  if (!owner?.email) return;

  await sendCapReachedEmail({
    to: owner.email,
    raceName: race.name,
    freeCap,
    unlockedCap,
    priceLabel: formatPrice(priceCents),
    unlockUrl: siteUrl('/app/races/' + race.id),
  });
}

/**
 * POST /api/public/message  (multipart/form-data)
 *
 * Modele « le coureur paie » : le proche ne paie jamais. On revalide TOUJOURS
 * ici, jamais confiance au client :
 *   - 5 messages max par personne (anti-spam) ;
 *   - 15 messages offerts par course, puis 50 apres deblocage par le coureur ;
 *   - quand les 15 sont atteints, un e-mail part vers le coureur (pas de
 *     blocage brutal : il debloque et ca repart).
 */
export async function POST(request: Request) {
  const limit = checkRateLimit('message:' + clientIp(request), 12, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError('Requete invalide.', 400);
  }

  const claimToken = form.get('claim_token');
  if (!isValidClaimToken(claimToken)) return jsonError('Jeton invalide.', 400);

  const audio = form.get('audio');
  if (!(audio instanceof Blob)) return jsonError('Aucun fichier audio recu.', 400);
  if (audio.size === 0) return jsonError('Fichier audio vide.', 400);
  if (audio.size > MAX_AUDIO_BYTES) return jsonError('Message trop volumineux (2 Mo maximum).', 413);

  const mimeType = String(form.get('mime_type') ?? 'audio/webm').split(';')[0]?.trim() ?? '';
  if (!ALLOWED_MIME.has(mimeType)) return jsonError('Format audio non supporte.', 415);

  const durationMs = Number(form.get('duration_ms'));
  if (!Number.isFinite(durationMs) || durationMs < 500 || durationMs > 60_000) {
    return jsonError('Duree de message invalide.', 400);
  }

  const hasTime = form.has('trigger_at_s');
  const lat = Number(form.get('lat'));
  const lng = Number(form.get('lng'));
  const distanceM = Number(form.get('distance_m'));
  const triggerAtS = Number(form.get('trigger_at_s'));

  const supabase = createAdminClient();

  const { data: contributor } = await supabase
    .from('contributors')
    .select(
      'id, name, race_id, races!inner(id, name, user_id, status, mode, duration_s, messages_unlocked)',
    )
    .eq('claim_token', claimToken)
    .maybeSingle();

  if (!contributor) return jsonError('Jeton inconnu.', 404);

  const race = contributor.races as unknown as {
    id: string;
    name: string;
    user_id: string;
    status: string;
    mode: 'gpx' | 'time';
    duration_s: number | null;
    messages_unlocked: boolean;
  } | null;
  if (!race) return jsonError('Course introuvable.', 404);
  if (race.status === 'finished') return jsonError('Cette course est terminee.', 409);

  // Validation de la cible CONTRE le mode reel de la course.
  const isTimeMode = race.mode === 'time';
  if (isTimeMode) {
    if (!hasTime || !Number.isInteger(triggerAtS) || triggerAtS < 0) {
      return jsonError('Instant de declenchement invalide.', 400);
    }
    if (race.duration_s !== null && triggerAtS > race.duration_s) {
      return jsonError('Cet instant depasse la duree prevue de la course.', 400);
    }
  } else {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return jsonError('Position invalide.', 400);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return jsonError('Position invalide.', 400);
    if (!Number.isFinite(distanceM) || distanceM < 0) {
      return jsonError('Point de parcours invalide.', 400);
    }
  }

  const settings = await getAppSettings();

  // ------------------------------------------------------------- plafonds ----
  const state = await fetchContributorPostState(
    supabase,
    contributor.id,
    race.id,
    settings,
    race.messages_unlocked,
  );

  if (state.personalRemaining <= 0) {
    return jsonError(
      `Tu as deja laisse ${state.personalCap} messages sur cette course. Laisse la place aux autres !`,
      409,
      { state },
    );
  }

  if (state.raceRemaining <= 0) {
    if (state.unlocked) {
      return jsonError(
        `Cette course a atteint son maximum de ${state.raceCap} messages.`,
        409,
        { state },
      );
    }
    // Plafond offert atteint : on (re)previent le coureur, sans bloquer sechement.
    await notifyRunnerCapReached(
      supabase,
      race,
      settings.free_message_cap,
      settings.unlocked_message_cap,
      settings.unlock_price_cents,
    );
    return jsonError(
      'Le coureur a atteint ses messages offerts. On vient de le prevenir pour qu il debloque plus de place : reessaie dans un moment.',
      402,
      { state, code: 'race_free_full' },
    );
  }

  // --------------------------------------------- collision position/instant --
  if (isTimeMode) {
    const { data: neighbours } = await supabase
      .from('audio_messages')
      .select('trigger_at_s')
      .eq('race_id', race.id)
      .gte('trigger_at_s', triggerAtS - MIN_GAP_S)
      .lte('trigger_at_s', triggerAtS + MIN_GAP_S)
      .limit(1);
    if (neighbours && neighbours.length > 0) {
      return jsonError(
        'Un message est deja place a ce moment. Choisis un autre instant de la course.',
        409,
        { state },
      );
    }
  } else {
    const { data: neighbours } = await supabase
      .from('audio_messages')
      .select('distance_m')
      .eq('race_id', race.id)
      .gte('distance_m', distanceM - MIN_GAP_M)
      .lte('distance_m', distanceM + MIN_GAP_M)
      .limit(1);
    if (neighbours && neighbours.length > 0) {
      return jsonError(
        'Un message est deja place a cet endroit. Choisis un autre point du parcours.',
        409,
        { state },
      );
    }
  }

  // ----------------------------------------------------------------- upload --
  const extension = mimeType === 'audio/mp4' ? 'm4a' : mimeType === 'audio/mpeg' ? 'mp3' : 'webm';
  const objectPath = race.id + '/' + crypto.randomUUID() + '.' + extension;

  const { error: uploadError } = await supabase.storage
    .from('voice-messages')
    .upload(objectPath, audio, { contentType: mimeType, upsert: false });

  if (uploadError) {
    return jsonDbError(
      'POST /api/public/message (upload storage)',
      uploadError as { message?: string },
      'Envoi du fichier impossible.',
    );
  }

  // -------------------------------------------------------------- insertion --
  const target = isTimeMode
    ? { lat: null, lng: null, distance_m: 0, trigger_at_s: triggerAtS }
    : { lat, lng, distance_m: Math.round(distanceM), trigger_at_s: null };

  const { error: insertError } = await supabase.from('audio_messages').insert({
    race_id: race.id,
    contributor_id: contributor.id,
    author_name: contributor.name,
    audio_path: objectPath,
    mime_type: mimeType,
    duration_ms: Math.round(durationMs),
    trigger_radius_m: TRIGGER_RADIUS_M,
    is_billable: false,
    ...target,
  });

  if (insertError) {
    await supabase.storage.from('voice-messages').remove([objectPath]);
    return jsonDbError(
      'POST /api/public/message (insert audio_messages)',
      insertError,
      'Enregistrement impossible.',
    );
  }

  // Ce message vient-il d'atteindre le plafond offert ? Si oui, on previent le
  // coureur (une seule fois, garde atomique cote notifyRunnerCapReached).
  const newRaceUsed = state.raceUsed + 1;
  if (!race.messages_unlocked && newRaceUsed >= settings.free_message_cap) {
    await notifyRunnerCapReached(
      supabase,
      race,
      settings.free_message_cap,
      settings.unlocked_message_cap,
      settings.unlock_price_cents,
    );
  }

  const refreshed = await fetchContributorPostState(
    supabase,
    contributor.id,
    race.id,
    settings,
    race.messages_unlocked,
  );
  return NextResponse.json({ ok: true, state: refreshed });
}
