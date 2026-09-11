import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ShareCard } from './ShareCard';
import { RaceActions } from './RaceActions';
import { UnlockCard } from './UnlockCard';
import { ButtonLink } from '@/components/ui/Button';
import { Badge, Divider, Eyebrow, Surface } from '@/components/ui/Surface';
import { getAppSettings } from '@/lib/settings';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatClock, formatDistance, formatDuration, formatPrice, formatRaceDate } from '@/lib/utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'RaceDetail' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export const dynamic = 'force-dynamic';

const STATUS_TONE = {
  draft: 'neutral' as const,
  open: 'matcha' as const,
  live: 'clay' as const,
  finished: 'neutral' as const,
};

export default async function RaceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('RaceDetail');
  const ts = await getTranslations('RaceStatus');

  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user?.id ?? '')
    .maybeSingle();
  const isAdmin = !!adminProfile?.is_admin;

  const { data: race } = await supabase
    .from('races')
    .select('id, name, race_date, status, mode, distance_m, duration_s, share_slug, messages_unlocked')
    .eq('id', id)
    .maybeSingle();

  if (!race) notFound();

  const { data: messages } = await supabase
    .from('audio_messages')
    .select('id, author_name, distance_m, trigger_at_s, duration_ms, played_at, created_at')
    .eq('race_id', id)
    .order('distance_m', { ascending: true });

  const list = messages ?? [];
  const settings = await getAppSettings();
  const messageCap = race.messages_unlocked
    ? settings.unlocked_message_cap
    : settings.free_message_cap;
  const tone = STATUS_TONE[race.status as keyof typeof STATUS_TONE];
  const shareUrl =
    (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '') +
    '/e/' +
    race.share_slug;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Link
        href="/app"
        className="font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-black/60 transition-colors hover:text-black"
      >
        ← {t('back')}
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>{formatRaceDate(race.race_date, locale)}</Eyebrow>
          <Badge tone={tone}>{ts(race.status)}</Badge>
        </div>
        <h1 className="mt-3 text-title uppercase text-charcoal">{race.name}</h1>
        <p className="mt-2 font-mono text-[13px] uppercase tracking-[0.02em] text-black/70">
          {race.mode === 'time'
            ? t('objective', { clock: formatClock(race.duration_s ?? 0, locale) })
            : formatDistance(race.distance_m, locale)}{' '}
          · <span className="tnum">{list.length} / {messageCap}</span> {t('messagesSuffix')}
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <ShareCard shareUrl={shareUrl} raceName={race.name} />

        <UnlockCard
          raceId={race.id}
          count={list.length}
          freeCap={settings.free_message_cap}
          unlockedCap={settings.unlocked_message_cap}
          unlocked={race.messages_unlocked}
          priceLabel={formatPrice(settings.unlock_price_cents, locale)}
          priceCents={settings.unlock_price_cents}
          isAdmin={isAdmin}
        />

        {/* --------------------------------------------------- jour de course */}
        <Surface>
          <h2 className="text-[16px] font-bold uppercase tracking-[-0.01em] text-charcoal">
            {t('dayTitle')}
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal-muted">
            {t('dayBody')}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <ButtonLink href={'/app/races/' + race.id + '/live'} size="md">
              {t('prepare')}
            </ButtonLink>
            {race.status === 'finished' ? (
              <ButtonLink href={'/app/races/' + race.id + '/finish'} size="md" variant="secondary">
                {t('viewSummary')}
              </ButtonLink>
            ) : null}
          </div>
        </Surface>

        {/* ------------------------------------------------------- les messages */}
        <Surface padded={false}>
          <div className="flex items-center justify-between gap-4 border-b-[3px] border-black p-6 pb-4">
            <h2 className="text-[16px] font-bold uppercase tracking-[-0.01em] text-charcoal">
              {t('receivedTitle')}
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-black/50">
              {t('sortedBy')}
            </span>
          </div>

          {list.length === 0 ? (
            <p className="px-6 py-7 text-[13.5px] leading-relaxed text-charcoal-muted">
              {t('emptyMessages')}
            </p>
          ) : (
            <ul>
              {list.map((message, index) => (
                <li key={message.id}>
                  {index > 0 ? <Divider /> : null}
                  <div className="flex items-center gap-4 px-6 py-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-black bg-neon text-[12px] font-bold text-black">
                      {message.author_name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-charcoal">
                        {message.author_name}
                      </p>
                      <p className="mt-0.5 font-mono text-[11.5px] uppercase tracking-[0.02em] text-black/60">
                        <span className="tnum">
                          {message.trigger_at_s !== null
                            ? t('at', { clock: formatClock(message.trigger_at_s, locale) })
                            : t('km', {
                                km: (message.distance_m / 1000)
                                  .toFixed(1)
                                  .replace('.', locale === 'en' ? '.' : ','),
                              })}
                        </span>{' '}
                        · <span className="tnum">{formatDuration(message.duration_ms)}</span>
                      </p>
                    </div>
                    {message.played_at ? (
                      <Badge tone="matcha">{t('played')}</Badge>
                    ) : (
                      <Badge>{t('waiting')}</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <RaceActions raceId={race.id} status={race.status} />
      </div>
    </main>
  );
}
