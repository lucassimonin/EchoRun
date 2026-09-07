import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/marketing/Wordmark';
import { SignOutButton } from '@/components/SignOutButton';
import { getOrCreateProfile } from '@/lib/profile';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function RunnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/app');

  // Point de passage obligé de tout l'espace coureur : c'est ici qu'on
  // garantit l'existence du profil, une fois pour toutes.
  const profile = await getOrCreateProfile(supabase, user);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b-[3px] border-black bg-yellow pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/app" aria-label="Mes courses">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            {profile.is_admin ? (
              <Link
                href="/admin"
                className="hidden rounded-lg border-2 border-black bg-white px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.04em] text-black transition-colors hover:bg-neon sm:inline-flex"
              >
                Back-office
              </Link>
            ) : null}
            <span className="hidden max-w-[160px] truncate font-mono text-[12px] text-black/60 sm:block">
              {profile.display_name ?? user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
