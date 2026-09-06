import { createAdminClient } from '@/lib/supabase/admin';
import type { AppSettings } from '@/types';

export const DEFAULT_SETTINGS: AppSettings = {
  ads_enabled: false,
  adsense_client_id: null,
  adsense_slot_landing: null,
  adsense_slot_contributor: null,
  adsense_slot_finish: null,
  extra_message_price_cents: 99,
  extra_message_credits: 1,
  free_message_cap: 15,
  unlocked_message_cap: 50,
  per_contributor_cap: 5,
  unlock_price_cents: 199,
};

/**
 * Lit la configuration editee dans le back-office.
 *
 * Appele depuis des Server Components : la config AdSense est injectee au
 * rendu, donc aucun appel reseau cote client et aucune latence avant
 * l'affichage du bloc publicitaire (bon pour le CLS et pour AdSense).
 *
 * `revalidate` cote page suffit a mettre en cache : on evite volontairement
 * `unstable_cache` pour que la modification dans le BO soit visible tout de suite.
 */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select(
        'ads_enabled, adsense_client_id, adsense_slot_landing, adsense_slot_contributor, adsense_slot_finish, extra_message_price_cents, extra_message_credits, free_message_cap, unlocked_message_cap, per_contributor_cap, unlock_price_cents',
      )
      .eq('id', 1)
      .single();

    if (error || !data) return DEFAULT_SETTINGS;
    return data as AppSettings;
  } catch {
    // Pas de config en base (premier boot, env incomplet) : on degrade sans pub.
    return DEFAULT_SETTINGS;
  }
}

/** Une pub ne s'affiche que si elle est activee ET completement configuree. */
export function adSlotFor(
  settings: AppSettings,
  placement: 'landing' | 'contributor' | 'finish',
): { clientId: string; slotId: string } | null {
  if (!settings.ads_enabled || !settings.adsense_client_id) return null;

  const slotId =
    placement === 'landing'
      ? settings.adsense_slot_landing
      : placement === 'contributor'
        ? settings.adsense_slot_contributor
        : settings.adsense_slot_finish;

  if (!slotId) return null;
  return { clientId: settings.adsense_client_id, slotId };
}
