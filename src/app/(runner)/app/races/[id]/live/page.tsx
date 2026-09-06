import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LiveClient } from './LiveClient';
import { TimeLiveClient } from './TimeLiveClient';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Mode course', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: race } = await supabase
    .from('races')
    .select('id, name, race_date, distance_m, status, mode, duration_s')
    .eq('id', id)
    .maybeSingle();

  if (!race) notFound();

  const { count } = await supabase
    .from('audio_messages')
    .select('id', { count: 'exact', head: true })
    .eq('race_id', id);

  if (race.mode === 'time') {
    return (
      <TimeLiveClient
        raceId={race.id}
        raceName={race.name}
        durationS={race.duration_s ?? 3600}
        serverMessageCount={count ?? 0}
      />
    );
  }

  return (
    <LiveClient
      raceId={race.id}
      raceName={race.name}
      distanceM={race.distance_m}
      serverMessageCount={count ?? 0}
    />
  );
}
