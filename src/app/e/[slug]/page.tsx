import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContributorFlow } from './ContributorFlow';
import { Wordmark } from '@/components/marketing/Wordmark';
import { adSlotFor, getAppSettings } from '@/lib/settings';
import { loadPublicRace } from './load-public-race';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Page publique de dépôt de vocal.
 *
 * `noindex` : un lien de partage ne doit jamais finir dans Google.
 * C'est aussi pour ça que la page est rendue dynamiquement, sans cache.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const race = await loadPublicRace(slug);

  if (!race) return { title: 'Course introuvable', robots: { index: false, follow: false } };

  return {
    title: 'Un message pour ' + race.runner_name,
    description:
      'Dépose un message vocal sur le parcours de ' +
      race.runner_name +
      '. Il l’entendra pendant sa course, au kilomètre que tu choisis.',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function ContributorPage({ params }: PageProps) {
  const { slug } = await params;
  const [race, settings] = await Promise.all([loadPublicRace(slug), getAppSettings()]);

  if (!race) notFound();

  const ad = adSlotFor(settings, 'contributor');
  const closed = race.status === 'finished';

  return (
    <div className="min-h-dvh bg-bone">
      <header className="border-b border-charcoal/[0.06] bg-bone/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <Link href="/" aria-label="EchoRun">
            <Wordmark />
          </Link>
          <span className="text-[12px] text-charcoal-faint">Dépôt de message vocal</span>
        </div>
      </header>

      <ContributorFlow
        race={race}
        closed={closed}
        adClientId={ad?.clientId ?? null}
        adSlotId={ad?.slotId ?? null}
      />

      <footer className="mx-auto max-w-2xl px-5 pb-12 pt-4 text-center">
        <p className="text-[11.5px] leading-relaxed text-charcoal-faint">
          En envoyant un message, tu acceptes nos{' '}
          <Link href="/mentions-legales" className="underline underline-offset-2">
            conditions d’utilisation
          </Link>{' '}
          et notre{' '}
          <Link href="/confidentialite" className="underline underline-offset-2">
            politique de confidentialité
          </Link>
          . Ton vocal n’est audible que par {race.runner_name}.
        </p>
      </footer>
    </div>
  );
}
