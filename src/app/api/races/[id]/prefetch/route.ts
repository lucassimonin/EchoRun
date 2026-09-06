import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Duree de vie des URL signees : le temps de telecharger, pas plus. */
const SIGNED_URL_TTL_SECONDS = 60 * 30;

/**
 * GET /api/races/:id/prefetch
 *
 * Renvoie tout ce qu'il faut pour rendre la course jouable hors-ligne :
 * trace, metadonnees des messages, et une URL signee par fichier audio.
 * RLS garantit qu'on ne lit que ses propres courses ; le client admin ne sert
 * qu'a signer les URL (l'API storage de signature exige le service_role pour
 * un bucket prive).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Connexion requise.', 401);

  const { data: race } = await supabase
    .from('races')
    .select('id, name, race_date, mode, track, distance_m, bounds, duration_s, status')
    .eq('id', id)
    .maybeSingle();

  if (!race) return jsonError('Course introuvable.', 404);

  const { data: messages } = await supabase
    .from('audio_messages')
    .select(
      'id, race_id, author_name, audio_path, mime_type, duration_ms, lat, lng, distance_m, trigger_radius_m, trigger_at_s, played_at',
    )
    .eq('race_id', id)
    .order('distance_m', { ascending: true });

  const rows = messages ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ race, messages: [] });
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from('voice-messages')
    .createSignedUrls(
      rows.map((m) => m.audio_path),
      SIGNED_URL_TTL_SECONDS,
    );

  if (error) return jsonError('Preparation impossible.', 500);

  const urlByPath = new Map(
    (signed ?? []).map((entry) => [entry.path ?? '', entry.signedUrl] as const),
  );

  return NextResponse.json({
    race,
    messages: rows
      .map((m) => ({
        id: m.id,
        race_id: m.race_id,
        author_name: m.author_name,
        mime_type: m.mime_type,
        duration_ms: m.duration_ms,
        lat: m.lat,
        lng: m.lng,
        distance_m: m.distance_m,
        trigger_radius_m: m.trigger_radius_m,
        trigger_at_s: m.trigger_at_s,
        played_at: m.played_at,
        signed_url: urlByPath.get(m.audio_path) ?? null,
      }))
      .filter((m) => m.signed_url !== null),
  });
}
