/**
 * ============================================================================
 * Routage « snap-to-roads » • calcul d'un chemin qui suit les voies réelles
 * ============================================================================
 *
 * Quand le coureur dessine son parcours, chaque segment entre deux clics est
 * calé sur le réseau réel par un service de routage. Deux fournisseurs sont
 * supportés, choisis par variables d'environnement :
 *
 *   ROUTING_PROVIDER   'ors' | 'osrm'
 *                      • Par défaut : 'ors' dès qu'une clé est fournie, sinon
 *                        'osrm' (repli sans clé).
 *   ROUTING_API_KEY    clé du fournisseur (obligatoire pour 'ors').
 *   ROUTING_PROFILE    profil de déplacement.
 *                      • ORS  : 'foot-hiking' (défaut) — suit sentiers, chemins
 *                        forestiers et petites voies. 'foot-walking' pour rester
 *                        sur trottoirs/voies aménagées.
 *                      • OSRM : 'foot' (défaut).
 *   ROUTING_BASE_URL   base du service (défaut selon le fournisseur).
 *
 * Pourquoi OpenRouteService pour le sentier : son profil `foot-hiking` route
 * sur le réseau piéton d'OpenStreetMap (footway, path, track…), là où le serveur
 * OSRM public de démo ne connaît que le réseau routier « voiture ».
 *
 * Ce module est SERVEUR uniquement (cf. /api/route) : le fournisseur et la clé
 * ne fuient jamais vers le navigateur.
 */

const OSRM_DEFAULT_BASE_URL = 'https://router.project-osrm.org';
const OSRM_DEFAULT_PROFILE = 'foot';
const ORS_DEFAULT_BASE_URL = 'https://api.openrouteservice.org';
const ORS_DEFAULT_PROFILE = 'foot-hiking';

export interface RoutedSegment {
  /** Chemin calé sur les voies : [[lat, lng], ...]. */
  points: [number, number][];
  /** Longueur du segment en mètres, telle que calculée par le routeur. */
  distanceM: number;
}

export class RoutingError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'RoutingError';
  }
}

function isValidLatLng(p: unknown): p is [number, number] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    typeof p[0] === 'number' &&
    typeof p[1] === 'number' &&
    p[0] >= -90 &&
    p[0] <= 90 &&
    p[1] >= -180 &&
    p[1] <= 180
  );
}

/** Fournisseur retenu : explicite, sinon ORS si une clé est fournie, sinon OSRM. */
function resolveProvider(): 'ors' | 'osrm' {
  const explicit = process.env.ROUTING_PROVIDER?.toLowerCase();
  if (explicit === 'ors' || explicit === 'osrm') return explicit;
  return process.env.ROUTING_API_KEY ? 'ors' : 'osrm';
}

/**
 * Calcule le chemin routé entre deux points, en `[lat, lng]` partout.
 */
export async function routeSegment(
  from: [number, number],
  to: [number, number],
): Promise<RoutedSegment> {
  if (!isValidLatLng(from) || !isValidLatLng(to)) {
    throw new RoutingError('Coordonnées invalides.', 400);
  }
  return resolveProvider() === 'ors' ? routeWithOrs(from, to) : routeWithOsrm(from, to);
}

/**
 * OpenRouteService — profil piéton/rando qui suit les sentiers OSM.
 * L'API attend `[lng, lat]` et renvoie une géométrie GeoJSON en `[lng, lat]`.
 */
async function routeWithOrs(
  from: [number, number],
  to: [number, number],
): Promise<RoutedSegment> {
  const key = process.env.ROUTING_API_KEY;
  if (!key) {
    throw new RoutingError('Clé de routage manquante (ROUTING_API_KEY).', 500);
  }
  const base = (process.env.ROUTING_BASE_URL || ORS_DEFAULT_BASE_URL).replace(/\/$/, '');
  const profile = process.env.ROUTING_PROFILE || ORS_DEFAULT_PROFILE;
  const url = `${base}/v2/directions/${profile}/geojson`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: key,
      },
      body: JSON.stringify({ coordinates: [[from[1], from[0]], [to[1], to[0]]] }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new RoutingError('Service de routage injoignable.', 502);
  }

  if (response.status === 429) {
    throw new RoutingError('Quota de routage dépassé, réessaie dans un instant.', 429);
  }
  if (!response.ok) {
    // 404 = aucun itinéraire piéton entre ces deux points : le client
    // retombera sur un segment droit.
    if (response.status === 404) {
      throw new RoutingError('Aucun itinéraire entre ces deux points.', 422);
    }
    throw new RoutingError('Le service de routage a refusé la requête.', 502);
  }

  const data = (await response.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number][] };
      properties?: { summary?: { distance?: number } };
    }[];
  };

  const feature = data.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) {
    throw new RoutingError('Aucun itinéraire entre ces deux points.', 422);
  }

  return {
    points: coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    distanceM: Math.round(feature?.properties?.summary?.distance ?? 0),
  };
}

/**
 * OSRM (repli sans clé). Le serveur public de démo ne route que sur le réseau
 * « voiture » : conservé pour le dev et le repli, pas pour le sentier.
 * OSRM attend `lng,lat` et renvoie une géométrie GeoJSON `[lng, lat]`.
 */
async function routeWithOsrm(
  from: [number, number],
  to: [number, number],
): Promise<RoutedSegment> {
  const base = (process.env.ROUTING_BASE_URL || OSRM_DEFAULT_BASE_URL).replace(/\/$/, '');
  const profile = process.env.ROUTING_PROFILE || OSRM_DEFAULT_PROFILE;

  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const url = `${base}/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new RoutingError('Service de routage injoignable.', 502);
  }

  if (!response.ok) {
    throw new RoutingError('Le service de routage a refusé la requête.', 502);
  }

  const data = (await response.json()) as {
    code?: string;
    routes?: { distance?: number; geometry?: { coordinates?: [number, number][] } }[];
  };

  const route = data.routes?.[0];
  const coordinates = route?.geometry?.coordinates;
  if (data.code !== 'Ok' || !coordinates || coordinates.length < 2) {
    throw new RoutingError('Aucun itinéraire entre ces deux points.', 422);
  }

  return {
    points: coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    distanceM: Math.round(route?.distance ?? 0),
  };
}
