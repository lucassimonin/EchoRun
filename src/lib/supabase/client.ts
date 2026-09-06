'use client';

import { createBrowserClient } from '@supabase/ssr';

/** Client Supabase cote navigateur, pour le coureur authentifie. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
