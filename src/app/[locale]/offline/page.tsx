import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/Button';
import { Wordmark } from '@/components/marketing/Wordmark';

export async function generateMetadata() {
  const t = await getTranslations('Offline');
  return { title: t('metaTitle'), robots: { index: false } };
}

/** Page servie par le service worker quand une navigation échoue sans réseau. */
export default async function OfflinePage() {
  const t = await getTranslations('Offline');
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <div className="flex justify-center">
          <Wordmark />
        </div>
        <h1 className="mt-8 text-[26px] font-bold uppercase tracking-[-0.01em] text-charcoal">
          {t('title')}
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-charcoal-muted">
          {t('body')}
        </p>
        <ButtonLink href="/app" size="md" className="mt-8">
          {t('cta')}
        </ButtonLink>
      </div>
    </main>
  );
}
