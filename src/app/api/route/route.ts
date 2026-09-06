import { NextResponse } from 'next/server';
import { jsonError, tooManyRequests } from '@/lib/api';
import { checkRateLimit } from '@/lib/rate-limit';
import { RoutingError, routeSegment } from '@/lib/routing';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/route  { from: [lat, lng], to: [lat, lng] }
 *
 * Proxy serveur vers le service de routage. Réservé au coureur authentifié :
 * ça évite qu'un tiers se serve de notre endpoint comme d'un routeur gratuit,
 * et ça garde le fournisseur (et une éventuelle clé) hors du navigateur.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Connexion requise.', 401);

  // Le dessin génère beaucoup de requêtes ; on borne sans gêner l'usage normal.
  const limit = checkRateLimit('route:' + user.id, 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Requête invalide.', 400);
  }

  const { from, to } = (body ?? {}) as { from?: unknown; to?: unknown };

  const parse = (v: unknown): [number, number] | null => {
    if (!Array.isArray(v) || v.length !== 2) return null;
    const [a, b] = v;
    return typeof a === 'number' && typeof b === 'number' ? [a, b] : null;
  };

  const fromLL = parse(from);
  const toLL = parse(to);
  if (!fromLL || !toLL) return jsonError('Points de départ et d’arrivée requis.', 400);

  try {
    const segment = await routeSegment(fromLL, toLL);
    return NextResponse.json(segment);
  } catch (error) {
    if (error instanceof RoutingError) {
      return jsonError(error.message, error.status);
    }
    return jsonError('Routage impossible.', 500);
  }
}
