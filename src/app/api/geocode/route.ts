import { NextResponse } from 'next/server';
import { jsonError, tooManyRequests } from '@/lib/api';
import { geocodeAddress } from '@/lib/geocoding';
import { checkRateLimit } from '@/lib/rate-limit';
import { RoutingError } from '@/lib/routing';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/geocode?q=<adresse>
 *
 * Proxy serveur vers le géocodage (OpenRouteService), réservé au coureur
 * authentifié : la clé reste côté serveur, et on borne les requêtes.
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError('Connexion requise.', 401);

  const limit = checkRateLimit('geocode:' + user.id, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q.trim().length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await geocodeAddress(q);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof RoutingError) {
      return jsonError(error.message, error.status);
    }
    return jsonError('Recherche impossible.', 500);
  }
}
