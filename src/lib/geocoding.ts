import { RoutingError } from '@/lib/routing';

/**
 * ============================================================================
 * Géocodage • transformer une adresse en coordonnées
 * ============================================================================
 *
 * Réutilise OpenRouteService (moteur Pelias) avec la même clé que le routage
 * (`ROUTING_API_KEY`) : le coureur tape une adresse, on recentre la carte de
 * dessin dessus. Module SERVEUR uniquement (cf. /api/geocode) : la clé ne fuit
 * jamais vers le navigateur.
 */

const ORS_DEFAULT_BASE_URL = 'https://api.openrouteservice.org';

export interface GeocodeResult {
  /** Libellé lisible (ex. « 12 Rue de la Paix, Paris, France »). */
  label: string;
  lat: number;
  lng: number;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const text = query.trim();
  if (text.length < 3) return [];

  const key = process.env.ROUTING_API_KEY;
  if (!key) {
    throw new RoutingError('Recherche d’adresse indisponible (clé manquante).', 500);
  }

  const base = (process.env.ROUTING_BASE_URL || ORS_DEFAULT_BASE_URL).replace(/\/$/, '');
  const url =
    `${base}/geocode/search?api_key=${encodeURIComponent(key)}` +
    `&text=${encodeURIComponent(text)}&size=5`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new RoutingError('Service de recherche injoignable.', 502);
  }

  if (response.status === 429) {
    throw new RoutingError('Trop de recherches, réessaie dans un instant.', 429);
  }
  if (!response.ok) {
    throw new RoutingError('La recherche d’adresse a échoué.', 502);
  }

  const data = (await response.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number] };
      properties?: { label?: string };
    }[];
  };

  const results: GeocodeResult[] = [];
  for (const feature of data.features ?? []) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length !== 2) continue;
    const [lng, lat] = coords;
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    results.push({ label: feature.properties?.label ?? text, lat, lng });
  }
  return results;
}
