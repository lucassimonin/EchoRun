import type { Metadata } from 'next';
import { AdSettingsForm } from './AdSettingsForm';
import { MiniBars, type MiniBarsDatum } from '@/components/ui/MiniBars';
import { Eyebrow, Surface } from '@/components/ui/Surface';
import { getAppSettings } from '@/lib/settings';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils';
import type { AdminStats } from '@/types';

export const metadata: Metadata = { title: 'Back-office', robots: { index: false } };
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

export default async function AdminPage() {
  const supabase = await createServerSupabase();

  // Une seule RPC : toutes les métriques en un aller-retour, calculées en base.
  const [{ data, error }, settings] = await Promise.all([
    supabase.rpc('admin_stats'),
    getAppSettings(),
  ]);

  const stats = (error ? EMPTY : ((data ?? EMPTY) as AdminStats)) satisfies AdminStats;

  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
  const messagesSeries: MiniBarsDatum[] = stats.daily.map((d) => ({
    label: dayFormatter.format(new Date(d.day)),
    value: d.messages,
    display: String(d.messages),
  }));
  const revenueSeries: MiniBarsDatum[] = stats.daily.map((d) => ({
    label: dayFormatter.format(new Date(d.day)),
    value: d.revenue_cents,
    display: formatPrice(d.revenue_cents),
  }));

  const conversion =
    stats.messages > 0 ? (stats.messages_billable / stats.messages) * 100 : 0;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <Eyebrow>Administration</Eyebrow>
      <h1 className="mt-3 text-title text-charcoal">Vue d’ensemble</h1>

      {error ? (
        <p className="mt-6 rounded-2xl bg-clay/8 px-4 py-3 text-[13px] text-clay">
          Les statistiques n’ont pas pu être chargées. Vérifie que la migration
          <code className="mx-1">admin_stats</code> est appliquée.
        </p>
      ) : null}

      {/* ---------------------------------------------------- chiffres clés */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          value={String(stats.runners)}
          label="Coureurs inscrits"
          detail={'+' + stats.runners_last_7d + ' sur 7 jours'}
        />
        <Metric
          value={String(stats.races)}
          label="Courses enregistrées"
          detail={stats.races_open + ' ouvertes'}
        />
        <Metric
          value={String(stats.messages)}
          label="Vocaux déposés"
          detail={stats.messages_played + ' écoutés en course'}
        />
        <Metric
          value={formatPrice(stats.revenue_cents)}
          label="Chiffre d’affaires"
          detail={formatPrice(stats.revenue_cents_30d) + ' sur 30 jours'}
          emphasis
        />
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric value={String(stats.contributors)} label="Proches participants" />
        <Metric
          value={stats.avg_messages_per_race.toFixed(1).replace('.', ',')}
          label="Vocaux par course"
        />
        <Metric
          value={conversion.toFixed(1).replace('.', ',') + ' %'}
          label="Part de vocaux payants"
          detail={stats.paid_orders + ' commandes'}
        />
      </section>

      {/* ------------------------------------------------------- tendances */}
      <section className="mt-8 grid gap-3 lg:grid-cols-2">
        <MiniBars title="Vocaux déposés" data={messagesSeries} />
        <MiniBars title="Chiffre d’affaires" data={revenueSeries} />
      </section>

      {/* ---------------------------------------------------- configuration */}
      <section className="mt-12">
        <h2 className="text-[18px] font-semibold tracking-[-0.022em] text-charcoal">
          Régie publicitaire et tarifs
        </h2>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-charcoal-muted">
          Les identifiants AdSense sont injectés au rendu des pages, côté serveur. Une publicité ne
          s’affiche que si la régie est activée <em>et</em> que le couple client&nbsp;/&nbsp;slot est
          valide — un champ mal rempli n’émet aucun appel plutôt que d’en émettre un invalide.
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
    <Surface className={emphasis ? 'bg-matcha-50' : undefined}>
      <p className="text-[11.5px] text-charcoal-faint">{label}</p>
      <p className="mt-2.5 font-mono text-[1.75rem] leading-none tabular-nums tracking-[-0.025em] text-charcoal">
        {value}
      </p>
      {detail ? <p className="mt-2 text-[11.5px] text-charcoal-faint">{detail}</p> : null}
    </Surface>
  );
}
