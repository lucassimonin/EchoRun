import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LoginForm } from './LoginForm';
import { SiteHeader } from '@/components/marketing/SiteHeader';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LoginPage' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false },
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const t = await getTranslations('LoginPage');

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <div className="grid flex-1 place-items-center px-5 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-center text-[26px] font-semibold tracking-[-0.03em] text-charcoal">
            {t('title')}
          </h1>
          <p className="mt-3 text-center text-[14px] leading-relaxed text-charcoal-muted">
            {t('subtitle')}
          </p>

          <div className="mt-8">
            <LoginForm next={typeof next === 'string' ? next : undefined} />
          </div>

          <p className="mt-8 text-center text-[11.5px] leading-relaxed text-charcoal-faint">
            {t.rich('terms', {
              terms: (chunks) => (
                <Link href="/mentions-legales" className="underline underline-offset-2">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/confidentialite" className="underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
