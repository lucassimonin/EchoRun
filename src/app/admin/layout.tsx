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
      <header className="sticky top-0 z-40 border-b-[3px] border-black bg-yellow pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/app" aria-label="EchoRun">
              <Wordmark compact />
            </Link>
            <span className="font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-black">
              Back-office
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/app"
              className="rounded-lg border-2 border-black bg-white px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.04em] text-black transition-colors hover:bg-neon"
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
