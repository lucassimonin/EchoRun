import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdSenseUnit } from '@/components/ads/AdSenseUnit';
import { AppJsonLd, HowToJsonLd, SiteJsonLd } from '@/components/StructuredData';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { ButtonLink } from '@/components/ui/Button';
import { adSlotFor, getAppSettings } from '@/lib/settings';
import { formatPrice } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Landing' });
  return {
    title: t('metaTitle'),
    alternates: {
      canonical: '/',
      languages: { fr: '/', en: '/en', 'x-default': '/' },
    },
  };
}

export const revalidate = 300;

const CREATION_MODES = ['gpx', 'draw', 'time'] as const;
const STEPS = ['create', 'share', 'dayOf'] as const;
const USE_CASES = ['marathon', 'trail', 'tenK', 'surprise'] as const;
const BENEFITS = ['noApp', 'noNetwork', 'nothingToTouch', 'youKeep'] as const;
const TESTIMONIALS = ['karim', 'lea', 'sophie'] as const;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Landing');
  const settings = await getAppSettings();
  const ad = adSlotFor(settings, 'landing');
  const price = formatPrice(settings.unlock_price_cents);

  return (
    <>
      <SiteJsonLd />
      <AppJsonLd extraMessagePriceCents={settings.unlock_price_cents} />
      <HowToJsonLd />

      <SiteHeader />

      <main>
        {/* ------------------------------------------------------------- hero */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-xl animate-rise">
            <span className="inline-flex items-center gap-2 rounded-md border-[3px] border-black bg-neon px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-black shadow-[3px_3px_0_0_#000]">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-black/50 animate-pulse-ring" />
                <span className="relative inline-flex size-2.5 rounded-full bg-black" />
              </span>
              {t('badge')}
            </span>

            <h1 className="mt-6 text-[clamp(2.5rem,6vw,4.25rem)] font-bold uppercase leading-[0.9] tracking-[-0.02em] text-black">
              {t('heroTitle1')}
              <br />
              {t('heroTitle2')}
              <br />
              <span className="bg-orange px-2 text-white">
                {t('heroTitle3')}
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lede font-medium text-black">
              {t('heroBody')}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/login" size="lg">
                {t('ctaCreate')}
              </ButtonLink>
              <ButtonLink href="/comment-ca-marche" size="lg" variant="secondary">
                {t('ctaHow')}
              </ButtonLink>
            </div>

            <p className="mt-5 font-mono text-[12px] font-bold uppercase tracking-[0.06em] text-black/70">
              {t('heroNote', { cap: settings.free_message_cap })}
            </p>
            </div>
            <div className="animate-rise">
              <TriggerPreview
                badge={t('preview.badge')}
                live={t('preview.live')}
                messageFrom={t('preview.messageFrom')}
                messageMeta={t('preview.messageMeta')}
              />
            </div>
          </div>
        </section>

        {/* --------------------------------------------- 3 façons de créer */}
        <section className="border-t-[3px] border-black bg-off">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <SectionHead eyebrow={t('modesEyebrow')} title={t('modesTitle')} />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {CREATION_MODES.map((mode, index) => (
                <div
                  key={mode}
                  className="group animate-rise rounded-lg border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000] transition-transform duration-100 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#000]"
                  style={{ animationDelay: index * 80 + 'ms' }}
                >
                  <span className="inline-block rounded-md border-2 border-black bg-yellow px-2 py-0.5 font-mono text-[24px] font-bold leading-none tnum">
                    0{index + 1}
                  </span>
                  <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-orange">
                    {t(`modes.${mode}.tag`)}
                  </p>
                  <h3 className="mt-1 text-[19px] font-bold uppercase tracking-[-0.01em] text-black">
                    {t(`modes.${mode}.title`)}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-muted">
                    {t(`modes.${mode}.body`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- 3 étapes */}
        <section className="border-t-[3px] border-black">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <SectionHead eyebrow={t('stepsEyebrow')} title={t('stepsTitle')} />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((item, index) => (
                <div
                  key={item}
                  id={'etape-' + (index + 1)}
                  className="animate-rise rounded-lg border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000]"
                  style={{ animationDelay: index * 80 + 'ms' }}
                >
                  <span className="font-mono text-[40px] font-bold leading-none text-black/15 tnum">
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 text-[18px] font-bold uppercase tracking-[-0.01em] text-black">
                    {t(`steps.${item}.title`)}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-muted">
                    {t(`steps.${item}.body`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ cas d'usage */}
        <section className="border-t-[3px] border-black bg-off">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <SectionHead eyebrow={t('useCasesEyebrow')} title={t('useCasesTitle')} />
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {USE_CASES.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000] transition-transform duration-100 hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#000]"
                >
                  <span className="inline-block rounded border-2 border-black bg-neon px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
                    {t(`useCases.${item}.tag`)}
                  </span>
                  <h3 className="mt-3 text-[18px] font-bold uppercase tracking-[-0.01em] text-black">
                    {t(`useCases.${item}.title`)}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-charcoal-muted">
                    {t(`useCases.${item}.body`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- bénéfices */}
        <section className="border-t-[3px] border-black">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <div className="rounded-lg border-[3px] border-black bg-black px-6 py-12 shadow-[6px_6px_0_0_#000] sm:px-12">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-neon">
                {t('benefitsEyebrow')}
              </p>
              <h2 className="mt-3 max-w-2xl text-[clamp(1.6rem,4vw,2.25rem)] font-bold uppercase leading-[1.02] tracking-[-0.01em] text-yellow">
                {t('benefitsTitle')}
              </h2>
              <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {BENEFITS.map((item) => (
                  <div key={item} className="border-t-2 border-yellow/30 pt-4">
                    <h3 className="text-[15px] font-bold uppercase tracking-[0.01em] text-neon">
                      {t(`benefits.${item}.label`)}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-white/80">
                      {t(`benefits.${item}.body`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- témoignages */}
        <section className="border-t-[3px] border-black bg-off">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <SectionHead eyebrow={t('testimonialsEyebrow')} title={t('testimonialsTitle')} />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((item) => (
                <figure
                  key={item}
                  className="flex flex-col justify-between rounded-lg border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000]"
                >
                  <blockquote className="text-[14.5px] font-medium leading-relaxed text-black">
                    « {t(`testimonials.${item}.quote`)} »
                  </blockquote>
                  <figcaption className="mt-6 font-mono text-[11px] uppercase tracking-[0.06em] text-charcoal-faint">
                    <span className="font-bold text-black">{t(`testimonials.${item}.author`)}</span> ·{' '}
                    {t(`testimonials.${item}.detail`)}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- publicité */}
        {ad ? (
          <div className="border-t-[3px] border-black">
            <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
              <AdSenseUnit clientId={ad.clientId} slotId={ad.slotId} format="auto" minHeight={140} />
            </div>
          </div>
        ) : null}

        {/* ------------------------------------------------------------ tarifs */}
        <section className="border-t-[3px] border-black">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <SectionHead eyebrow={t('pricingEyebrow')} title={t('pricingTitle', { price })} />
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {/* Dossard "PROCHE" */}
              <BibCard bib="00" label={t('bibProche.label')} accent="bg-neon">
                <p className="text-[3rem] font-bold leading-none text-black tnum">
                  {t('bibProche.price')}
                </p>
                <p className="mt-2 font-mono text-[12px] font-bold uppercase tracking-[0.05em] text-charcoal-faint">
                  {t('bibProche.note')}
                </p>
                <ul className="mt-6 space-y-2.5 text-[14px] font-medium text-black">
                  <BibLi>{t('bibProche.li1')}</BibLi>
                  <BibLi>{t('bibProche.li2')}</BibLi>
                  <BibLi>{t('bibProche.li3')}</BibLi>
                  <BibLi>{t('bibProche.li4')}</BibLi>
                </ul>
              </BibCard>

              {/* Dossard "COUREUR" */}
              <BibCard bib="01" label={t('bibCoureur.label')} accent="bg-orange">
                <p className="flex items-baseline gap-2">
                  <span className="text-[3rem] font-bold leading-none text-black tnum">
                    {settings.free_message_cap}
                  </span>
                  <span className="font-mono text-[13px] font-bold uppercase text-charcoal-faint">
                    {t('bibCoureur.unit')}
                  </span>
                </p>
                <p className="mt-2 font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-charcoal-faint">
                  {t('bibCoureur.note', { price, cap: settings.unlocked_message_cap })}
                </p>
                <ul className="mt-6 space-y-2.5 text-[14px] font-medium text-black">
                  <BibLi>{t('bibCoureur.li1')}</BibLi>
                  <BibLi>{t('bibCoureur.li2')}</BibLi>
                  <BibLi>{t('bibCoureur.li3')}</BibLi>
                  <BibLi>{t('bibCoureur.li4')}</BibLi>
                </ul>
              </BibCard>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- CTA final */}
        <section className="border-t-[3px] border-black bg-orange">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8">
            <h2 className="mx-auto max-w-2xl text-[clamp(1.9rem,5vw,3rem)] font-bold uppercase leading-[0.95] tracking-[-0.01em] text-white">
              {t('finalTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-md font-medium text-black">
              {t('finalBody')}
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/login" size="lg" variant="dark">
                {t('finalCta')}
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-orange">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[clamp(1.6rem,4vw,2.4rem)] font-bold uppercase leading-[1.0] tracking-[-0.01em] text-black">
        {title}
      </h2>
    </div>
  );
}

function BibCard({
  bib,
  label,
  accent,
  children,
}: {
  bib: string;
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000]">
      <div
        className={
          'flex items-center justify-between border-b-[3px] border-black px-5 py-3 ' + accent
        }
      >
        <span className="font-mono text-[13px] font-bold uppercase tracking-[0.1em] text-black">
          {label}
        </span>
        <span className="rounded border-2 border-black bg-white px-2 font-mono text-[15px] font-bold text-black tnum">
          {bib}
        </span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function BibLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[3px] size-3.5 shrink-0 border-2 border-black bg-neon" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/**
 * Aperçu "dossard" : un bandeau titre + un tracé qui se dessine + une carte de
 * notification style compteur rétro-digital.
 */
function TriggerPreview({
  badge,
  live,
  messageFrom,
  messageMeta,
}: {
  badge: string;
  live: string;
  messageFrom: string;
  messageMeta: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border-[3px] border-black bg-off shadow-[6px_6px_0_0_#000]">
      {/* Bandeau dossard */}
      <div className="flex items-center justify-between border-b-[3px] border-black bg-black px-4 py-2.5">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-yellow">
          {badge}
        </span>
        <span className="flex items-center gap-2 font-mono text-[11px] font-bold text-neon">
          <span className="size-2 rounded-full bg-neon animate-blink" />
          {live}
        </span>
      </div>

      {/* Carte du parcours */}
      <div className="relative h-[200px] bg-off sm:h-[260px]">
        <svg
          viewBox="0 0 800 300"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0v40" fill="none" stroke="#000" strokeOpacity="0.08" />
            </pattern>
          </defs>
          <rect width="800" height="300" fill="url(#grid)" />
          <path
            d="M40 230C120 230 150 110 230 110s110 140 190 140 130-180 210-180 90 55 130 55"
            fill="none"
            stroke="#000"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="1200"
            className="animate-draw"
          />
          <circle cx="230" cy="110" r="9" fill="#00FF66" stroke="#000" strokeWidth="3" />
          <circle cx="630" cy="65" r="9" fill="#00FF66" stroke="#000" strokeWidth="3" />
          <circle cx="420" cy="250" r="13" fill="#FF5500" stroke="#000" strokeWidth="3.5" />
          <circle
            cx="420"
            cy="250"
            r="13"
            fill="none"
            stroke="#000"
            strokeOpacity="0.4"
            strokeWidth="2"
            className="origin-[420px_250px] animate-pulse-ring"
          />
        </svg>
      </div>

      {/* Bande notification, dans le flux : lisible sur mobile comme desktop */}
      <div className="flex items-center gap-3 border-t-[3px] border-black bg-white p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-md border-2 border-black bg-orange text-white">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold uppercase text-black">{messageFrom}</p>
          <p className="mt-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.04em] text-charcoal-faint tnum">
            {messageMeta}
          </p>
        </div>
        <div className="ml-auto flex items-end gap-[3px]" aria-hidden="true">
          {[10, 18, 26, 15, 22, 11, 19].map((h, i) => (
            <span
              key={i}
              className="w-[3px] bg-orange animate-bob"
              style={{ height: h, animationDelay: i * 110 + 'ms' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
