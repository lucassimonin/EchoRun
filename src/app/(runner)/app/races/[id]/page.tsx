import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShareCard } from './ShareCard';
import { RaceActions } from './RaceActions';
import { UnlockCard } from './UnlockCard';
import { ButtonLink } from '@/components/ui/Button';
import { Badge, Divider, Eyebrow, Surface } from '@/components/ui/Surface';
import { getAppSettings } from '@/lib/settings';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatClock, formatDistance, formatDuration, formatPrice, formatRaceDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Ma course', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS = {
  draft: { label: 'Brouillon', tone: 'neutral' as const },
  open: { label: 'Ouverte aux messages', tone: 'matcha' as const },
  live: { label: 'En course', tone: 'clay' as const },
  finished: { label: 'Terminée', tone: 'neutral' as const },
};

export default async function RaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

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
  const status = STATUS[race.status as keyof typeof STATUS];
  const shareUrl =
    (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '') +
    '/e/' +
    race.share_slug;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Link
        href="/app"
        className="text-[13px] text-charcoal-faint transition-colors hover:text-charcoal"
      >
        ← Mes courses
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>{formatRaceDate(race.race_date)}</Eyebrow>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <h1 className="mt-3 text-title text-charcoal">{race.name}</h1>
        <p className="mt-2 text-[14px] text-charcoal-muted">
          {race.mode === 'time'
            ? 'Objectif ' + formatClock(race.duration_s ?? 0)
            : formatDistance(race.distance_m)}{' '}
          · {list.length} / {messageCap} messages
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
          priceLabel={formatPrice(settings.unlock_price_cents)}
        />

        {/* --------------------------------------------------- jour de course */}
        <Surface>
          <h2 className="text-[16px] font-semibold tracking-[-0.018em] text-charcoal">
            Le jour de la course
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal-muted">
            Prépare la course la veille, sur le wifi&nbsp;: l’application télécharge tous les vocaux
            sur ton téléphone pour fonctionner sans réseau.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <ButtonLink href={'/app/races/' + race.id + '/live'} size="md">
              Préparer et courir
            </ButtonLink>
            {race.status === 'finished' ? (
              <ButtonLink href={'/app/races/' + race.id + '/finish'} size="md" variant="secondary">
                Voir le récapitulatif
              </ButtonLink>
            ) : null}
          </div>
        </Surface>

        {/* ------------------------------------------------------- les messages */}
        <Surface padded={false}>
          <div className="flex items-center justify-between gap-4 p-6 pb-4">
            <h2 className="text-[16px] font-semibold tracking-[-0.018em] text-charcoal">
              Messages reçus
            </h2>
            <span className="text-[12.5px] text-charcoal-faint">
              Classés par point du parcours
            </span>
          </div>

          {list.length === 0 ? (
            <p className="px-6 pb-7 text-[13.5px] leading-relaxed text-charcoal-muted">
              Personne n’a encore déposé de message. Envoie le lien de partage&nbsp;: c’est la
              seule chose qui manque.
            </p>
          ) : (
            <ul>
              {list.map((message, index) => (
                <li key={message.id}>
                  {index > 0 ? <Divider /> : <Divider />}
                  <div className="flex items-center gap-4 px-6 py-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-matcha-100 text-[12px] font-semibold text-matcha-600">
                      {message.author_name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-charcoal">
                        {message.author_name}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-charcoal-faint">
                        {message.trigger_at_s !== null
                          ? 'À ' + formatClock(message.trigger_at_s)
                          : 'Km ' + (message.distance_m / 1000).toFixed(1).replace('.', ',')}{' '}
                        · {formatDuration(message.duration_ms)}
                      </p>
                    </div>
                    {message.played_at ? (
                      <Badge tone="matcha">Écouté</Badge>
                    ) : (
                      <Badge>En attente</Badge>
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
