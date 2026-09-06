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
      <header className="sticky top-0 z-40 border-b border-charcoal/[0.06] bg-bone/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/app" aria-label="Mes courses">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
            {profile.is_admin ? (
              <Link
                href="/admin"
                className="rounded-full px-3.5 py-2 text-[13px] text-charcoal-muted transition-colors hover:bg-charcoal/[0.04] hover:text-charcoal"
              >
                Back-office
              </Link>
            ) : null}
            <span className="hidden px-3 text-[13px] text-charcoal-faint sm:block">
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
