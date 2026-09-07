import { NextResponse } from 'next/server';
import { jsonDbError, jsonError, tooManyRequests } from '@/lib/api';
import { GpxParseError, parseGpx } from '@/lib/geo/gpx';
import { computeBounds, simplify, withCumulativeDistance } from '@/lib/geo/geometry';
import { getOrCreateProfile } from '@/lib/profile';
import { checkRateLimit } from '@/lib/rate-limit';
import { createServerSupabase } from '@/lib/supabase/server';
import { generateShareSlug, sanitizeName } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_GPX_BYTES = 10 * 1024 * 1024;

/**
 * POST /api/races  (multipart/form-data)
 *
 * Deux modes de création :
 *   - GPX  : champ `gpx` (fichier). Le parsing se fait ici et pas dans le
 *            navigateur • un fichier de 40 000 points ferait ramer un téléphone,
 *            et on ne veut pas d'un tracé simplifié côté client pour le
 *            déclenchement en course.
 *   - temps: champ `mode=time` + `duration_s`. Pas de fichier, la course est
 *            rythmée par un chronomètre.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Connexion requise.', 401);

  const limit = checkRateLimit('race:' + user.id, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  // `races.user_id` référence `profiles`, pas `auth.users` : sans profil,
  // l'insertion échouerait en 23503. Les routes d'API ne traversent pas le
  // layout, on garantit donc le profil ici aussi.
  await getOrCreateProfile(supabase, user);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError('Requete invalide.', 400);
  }

  const mode = String(form.get('mode') ?? 'gpx') === 'time' ? 'time' : 'gpx';

  const rawDate = String(form.get('race_date') ?? '').trim();
  const raceDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
  const providedName = sanitizeName(String(form.get('name') ?? ''));

  // Valeurs à insérer, remplies selon le mode.
  let insertPayload: Record<string, unknown>;
  let stats: { mode: 'gpx' | 'time'; points?: number; rawPoints?: number; distanceM?: number; durationS?: number };

  if (mode === 'time') {
    // -------------------------------------------------------- mode temps ---
    const durationS = Number(form.get('duration_s'));
    if (!Number.isInteger(durationS) || durationS < 300 || durationS > 86_400) {
      return jsonError('Durée invalide : indique entre 5 minutes et 24 heures.', 400);
    }
    const name = providedName.length >= 2 ? providedName : 'Ma course';

    insertPayload = {
      user_id: user.id,
      name: name.slice(0, 120),
      race_date: raceDate,
      status: 'open',
      mode: 'time',
      duration_s: durationS,
      // Pas de tracé : les colonnes GPX gardent leurs valeurs par défaut.
    };
    stats = { mode: 'time', durationS };
  } else if (form.get('source') === 'draw') {
    // ------------------------------------------------ mode GPX : dessiné ----
    // Le client envoie un tracé déjà calé sur les routes (points [lat,lng]).
    // On lui fait confiance sur la géométrie • c'est la course du coureur, RLS
    // garantit qu'il en est propriétaire • mais on borne et on recalcule
    // nous-mêmes distance cumulée et bounds côté serveur.
    let raw: unknown;
    try {
      raw = JSON.parse(String(form.get('points') ?? '[]'));
    } catch {
      return jsonError('Tracé dessiné illisible.', 400);
    }

    if (!Array.isArray(raw) || raw.length < 2) {
      return jsonError('Dessine un parcours d’au moins deux points.', 400);
    }
    if (raw.length > 20_000) {
      return jsonError('Tracé trop volumineux.', 413);
    }

    const clean: [number, number][] = [];
    for (const entry of raw) {
      if (!Array.isArray(entry) || entry.length !== 2) continue;
      const [lat, lng] = entry;
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
      clean.push([lat, lng]);
    }
    if (clean.length < 2) return jsonError('Tracé dessiné invalide.', 400);

    // Simplification légère : un tracé routé peut être dense, on l'allège comme
    // à l'import GPX pour rester fluide sur mobile.
    const simplified = clean.length > 1500 ? simplify(clean, 0.00008) : clean;
    const track = withCumulativeDistance(simplified);
    const last = track[track.length - 1];
    const distanceM = last ? last[2] : 0;

    const name = providedName.length >= 2 ? providedName : 'Mon parcours';
    insertPayload = {
      user_id: user.id,
      name: name.slice(0, 120),
      race_date: raceDate,
      status: 'open',
      mode: 'gpx',
      track,
      distance_m: distanceM,
      bounds: computeBounds(track),
    };
    stats = { mode: 'gpx', points: track.length, distanceM };
  } else {
    // --------------------------------------------------- mode GPX : fichier -
    const file = form.get('gpx');
    if (!(file instanceof Blob)) return jsonError('Fichier GPX manquant.', 400);
    if (file.size === 0) return jsonError('Fichier GPX vide.', 400);
    if (file.size > MAX_GPX_BYTES) return jsonError('Fichier GPX trop volumineux (10 Mo max).', 413);

    const xml = await file.text();
    let parsed;
    try {
      parsed = parseGpx(xml);
    } catch (error) {
      return jsonError(
        error instanceof GpxParseError ? error.message : 'Fichier GPX illisible.',
        422,
      );
    }

    const name = providedName.length >= 2 ? providedName : (parsed.name ?? 'Ma course');
    insertPayload = {
      user_id: user.id,
      name: name.slice(0, 120),
      race_date: raceDate,
      status: 'open',
      mode: 'gpx',
      track: parsed.track,
      distance_m: parsed.distanceM,
      bounds: parsed.bounds,
    };
    stats = {
      mode: 'gpx',
      points: parsed.track.length,
      rawPoints: parsed.rawPointCount,
      distanceM: parsed.distanceM,
    };
  }

  // Collision de slug quasi impossible (32^12) mais on retente une fois.
  let lastError: { code?: string; message?: string } | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from('races')
      .insert({ ...insertPayload, share_slug: generateShareSlug() })
      .select('id, share_slug')
      .single();

    if (!error && data) {
      return NextResponse.json({ race: data, stats });
    }

    lastError = error;
    if (error?.code !== '23505') break;
  }

  return jsonDbError(
    'POST /api/races (insert races)',
    lastError,
    'Creation de la course impossible.',
  );
}
