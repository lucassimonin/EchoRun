import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/races/:id/played  { entries: [{ id, playedAt }] }
 *
 * Synchronisation opportuniste depuis l'ecran de course : appelee des que le
 * reseau revient. Les echecs sont sans consequence, IndexedDB garde la trace
 * locale et retentera plus tard.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Connexion requise.', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Requete invalide.', 400);
  }

  const { entries } = (body ?? {}) as { entries?: { id?: unknown; playedAt?: unknown }[] };
  if (!Array.isArray(entries) || entries.length === 0) return jsonError('Rien a synchroniser.', 400);

  const synced: string[] = [];

  for (const entry of entries.slice(0, 100)) {
    if (typeof entry?.id !== 'string') continue;
    const playedAt =
      typeof entry.playedAt === 'number' ? new Date(entry.playedAt).toISOString() : new Date().toISOString();

    // RLS verifie que la course appartient bien a l'utilisateur.
    const { error } = await supabase
      .from('audio_messages')
      .update({ played_at: playedAt })
      .eq('id', entry.id)
      .eq('race_id', id)
      .is('played_at', null);

    if (!error) synced.push(entry.id);
  }

  return NextResponse.json({ synced });
}
