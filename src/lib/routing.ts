/**
 * ============================================================================
 * Routage « snap-to-roads » — calcul d'un chemin qui suit les rues
 * ============================================================================
 *
 * Quand le coureur dessine son parcours, chaque segment entre deux clics est
 * calé sur le réseau routier réel par un service de routage compatible OSRM.
 *
 * Pourquoi OSRM par défaut : le serveur de démonstration public
 * (router.project-osrm.org) est libre et sans clé — parfait pour démarrer et
 * pour le dev. Il n'a AUCUNE garantie de disponibilité et interdit l'usage en
 * production : d'où la configuration par variables d'environnement, pour
 * pointer vers une instance auto-hébergée ou un fournisseur avec clé le jour du
 * lancement, sans toucher au code.
 *
 *   ROUTING_BASE_URL   base du service OSRM (defaut : demo public)
 *   ROUTING_PROFILE    profil de deplacement (defaut : foot)
 *
 * Ce module est SERVEUR uniquement (cf. /api/route) : le fournisseur et une
 * eventuelle cle ne fuient jamais vers le navigateur.
 */

const DEFAULT_BASE_URL = 'https://router.project-osrm.org';
const DEFAULT_PROFILE = 'foot';

export interface RoutedSegment {
  /** Chemin calé sur les routes : [[lat, lng], ...]. */
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

/**
 * Calcule le chemin routé entre deux points.
 *
 * OSRM attend les coordonnées en `lng,lat` et renvoie une géométrie GeoJSON
 * en `[lng, lat]` : on inverse dans les deux sens pour rester en `[lat, lng]`
 * partout ailleurs dans l'app.
 */
export async function routeSegment(
  from: [number, number],
  to: [number, number],
): Promise<RoutedSegment> {
  if (!isValidLatLng(from) || !isValidLatLng(to)) {
    throw new RoutingError('Coordonnées invalides.', 400);
  }

  const base = (process.env.ROUTING_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const profile = process.env.ROUTING_PROFILE || DEFAULT_PROFILE;

  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const url = `${base}/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json' },
      // Un routage lent ne doit pas bloquer l'UI indéfiniment.
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
    // Pas de route trouvée (point en pleine mer, îlot isolé…) : le client
    // pourra retomber sur un segment droit.
    throw new RoutingError('Aucun itinéraire entre ces deux points.', 422);
  }

  return {
    points: coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    distanceM: Math.round(route?.distance ?? 0),
  };
}
