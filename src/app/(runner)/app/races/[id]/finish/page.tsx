import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdSenseUnit } from '@/components/ads/AdSenseUnit';
import { ButtonLink } from '@/components/ui/Button';
import { Badge, Divider, Eyebrow, Surface } from '@/components/ui/Surface';
import { adSlotFor, getAppSettings } from '@/lib/settings';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatClock, formatDistance, formatDuration } from '@/lib/utils';

export const metadata: Metadata = { title: 'Fin de course', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function FinishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <Link
        href={'/app/races/' + race.id}
        className="text-[13px] text-charcoal-faint transition-colors hover:text-charcoal"
      >
        ← Retour à la course
      </Link>

      <header className="mt-6">
        <Eyebrow>Course terminée</Eyebrow>
        <h1 className="mt-3 text-title text-charcoal">{race.name}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-charcoal-muted">
          {played.length} message{played.length === 1 ? '' : 's'} sur {list.length} se{' '}
          {played.length === 1 ? 's’est' : 'sont'} déclenché{played.length === 1 ? '' : 's'} pendant
          {race.mode === 'time' ? 'ta course de ' + formatClock(race.duration_s ?? 0) : 'tes ' + formatDistance(race.distance_m)}.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat value={String(played.length)} label="Vocaux entendus" />
        <Stat value={String(contributors)} label="Proches mobilisés" />
        <Stat
          value={formatDuration(list.reduce((sum, m) => sum + m.duration_ms, 0))}
          label="D’encouragements"
        />
      </div>

      <Surface className="mt-4" padded={false}>
        <div className="p-6 pb-4">
          <h2 className="text-[16px] font-semibold tracking-[-0.018em] text-charcoal">
            Tes messages, dans l’ordre du parcours
          </h2>
          <p className="mt-1.5 text-[13px] text-charcoal-faint">
            Ils restent écoutables ici. C’est le seul souvenir de ta course qui a une voix.
          </p>
        </div>

        {list.length === 0 ? (
          <p className="px-6 pb-7 text-[13.5px] text-charcoal-muted">Aucun message sur cette course.</p>
        ) : (
          <ul>
            {list.map((message) => (
              <li key={message.id}>
                <Divider />
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
                  {message.played_at ? <Badge tone="matcha">Entendu</Badge> : <Badge>Manqué</Badge>}
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
        <p className="text-[15px] font-medium text-charcoal">Une prochaine course en vue&nbsp;?</p>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-charcoal-muted">
          Importe le GPX, renvoie le lien. Tes proches savent déjà comment ça marche.
        </p>
        <ButtonLink href="/app/races/new" className="mt-6">
          Créer une nouvelle course
        </ButtonLink>
      </Surface>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-charcoal/[0.07] bg-paper p-5 text-center shadow-soft">
      <p className="font-mono text-[1.75rem] leading-none tabular-nums tracking-[-0.02em] text-charcoal">
        {value}
      </p>
      <p className="mt-2 text-[11.5px] leading-tight text-charcoal-faint">{label}</p>
    </div>
  );
}
