import { NextResponse } from 'next/server';
import { isValidClaimToken, isValidSlug, jsonDbError, jsonError, tooManyRequests } from '@/lib/api';
import { fetchContributorPostState } from '@/lib/quota';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { getAppSettings } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeName } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/public/contributor?claim_token=…
 * Relit l'etat d'un proche deja identifie (retour sur la page).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const claimToken = url.searchParams.get('claim_token');

  if (!isValidClaimToken(claimToken)) return jsonError('Jeton invalide.', 400);

  const supabase = createAdminClient();
  const { data: contributor } = await supabase
    .from('contributors')
    .select('id, name, race_id, races!inner(id, messages_unlocked)')
    .eq('claim_token', claimToken)
    .maybeSingle();

  if (!contributor) return jsonError('Jeton inconnu.', 404);

  const race = contributor.races as unknown as { id: string; messages_unlocked: boolean };
  const settings = await getAppSettings();
  const state = await fetchContributorPostState(
    supabase,
    contributor.id,
    race.id,
    settings,
    race.messages_unlocked,
  );

  return NextResponse.json({ contributor: { id: contributor.id, name: contributor.name }, state });
}

/**
 * POST /api/public/contributor  { slug, name }
 * Cree ou retrouve le proche (le prenom fait office d'identite, index unique
 * par course) et renvoie son jeton + son etat de publication.
 *
 * Le proche ne paie jamais : ce jeton n'ouvre que le droit de poster un message
 * et de relire son propre etat.
 */
export async function POST(request: Request) {
  const limit = checkRateLimit('contributor:' + clientIp(request), 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Corps de requete invalide.', 400);
  }

  const { slug, name } = (body ?? {}) as { slug?: unknown; name?: unknown };
  if (!isValidSlug(slug)) return jsonError('Lien de course invalide.', 400);

  const cleanName = sanitizeName(typeof name === 'string' ? name : '');
  if (cleanName.length < 2) return jsonError('Indique au moins deux caracteres.', 400);

  const supabase = createAdminClient();

  const { data: race } = await supabase
    .from('races')
    .select('id, status, messages_unlocked')
    .eq('share_slug', slug)
    .maybeSingle();

  if (!race) return jsonError('Course introuvable.', 404);
  if (race.status === 'finished') return jsonError('Cette course est terminee.', 409);
  if (race.status === 'draft') return jsonError('Cette course n est pas encore ouverte.', 409);

  const { data: existing } = await supabase
    .from('contributors')
    .select('id, name, claim_token')
    .eq('race_id', race.id)
    .ilike('name', cleanName)
    .maybeSingle();

  let contributor = existing;

  if (!contributor) {
    const { data: created, error } = await supabase
      .from('contributors')
      .insert({ race_id: race.id, name: cleanName })
      .select('id, name, claim_token')
      .single();

    if (error?.code === '23505') {
      const { data: retried } = await supabase
        .from('contributors')
        .select('id, name, claim_token')
        .eq('race_id', race.id)
        .ilike('name', cleanName)
        .maybeSingle();
      contributor = retried;
    } else if (error) {
      return jsonDbError(
        'POST /api/public/contributor (insert contributors)',
        error,
        'Impossible de t enregistrer pour cette course.',
      );
    } else {
      contributor = created;
    }
  }

  if (!contributor) return jsonError('Impossible de t enregistrer pour cette course.', 500);

  const settings = await getAppSettings();
  const state = await fetchContributorPostState(
    supabase,
    contributor.id,
    race.id,
    settings,
    race.messages_unlocked,
  );

  return NextResponse.json({
    contributor: { id: contributor.id, name: contributor.name, claimToken: contributor.claim_token },
    state,
  });
}
