import { createAdminClient } from '@/lib/supabase/admin';
import { getAppSettings } from '@/lib/settings';
import type { PublicRace, TrackPoint } from '@/types';

const SLUG_RE = /^[a-z0-9]{10,24}$/;

/**
 * Charge la projection publique d'une course depuis son slug.
 *
 * Passe par le client service_role : aucune policy `anon` n'est ouverte en
 * base, et on contrôle exactement les colonnes exposées. Surtout, on ne fuite
 * jamais l'`user_id` du coureur ni les chemins de stockage des audios.
 */
export async function loadPublicRace(slug: string): Promise<PublicRace | null> {
  if (!SLUG_RE.test(slug)) return null;

  const supabase = createAdminClient();

  const { data: race, error } = await supabase
    .from('races')
    .select(
      'id, name, race_date, share_slug, status, mode, distance_m, track, bounds, duration_s, messages_unlocked, profiles!inner(display_name)',
    )
    .eq('share_slug', slug)
    .maybeSingle();

  if (error || !race) return null;
  if (race.status === 'draft') return null;

  const [{ data: taken }, settings] = await Promise.all([
    supabase
      .from('audio_messages')
      .select('lat, lng, trigger_at_s, author_name')
      .eq('race_id', race.id)
      .order('created_at', { ascending: true }),
    getAppSettings(),
  ]);

  const profile = race.profiles as unknown as { display_name: string | null } | null;
  const rows = (taken ?? []) as {
    lat: number | null;
    lng: number | null;
    trigger_at_s: number | null;
    author_name: string;
  }[];

  return {
    id: race.id,
    name: race.name,
    race_date: race.race_date,
    share_slug: race.share_slug,
    status: race.status,
    mode: race.mode,
    runner_name: profile?.display_name?.trim() || 'ton coureur',
    distance_m: race.distance_m,
    track: (race.track ?? []) as TrackPoint[],
    bounds: race.bounds,
    duration_s: race.duration_s,
    per_contributor_cap: settings.per_contributor_cap,
    message_count: rows.length,
    message_cap: race.messages_unlocked
      ? settings.unlocked_message_cap
      : settings.free_message_cap,
    messages_unlocked: race.messages_unlocked,
    // Points sur la carte (GPX) et repères sur la frise (temps) sont dérivés
    // du même jeu de messages, filtrés par ce qui est renseigné.
    taken_points: rows
      .filter((r) => r.lat !== null && r.lng !== null)
      .map((r) => ({ lat: r.lat as number, lng: r.lng as number, author_name: r.author_name })),
    taken_times: rows
      .filter((r) => r.trigger_at_s !== null)
      .map((r) => ({ trigger_at_s: r.trigger_at_s as number, author_name: r.author_name })),
  };
}
