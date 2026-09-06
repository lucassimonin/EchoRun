import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/site';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Echange le code du lien magique contre une session, puis redirige. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next');

  // On n'accepte qu'une redirection interne : pas d'open redirect.
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=lien-invalide', SITE_URL));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?error=lien-expire', SITE_URL));
  }

  return NextResponse.redirect(new URL(destination, SITE_URL));
}
