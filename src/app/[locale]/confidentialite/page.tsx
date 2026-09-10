import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ManageCookiesButton } from '@/components/consent/ManageCookiesButton';
import { ContentPage } from '@/components/marketing/ContentPage';
import { Surface } from '@/components/ui/Surface';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Privacy' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: '/confidentialite',
      languages: {
        fr: '/confidentialite',
        en: '/en/confidentialite',
        'x-default': '/confidentialite',
      },
    },
  };
}

const CONTACT = process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? 'bonjour@echo-run.app';
const ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? 'EchoRun';

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Privacy');

  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const em = (chunks: React.ReactNode) => <em>{chunks}</em>;
  const mail = (chunks: React.ReactNode) => <a href={'mailto:' + CONTACT}>{chunks}</a>;

  return (
    <ContentPage
      eyebrow={t('eyebrow')}
      title={t('title')}
      lede={t('lede')}
      updatedAt={t('updatedAt')}
      aside={
        <Surface className="p-6">
          <p className="text-[13px] font-semibold text-charcoal">{t('aside.title')}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-charcoal-muted">
            {t('aside.body')}
          </p>
        </Surface>
      }
    >
      <h2>{t('s1.title')}</h2>
      <p>
        {t.rich('s1.body', {
          strong,
          mail,
          entity: ENTITY,
          contact: CONTACT,
          link: (chunks) => <Link href="/mentions-legales">{chunks}</Link>,
        })}
      </p>

      <h2>{t('s2.title')}</h2>
      <p>{t.rich('s2.p1', { strong })}</p>
      <p>{t('s2.p2')}</p>
      <p>{t.rich('s2.p3', { strong })}</p>

      <h2>{t('s3.title')}</h2>

      <h3>{t('s3.runnerTitle')}</h3>
      <ul>
        <li>{t.rich('s3.runner1', { strong })}</li>
        <li>{t.rich('s3.runner2', { strong })}</li>
      </ul>

      <h3>{t('s3.racesTitle')}</h3>
      <ul>
        <li>{t.rich('s3.races1', { strong })}</li>
        <li>{t.rich('s3.races2', { strong })}</li>
      </ul>

      <h3>{t('s3.lovedTitle')}</h3>
      <ul>
        <li>{t.rich('s3.loved1', { strong })}</li>
        <li>{t.rich('s3.loved2', { strong })}</li>
        <li>{t.rich('s3.loved3', { strong })}</li>
        <li>{t.rich('s3.loved4', { strong })}</li>
      </ul>

      <h3>{t('s3.paymentsTitle')}</h3>
      <p>{t.rich('s3.payments', { strong })}</p>

      <h2>{t('s4.title')}</h2>
      <p>{t.rich('s4.p1', { strong })}</p>
      <ul>
        <li>{t('s4.li1')}</li>
        <li>{t('s4.li2')}</li>
        <li>{t('s4.li3')}</li>
      </ul>
      <p>{t('s4.p2')}</p>

      <h2>{t('s5.title')}</h2>
      <ul>
        <li>{t.rich('s5.li1', { strong })}</li>
        <li>{t.rich('s5.li2', { strong })}</li>
        <li>{t.rich('s5.li3', { strong })}</li>
        <li>{t.rich('s5.li4', { strong })}</li>
        <li>{t.rich('s5.li5', { strong })}</li>
      </ul>

      <h2>{t('s6.title')}</h2>
      <ul>
        <li>{t.rich('s6.li1', { strong })}</li>
        <li>{t.rich('s6.li2', { strong })}</li>
        <li>{t.rich('s6.li3', { strong })}</li>
        <li>{t.rich('s6.li4', { strong })}</li>
      </ul>

      <h2>{t('s7.title')}</h2>
      <p>{t('s7.intro')}</p>

      <h3>{t('s7.necessaryTitle')}</h3>
      <p>{t('s7.necessaryIntro')}</p>
      <ul>
        <li>{t.rich('s7.nec1', { strong })}</li>
        <li>{t.rich('s7.nec2', { strong })}</li>
        <li>{t.rich('s7.nec3', { strong })}</li>
        <li>{t.rich('s7.nec4', { strong })}</li>
      </ul>

      <h3>{t('s7.adsTitle')}</h3>
      <p>{t.rich('s7.ads1', { strong })}</p>
      <p>{t.rich('s7.ads2', { strong })}</p>
      <p>{t('s7.ads3')}</p>

      <h3>{t('s7.revisitTitle')}</h3>
      <p>{t('s7.revisit1')}</p>
      <p>
        <ManageCookiesButton
          label={t('s7.manageLabel')}
          className="text-matcha-500 underline underline-offset-2"
        />
      </p>
      <p>
        {t.rich('s7.revisit2', {
          adssettings: (chunks) => (
            <a href="https://adssettings.google.com" rel="nofollow noopener" target="_blank">
              {chunks}
            </a>
          ),
        })}
      </p>
      <p>{t('s7.stats')}</p>

      <h2>{t('s8.title')}</h2>
      <p>{t('s8.p1')}</p>
      <p>
        {t.rich('s8.p2', {
          mail,
          contact: CONTACT,
          cnil: (chunks) => (
            <a href="https://www.cnil.fr" rel="noopener" target="_blank">
              {chunks}
            </a>
          ),
        })}
      </p>

      <h2>{t('s9.title')}</h2>
      <ul>
        <li>{t('s9.li1')}</li>
        <li>{t.rich('s9.li2', { em })}</li>
        <li>{t('s9.li3')}</li>
        <li>{t('s9.li4')}</li>
      </ul>

      <h2>{t('s10.title')}</h2>
      <p>{t('s10.body')}</p>

      <h2>{t('s11.title')}</h2>
      <p>{t('s11.body')}</p>
    </ContentPage>
  );
}
