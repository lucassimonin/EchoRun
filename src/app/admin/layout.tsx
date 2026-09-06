import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SignOutButton } from '@/components/SignOutButton';
import { Wordmark } from '@/components/marketing/Wordmark';
import { getOrCreateProfile } from '@/lib/profile';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Barrière d'accès au back-office.
 *
 * Le middleware bloque déjà les visiteurs non connectés ; ici on vérifie
 * `is_admin`. On renvoie un 404 plutôt qu'un 403 : inutile de révéler
 * l'existence d'une console d'administration.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/admin');

  const profile = await getOrCreateProfile(supabase, user);

  if (!profile.is_admin) notFound();

  return (
    <div className="min-h-dvh bg-bone">
      <header className="sticky top-0 z-40 border-b border-charcoal/[0.06] bg-bone/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/app" aria-label="EchoRun">
              <Wordmark compact />
            </Link>
            <span className="text-[14px] font-medium tracking-[-0.015em] text-charcoal">
              Back-office
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/app"
              className="rounded-full px-3.5 py-2 text-[13px] text-charcoal-muted transition-colors hover:bg-charcoal/[0.04] hover:text-charcoal"
            >
              Mes courses
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
