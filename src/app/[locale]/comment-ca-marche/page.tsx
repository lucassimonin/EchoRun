import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ContentPage } from '@/components/marketing/ContentPage';
import { FaqJsonLd, type FaqEntry } from '@/components/StructuredData';
import { ButtonLink } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'HowItWorks' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: '/comment-ca-marche',
      languages: {
        fr: '/comment-ca-marche',
        en: '/en/comment-ca-marche',
        'x-default': '/comment-ca-marche',
      },
    },
  };
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('HowItWorks');

  /**
   * La FAQ est une donnée, pas du JSX.
   *
   * Elle alimente à la fois le rendu de la page et le balisage FAQPage. Une
   * FAQPage qui décrit des questions absentes de la page visible est un motif de
   * rejet chez Google • et c'est exactement ce qui finit par arriver quand les
   * deux sont saisies séparément.
   */
  const FAQ: readonly FaqEntry[] = [
    { question: t('faq.q0'), answer: t('faq.a0') },
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
    { question: t('faq.q5'), answer: t('faq.a5') },
    { question: t('faq.q6'), answer: t('faq.a6') },
  ];

  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const code = (chunks: React.ReactNode) => <code>{chunks}</code>;

  return (
    <ContentPage
      eyebrow={t('eyebrow')}
      title={t('title')}
      lede={t('lede')}
      aside={
        <Surface className="p-6">
          <p className="text-[14px] font-semibold text-charcoal">{t('aside.title')}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-charcoal-muted">
            {t('aside.body')}
          </p>
          <ButtonLink href="/login" size="sm" className="mt-5" fullWidth>
            {t('aside.cta')}
          </ButtonLink>
        </Surface>
      }
    >
      <FaqJsonLd entries={FAQ} />

      <h2>{t('s1.title')}</h2>
      <p>{t('s1.intro')}</p>
      <ul>
        <li>{t.rich('s1.gpx', { strong, code })}</li>
        <li>{t.rich('s1.draw', { strong, code })}</li>
        <li>{t.rich('s1.time', { strong, code })}</li>
      </ul>
      <p>{t.rich('s1.simplify', { strong, code })}</p>

      <h2>{t('s2.title')}</h2>
      <p>{t.rich('s2.p1', { strong, code })}</p>
      <p>{t('s2.p2')}</p>

      <h2>{t('s3.title')}</h2>
      <p>{t.rich('s3.p1', { strong, code })}</p>
      <p>{t('s3.p2')}</p>
      <p>{t.rich('s3.p3', { strong, code })}</p>

      <h3>{t('s3.recordingTitle')}</h3>
      <ul>
        <li>{t('s3.rec1')}</li>
        <li>{t('s3.rec2')}</li>
        <li>{t('s3.rec3')}</li>
      </ul>

      <h2>{t('s4.title')}</h2>
      <p>{t.rich('s4.p1', { strong, code })}</p>
      <p>{t('s4.p2')}</p>

      <h2>{t('s5.title')}</h2>
      <p>{t.rich('s5.p1', { strong, code })}</p>
      <p>{t('s5.p2')}</p>
      <ul>
        <li>{t.rich('s5.route', { strong, code })}</li>
        <li>{t.rich('s5.chrono', { strong, code })}</li>
        <li>{t.rich('s5.announce', { strong, code })}</li>
        <li>{t.rich('s5.order', { strong, code })}</li>
        <li>{t('s5.lost')}</li>
      </ul>

      <h3>{t('s5.screenTitle')}</h3>
      <p>{t.rich('s5.screen1', { strong, code })}</p>
      <p>{t('s5.screen2')}</p>
      <p>{t.rich('s5.screen3', { strong, code })}</p>

      <h2>{t('s6.title')}</h2>
      <p>{t('s6.p1')}</p>

      <h2>{t('faqTitle')}</h2>

      {FAQ.map((entry) => (
        <div key={entry.question}>
          <h3>{entry.question}</h3>
          <p>{entry.answer}</p>
        </div>
      ))}

      <p className="mt-10">
        {t.rich('privacyLink', {
          strong,
          code,
          link: (chunks) => <Link href="/confidentialite">{chunks}</Link>,
        })}
      </p>
    </ContentPage>
  );
}
