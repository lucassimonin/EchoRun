import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContributorFlow } from './ContributorFlow';
import { Wordmark } from '@/components/marketing/Wordmark';
import { adSlotFor, getAppSettings } from '@/lib/settings';
import { loadPublicRace } from './load-public-race';
import { Link } from '@/i18n/navigation';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/**
 * Page publique de dépôt de vocal.
 *
 * `noindex` : un lien de partage ne doit jamais finir dans Google.
 * C'est aussi pour ça que la page est rendue dynamiquement, sans cache.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'PublicRacePage' });
  const race = await loadPublicRace(slug, locale);

  if (!race) return { title: t('metaNotFound'), robots: { index: false, follow: false } };

  return {
    title: t('metaTitle', { name: race.runner_name }),
    description: t('metaDescription', { name: race.runner_name }),
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function ContributorPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('PublicRacePage');
  const [race, settings] = await Promise.all([
    loadPublicRace(slug, locale),
    getAppSettings(),
  ]);

  if (!race) notFound();

  const ad = adSlotFor(settings, 'contributor');
  const closed = race.status === 'finished';

  return (
    <div className="min-h-dvh bg-bone">
      <header className="border-b-[3px] border-black bg-yellow pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <Link href="/" aria-label="EchoRun">
            <Wordmark />
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-black/55">{t('headerTag')}</span>
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
          {t.rich('footer', {
            name: race.runner_name,
            terms: (c) => (
              <Link href="/mentions-legales" className="underline underline-offset-2">
                {c}
              </Link>
            ),
            privacy: (c) => (
              <Link href="/confidentialite" className="underline underline-offset-2">
                {c}
              </Link>
            ),
          })}
        </p>
      </footer>
    </div>
  );
}
