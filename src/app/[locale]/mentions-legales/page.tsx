import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ContentPage } from '@/components/marketing/ContentPage';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LegalNotice' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: '/mentions-legales',
      languages: {
        fr: '/mentions-legales',
        en: '/en/mentions-legales',
        'x-default': '/mentions-legales',
      },
    },
  };
}

const CONTACT = process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? 'bonjour@echo-run.app';
const ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? 'EchoRun';

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('LegalNotice');

  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const br = () => <br />;
  const mail = (chunks: React.ReactNode) => <a href={'mailto:' + CONTACT}>{chunks}</a>;

  return (
    <ContentPage
      eyebrow={t('eyebrow')}
      title={t('title')}
      lede={t('lede')}
      updatedAt={t('updatedAt')}
    >
      <h2>{t('editor.title')}</h2>
      <p>
        {/* TODO avant mise en production : compléter avec les mentions obligatoires. */}
        {t.rich('editor.block', { strong, br, mail, entity: ENTITY, contact: CONTACT })}
      </p>

      <h2>{t('hosting.title')}</h2>
      <p>{t.rich('hosting.body', { strong, br })}</p>

      <h2>{t('cgu.title')}</h2>

      <h3>{t('s1.title')}</h3>
      <p>{t('s1.body')}</p>

      <h3>{t('s2.title')}</h3>
      <p>{t('s2.body')}</p>

      <h3>{t('s3.title')}</h3>
      <p>{t('s3.body')}</p>
      <p>{t.rich('s3.retract', { strong })}</p>

      <h3>{t('s4.title')}</h3>
      <p>{t('s4.p1')}</p>
      <p>{t('s4.p2')}</p>

      <h3>{t('s5.title')}</h3>
      <p>{t('s5.body')}</p>

      <h3>{t('s6.title')}</h3>
      <p>{t('s6.body')}</p>

      <h3>{t('s7.title')}</h3>
      <p>{t('s7.p1')}</p>
      <p>{t('s7.p2')}</p>

      <h3>{t('s8.title')}</h3>
      <p>{t('s8.body')}</p>

      <h3>{t('s9.title')}</h3>
      <p>
        {t.rich('s9.body', {
          link: (chunks) => <Link href="/confidentialite">{chunks}</Link>,
        })}
      </p>

      <h3>{t('s10.title')}</h3>
      <p>{t('s10.body')}</p>

      <h2>{t('access.title')}</h2>
      <p>{t.rich('access.body', { mail, contact: CONTACT })}</p>
    </ContentPage>
  );
}
