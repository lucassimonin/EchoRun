import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Badge, Eyebrow, Surface } from '@/components/ui/Surface';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatClock, formatDistance, formatRaceDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mes courses', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS_LABEL = {
  draft: { label: 'Brouillon', tone: 'neutral' as const },
  open: { label: 'Ouverte aux messages', tone: 'matcha' as const },
  live: { label: 'En course', tone: 'clay' as const },
  finished: { label: 'Terminée', tone: 'neutral' as const },
};

export default async function RacesPage() {
  const supabase = await createServerSupabase();

  const { data: races } = await supabase
    .from('races')
    .select('id, name, race_date, status, mode, distance_m, duration_s, share_slug, audio_messages(count)')
    .order('created_at', { ascending: false });

  const list = races ?? [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Mon espace</Eyebrow>
          <h1 className="mt-3 text-title text-charcoal">Mes courses</h1>
        </div>
        <ButtonLink href="/app/races/new">Nouvelle course</ButtonLink>
      </div>

      {list.length === 0 ? (
        <Surface className="mt-10 py-16 text-center">
          <p className="text-[16px] font-medium text-charcoal">Aucune course pour l’instant</p>
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-charcoal-muted">
            Importe le fichier GPX de ta prochaine course, puis envoie le lien à tes proches. Trois
            minutes, une fois.
          </p>
          <ButtonLink href="/app/races/new" className="mt-7">
            Importer un GPX
          </ButtonLink>
        </Surface>
      ) : (
        <ul className="mt-10 grid gap-3">
          {list.map((race) => {
            const status = STATUS_LABEL[race.status as keyof typeof STATUS_LABEL];
            const count =
              (race.audio_messages as unknown as { count: number }[] | null)?.[0]?.count ?? 0;

            return (
              <li key={race.id}>
                <Link
                  href={'/app/races/' + race.id}
                  className="group flex items-center justify-between gap-6 rounded-card border border-charcoal/[0.07] bg-paper p-6 shadow-soft transition-[border-color,transform] hover:border-charcoal/15"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="truncate text-[16.5px] font-semibold tracking-[-0.018em] text-charcoal">
                        {race.name}
                      </h2>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <p className="mt-1.5 text-[13px] text-charcoal-faint">
                      {formatRaceDate(race.race_date)} ·{' '}
                      {race.mode === 'time'
                        ? formatClock(race.duration_s ?? 0)
                        : formatDistance(race.distance_m)}{' '}
                      ·{' '}
                      {count} message{count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="shrink-0 text-charcoal-faint transition-transform group-hover:translate-x-0.5"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M7.5 4.5 13 10l-5.5 5.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
