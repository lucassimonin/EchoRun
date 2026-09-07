import { NextResponse } from 'next/server';
import { jsonDbError, jsonError } from '@/lib/api';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_STATUS = new Set(['draft', 'open', 'live', 'finished']);

/** PATCH /api/races/:id  { status?, name?, race_date? } */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { status, name, race_date: raceDate } = (body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (typeof status === 'string') {
    if (!ALLOWED_STATUS.has(status)) return jsonError('Statut invalide.', 400);
    patch.status = status;
  }
  if (typeof name === 'string' && name.trim().length >= 2) patch.name = name.trim().slice(0, 120);
  if (typeof raceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raceDate)) patch.race_date = raceDate;

  if (Object.keys(patch).length === 0) return jsonError('Aucune modification.', 400);

  const { data, error } = await supabase
    .from('races')
    .update(patch)
    .eq('id', id)
    .select('id, status, name, race_date')
    .maybeSingle();

  if (error || !data) {
    return jsonDbError('PATCH /api/races/:id', error, 'Mise a jour impossible.');
  }
  return NextResponse.json({ race: data });
}

/** DELETE /api/races/:id • supprime la course, ses messages et ses audios. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Connexion requise.', 401);

  const { error } = await supabase.from('races').delete().eq('id', id);
  if (error) return jsonDbError('DELETE /api/races/:id', error, 'Suppression impossible.');

  // Les fichiers audio sont ranges sous <race_id>/ : un seul prefixe a purger.
  // Delegue a une tache de menage (cron Supabase) pour ne pas bloquer la
  // reponse : cf. docs/ARCHITECTURE.md, section "Nettoyage du storage".
  return NextResponse.json({ ok: true });
}
