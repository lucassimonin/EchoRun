import { NextResponse } from 'next/server';
import { jsonDbError, jsonError } from '@/lib/api';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLIENT_ID_RE = /^ca-pub-\d{10,20}$/;
const SLOT_RE = /^\d{6,20}$/;
const GTM_RE = /^GTM-[A-Z0-9]{4,12}$/;

/**
 * PUT /api/admin/settings
 *
 * L'autorisation repose sur la policy RLS `settings: ecriture admin uniquement`
 * (via la fonction `is_admin()`), pas sur un test applicatif : même en cas de
 * bug de routage, un non-admin ne peut rien écrire.
 */
export async function PUT(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Connexion requise.', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Requete invalide.', 400);
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_by: user.id };

  if (typeof input.ads_enabled === 'boolean') patch.ads_enabled = input.ads_enabled;

  const clientId = normalizeText(input.adsense_client_id);
  if (clientId !== undefined) {
    if (clientId !== null && !CLIENT_ID_RE.test(clientId)) {
      return jsonError('Identifiant AdSense invalide (format ca-pub-…).', 400);
    }
    patch.adsense_client_id = clientId;
  }

  for (const key of [
    'adsense_slot_landing',
    'adsense_slot_contributor',
    'adsense_slot_finish',
  ] as const) {
    const slot = normalizeText(input[key]);
    if (slot === undefined) continue;
    if (slot !== null && !SLOT_RE.test(slot)) {
      return jsonError('Identifiant de slot invalide (chiffres uniquement).', 400);
    }
    patch[key] = slot;
  }

  if (input.extra_message_price_cents !== undefined) {
    const price = Number(input.extra_message_price_cents);
    if (!Number.isInteger(price) || price < 50 || price > 2000) {
      return jsonError('Prix invalide (50 a 2000 centimes).', 400);
    }
    patch.extra_message_price_cents = price;
  }

  if (input.extra_message_credits !== undefined) {
    const credits = Number(input.extra_message_credits);
    if (!Number.isInteger(credits) || credits < 1 || credits > 50) {
      return jsonError('Nombre de credits invalide (1 a 50).', 400);
    }
    patch.extra_message_credits = credits;
  }

  // --- Modele « le coureur paie » : plafonds de messages + prix du deblocage
  const intField = (
    value: unknown,
    min: number,
    max: number,
  ): number | undefined | 'invalid' => {
    if (value === undefined) return undefined;
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) return 'invalid';
    return n;
  };

  const freeCap = intField(input.free_message_cap, 0, 500);
  if (freeCap === 'invalid') return jsonError('Plafond offert invalide (0 a 500).', 400);
  if (freeCap !== undefined) patch.free_message_cap = freeCap;

  const unlockedCap = intField(input.unlocked_message_cap, 0, 1000);
  if (unlockedCap === 'invalid') return jsonError('Plafond debloque invalide (0 a 1000).', 400);
  if (unlockedCap !== undefined) patch.unlocked_message_cap = unlockedCap;

  const perContributor = intField(input.per_contributor_cap, 1, 100);
  if (perContributor === 'invalid') return jsonError('Maximum par personne invalide (1 a 100).', 400);
  if (perContributor !== undefined) patch.per_contributor_cap = perContributor;

  const unlockPrice = intField(input.unlock_price_cents, 50, 5000);
  if (unlockPrice === 'invalid') return jsonError('Prix de deblocage invalide (50 a 5000 centimes).', 400);
  if (unlockPrice !== undefined) patch.unlock_price_cents = unlockPrice;

  const gtm = normalizeText(input.gtm_container_id);
  if (gtm !== undefined) {
    const value = gtm ? gtm.toUpperCase() : null;
    if (value !== null && !GTM_RE.test(value)) {
      return jsonError('Identifiant GTM invalide (format GTM-XXXXXXX).', 400);
    }
    patch.gtm_container_id = value;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .update(patch)
    .eq('id', 1)
    .select('id')
    .maybeSingle();

  if (error) {
    return jsonDbError('PUT /api/admin/settings', error, 'Enregistrement impossible.');
  }
  // Aucune ligne modifiee sans erreur SQL : RLS a filtre, l'utilisateur n'est pas admin.
  if (!data) return jsonError('Acces refuse.', 403);

  return NextResponse.json({ ok: true });
}

function normalizeText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
