import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

/**
 * Middleware combiné :
 *  1. next-intl gère la locale (préfixe /en, détection navigateur) sur les
 *     routes de page.
 *  2. Supabase rafraîchit la session à chaque navigation et protège /app et
 *     /admin — en tenant compte d'un éventuel préfixe de locale.
 *
 * Le contrôle `is_admin` reste dans le layout /admin : ici, première barrière.
 */
const handleI18n = createMiddleware(routing);

/** Sépare le préfixe de locale du reste du chemin. `/en/app` -> {en, /app}. */
function stripLocale(pathname: string): { locale: string; rest: string } {
  for (const locale of routing.locales) {
    if (pathname === '/' + locale) return { locale, rest: '/' };
    if (pathname.startsWith('/' + locale + '/')) {
      return { locale, rest: pathname.slice(('/' + locale).length) };
    }
  }
  return { locale: '', rest: pathname };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes non localisées : handlers d'API, callback auth, fichiers. Pas d'i18n.
  const skipI18n =
    pathname.startsWith('/api') || pathname.startsWith('/auth') || pathname.includes('.');

  const response = skipI18n ? NextResponse.next({ request }) : handleI18n(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          // On écrit sur la réponse existante (i18n) : la recréer perdrait ses
          // en-têtes de réécriture/redirection.
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { locale, rest } = stripLocale(pathname);
  const prefix = locale ? '/' + locale : '';
  const isPrivate = rest.startsWith('/app') || rest.startsWith('/admin');

  if (isPrivate && !user) {
    const url = request.nextUrl.clone();
    url.pathname = prefix + '/login';
    url.searchParams.set('next', rest);
    return NextResponse.redirect(url);
  }

  if (rest === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = prefix + '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Tout sauf les assets statiques, le service worker, les fichiers spéciaux
     * et le webhook Stripe (qui ne doit surtout pas être redirigé).
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icons|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|ads.txt|api/stripe).*)',
  ],
};
