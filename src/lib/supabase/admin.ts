import { createClient } from '@supabase/supabase-js';

/**
 * Client `service_role` — CONTOURNE RLS.
 *
 * Usage strictement limite aux Route Handlers qui servent le tunnel "proche"
 * (anonyme) et au webhook Stripe. Ne jamais importer depuis un composant
 * client : le module leverait une erreur au build si la variable manquait, et
 * la cle ne doit jamais atterrir dans un bundle navigateur.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Configuration Supabase incomplete : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.',
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'x-echorun-context': 'service-role' } },
  });
}
