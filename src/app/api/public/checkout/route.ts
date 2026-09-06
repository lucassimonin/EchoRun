import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * OBSOLETE. Depuis le passage au modele « le coureur paie », les proches ne
 * paient plus rien : ils ne sont jamais factures. Le deblocage est desormais
 * fait par le coureur via POST /api/races/[id]/unlock. On garde l'endpoint
 * pour renvoyer un 410 explicite plutot qu'un 404 trompeur.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Les proches ne paient plus : c est le coureur qui debloque la course.' },
    { status: 410 },
  );
}
