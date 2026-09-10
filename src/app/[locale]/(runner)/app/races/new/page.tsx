import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { NewRaceForm } from './NewRaceForm';
import { Eyebrow } from '@/components/ui/Surface';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'NewRacePage' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export default async function NewRacePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('NewRacePage');

  return (
    <main className="mx-auto max-w-xl px-5 py-12 sm:px-8">
      <Link
        href="/app"
        className="font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-black/60 transition-colors hover:text-black"
      >
        ← {t('back')}
      </Link>

      <div className="mt-6">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="mt-3 text-title uppercase text-charcoal">{t('title')}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-charcoal-muted">
          {t('body')}
        </p>
      </div>

      <div className="mt-8">
        <NewRaceForm />
      </div>
    </main>
  );
}
