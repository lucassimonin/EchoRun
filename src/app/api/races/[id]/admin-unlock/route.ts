import { NextResponse } from 'next/server';
import { jsonDbError, jsonError } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/races/[id]/admin-unlock  { unlocked?: boolean }
 *
 * Réservé aux comptes admin : bascule `messages_unlocked` SANS paiement, pour
 * lever (ou remettre) le plafond de messages sur n'importe quelle course.
 *
 * On vérifie `is_admin` via le client de session (lecture RLS de son propre
 * profil), puis on écrit avec le client service_role : seul lui peut modifier
 * une course dont l'admin n'est pas propriétaire.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Connexion requise.', 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return jsonError('Accès refusé.', 403);

  // Corps optionnel : par défaut on débloque (supprime la limite).
  let unlocked = true;
  try {
    const body = (await request.json()) as { unlocked?: unknown };
    if (typeof body?.unlocked === 'boolean') unlocked = body.unlocked;
  } catch {
    /* pas de corps : on garde le défaut */
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('races')
    .update({ messages_unlocked: unlocked })
    .eq('id', id)
    .select('id, messages_unlocked')
    .maybeSingle();

  if (error || !data) {
    return jsonDbError('POST /api/races/:id/admin-unlock', error, 'Action impossible.');
  }
  return NextResponse.json({ race: data });
}
