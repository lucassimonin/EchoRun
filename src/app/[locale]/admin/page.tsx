import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdSettingsForm } from './AdSettingsForm';
import { MiniBars, type MiniBarsDatum } from '@/components/ui/MiniBars';
import { Eyebrow, Surface } from '@/components/ui/Surface';
import { getAppSettings } from '@/lib/settings';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils';
import type { AdminStats } from '@/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export const dynamic = 'force-dynamic';

const EMPTY: AdminStats = {
  runners: 0,
  runners_last_7d: 0,
  races: 0,
  races_open: 0,
  messages: 0,
  messages_billable: 0,
  messages_played: 0,
  contributors: 0,
  revenue_cents: 0,
  revenue_cents_30d: 0,
  paid_orders: 0,
  avg_messages_per_race: 0,
  daily: [],
};

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Admin');

  const supabase = await createServerSupabase();

  // Une seule RPC : toutes les métriques en un aller-retour, calculées en base.
  const [{ data, error }, settings] = await Promise.all([
    supabase.rpc('admin_stats'),
    getAppSettings(),
  ]);

  const stats = (error ? EMPTY : ((data ?? EMPTY) as AdminStats)) satisfies AdminStats;

  const dayFormatter = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
  const messagesSeries: MiniBarsDatum[] = stats.daily.map((d) => ({
    label: dayFormatter.format(new Date(d.day)),
    value: d.messages,
    display: String(d.messages),
  }));
  const revenueSeries: MiniBarsDatum[] = stats.daily.map((d) => ({
    label: dayFormatter.format(new Date(d.day)),
    value: d.revenue_cents,
    display: formatPrice(d.revenue_cents, locale),
  }));

  const conversion =
    stats.messages > 0 ? (stats.messages_billable / stats.messages) * 100 : 0;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h1 className="mt-3 text-title uppercase text-charcoal">{t('title')}</h1>

      {error ? (
        <p className="mt-6 rounded-lg border-[3px] border-black bg-danger/10 px-4 py-3 text-[13px] font-bold text-danger">
          {t.rich('statsError', {
            code: (c) => <code className="mx-1">{c}</code>,
          })}
        </p>
      ) : null}

      {/* ---------------------------------------------------- chiffres clés */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          value={String(stats.runners)}
          label={t('metricRunners')}
          detail={t('metricRunnersDetail', { count: stats.runners_last_7d })}
        />
        <Metric
          value={String(stats.races)}
          label={t('metricRaces')}
          detail={t('metricRacesDetail', { count: stats.races_open })}
        />
        <Metric
          value={String(stats.messages)}
          label={t('metricMessages')}
          detail={t('metricMessagesDetail', { count: stats.messages_played })}
        />
        <Metric
          value={formatPrice(stats.revenue_cents, locale)}
          label={t('metricRevenue')}
          detail={t('metricRevenueDetail', { price: formatPrice(stats.revenue_cents_30d, locale) })}
          emphasis
        />
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric value={String(stats.contributors)} label={t('metricContributors')} />
        <Metric
          value={stats.avg_messages_per_race.toFixed(1).replace('.', locale === 'en' ? '.' : ',')}
          label={t('metricAvgMessages')}
        />
        <Metric
          value={conversion.toFixed(1).replace('.', locale === 'en' ? '.' : ',') + ' %'}
          label={t('metricPaidShare')}
          detail={t('metricPaidShareDetail', { count: stats.paid_orders })}
        />
      </section>

      {/* ------------------------------------------------------- tendances */}
      <section className="mt-8 grid gap-3 lg:grid-cols-2">
        <MiniBars title={t('metricMessages')} data={messagesSeries} />
        <MiniBars title={t('metricRevenue')} data={revenueSeries} />
      </section>

      {/* ---------------------------------------------------- configuration */}
      <section className="mt-12">
        <h2 className="text-[18px] font-bold uppercase tracking-[-0.01em] text-charcoal">
          {t('configTitle')}
        </h2>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-charcoal-muted">
          {t.rich('configBody', {
            em: (c) => <em>{c}</em>,
          })}
        </p>
        <div className="mt-6">
          <AdSettingsForm settings={settings} />
        </div>
      </section>
    </main>
  );
}

function Metric({
  value,
  label,
  detail,
  emphasis,
}: {
  value: string;
  label: string;
  detail?: string;
  emphasis?: boolean;
}) {
  return (
    <Surface className={emphasis ? 'bg-neon' : undefined}>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-black/55">{label}</p>
      <p className="tnum mt-2.5 text-[1.85rem] leading-none tracking-[-0.02em] text-charcoal">
        {value}
      </p>
      {detail ? <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.02em] text-black/55">{detail}</p> : null}
    </Surface>
  );
}
