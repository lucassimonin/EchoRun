import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AdSenseUnit } from '@/components/ads/AdSenseUnit';
import { ButtonLink } from '@/components/ui/Button';
import { Badge, Divider, Eyebrow, Surface } from '@/components/ui/Surface';
import { adSlotFor, getAppSettings } from '@/lib/settings';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatClock, formatDistance, formatDuration } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'FinishPage' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export const dynamic = 'force-dynamic';

export default async function FinishPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('FinishPage');

  const supabase = await createServerSupabase();

  const { data: race } = await supabase
    .from('races')
    .select('id, name, mode, distance_m, duration_s, status')
    .eq('id', id)
    .maybeSingle();

  if (!race) notFound();

  const [{ data: messages }, settings] = await Promise.all([
    supabase
      .from('audio_messages')
      .select('id, author_name, distance_m, trigger_at_s, duration_ms, played_at')
      .eq('race_id', id)
      .order('distance_m', { ascending: true }),
    getAppSettings(),
  ]);

  const list = messages ?? [];
  const played = list.filter((m) => m.played_at);
  const contributors = new Set(list.map((m) => m.author_name)).size;
  const ad = adSlotFor(settings, 'finish');

  const context =
    race.mode === 'time'
      ? t('contextTime', { clock: formatClock(race.duration_s ?? 0, locale) })
      : t('contextDistance', { distance: formatDistance(race.distance_m, locale) });

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <Link
        href={'/app/races/' + race.id}
        className="font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-black/60 transition-colors hover:text-black"
      >
        ← {t('back')}
      </Link>

      <header className="mt-6">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="mt-3 text-title uppercase text-charcoal">{race.name}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-charcoal-muted">
          {t('summary', { count: played.length, total: list.length, context })}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat value={String(played.length)} label={t('statHeard')} />
        <Stat value={String(contributors)} label={t('statContributors')} />
        <Stat
          value={formatDuration(list.reduce((sum, m) => sum + m.duration_ms, 0))}
          label={t('statDuration')}
        />
      </div>

      <Surface className="mt-4" padded={false}>
        <div className="p-6 pb-4">
          <h2 className="text-[16px] font-bold uppercase tracking-[-0.01em] text-charcoal">
            {t('listTitle')}
          </h2>
          <p className="mt-1.5 text-[13px] text-charcoal-muted">
            {t('listBody')}
          </p>
        </div>

        {list.length === 0 ? (
          <p className="px-6 pb-7 text-[13.5px] text-charcoal-muted">{t('emptyList')}</p>
        ) : (
          <ul>
            {list.map((message) => (
              <li key={message.id}>
                <Divider />
                <div className="flex items-center gap-4 px-6 py-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-black bg-neon text-[12px] font-bold text-black">
                    {message.author_name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-charcoal">
                      {message.author_name}
                    </p>
                    <p className="mt-0.5 font-mono text-[11.5px] uppercase tracking-[0.02em] text-black/60">
                      {message.trigger_at_s !== null
                        ? t('at', { clock: formatClock(message.trigger_at_s, locale) })
                        : t('km', {
                            km: (message.distance_m / 1000)
                              .toFixed(1)
                              .replace('.', locale === 'en' ? '.' : ','),
                          })}{' '}
                      · {formatDuration(message.duration_ms)}
                    </p>
                  </div>
                  {message.played_at ? (
                    <Badge tone="matcha">{t('heard')}</Badge>
                  ) : (
                    <Badge>{t('missed')}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      {ad ? (
        <div className="mt-8">
          <AdSenseUnit clientId={ad.clientId} slotId={ad.slotId} format="auto" minHeight={140} />
        </div>
      ) : null}

      <Surface className="mt-8 text-center">
        <p className="text-[16px] font-bold uppercase text-charcoal">{t('nextTitle')}</p>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-charcoal-muted">
          {t('nextBody')}
        </p>
        <ButtonLink href="/app/races/new" className="mt-6">
          {t('nextCta')}
        </ButtonLink>
      </Surface>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border-[3px] border-black bg-paper p-5 text-center shadow-[4px_4px_0_0_#000]">
      <p className="font-mono text-[1.75rem] leading-none tabular-nums tracking-[-0.02em] text-charcoal">
        {value}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.06em] leading-tight text-black/55">{label}</p>
    </div>
  );
}
