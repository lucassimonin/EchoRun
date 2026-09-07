import type { RaceBounds, TrackPoint } from '@/types';

const EARTH_RADIUS_M = 6_371_008.8;
const DEG = Math.PI / 180;

/** Distance orthodromique en metres. Assez precis a l'echelle d'une course. */
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * DEG;
  const dLng = (bLng - aLng) * DEG;
  const lat1 = aLat * DEG;
  const lat2 = bLat * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Distance approchee mais ~4x plus rapide que haversine (equirectangulaire).
 * Utilisee dans la boucle de detection, appelee sur chaque point a chaque
 * mise a jour GPS : l'erreur est < 0,5 % sur quelques kilometres, largement
 * sous la precision d'un GPS de telephone.
 */
export function fastDistance(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const x = (bLng - aLng) * DEG * Math.cos(((aLat + bLat) / 2) * DEG);
  const y = (bLat - aLat) * DEG;
  return Math.sqrt(x * x + y * y) * EARTH_RADIUS_M;
}

/**
 * Simplification Ramer-Douglas-Peucker, iterative (pas de recursion : un GPX
 * de trail peut depasser 50 000 points et faire sauter la pile).
 * `tolerance` en degres approximatifs ; 1e-4 ~ 11 m.
 */
export function simplify(
  points: readonly (readonly [number, number])[],
  tolerance = 0.00008,
): [number, number][] {
  if (points.length < 3) return points.map((p) => [p[0], p[1]]);

  const sqTolerance = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length) {
    const segment = stack.pop();
    if (!segment) break;
    const [first, last] = segment;
    let maxSqDist = 0;
    let index = -1;

    const a = points[first];
    const b = points[last];
    if (!a || !b) continue;

    for (let i = first + 1; i < last; i++) {
      const p = points[i];
      if (!p) continue;
      const sqDist = sqSegmentDistance(p, a, b);
      if (sqDist > maxSqDist) {
        maxSqDist = sqDist;
        index = i;
      }
    }

    if (index !== -1 && maxSqDist > sqTolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (keep[i] && p) out.push([p[0], p[1]]);
  }
  return out;
}

function sqSegmentDistance(
  p: readonly [number, number],
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  // Correction du meridien : sans elle, RDP sur-simplifie les segments N/S.
  const k = Math.cos(a[0] * DEG);
  let x = a[1] * k;
  let y = a[0];
  let dx = b[1] * k - x;
  let dy = b[0] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p[1] * k - x) * dx + (p[0] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[1] * k;
      y = b[0];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p[1] * k - x;
  dy = p[0] - y;
  return dx * dx + dy * dy;
}

/** Ajoute la distance cumulee a chaque point : [lat, lng, cumul_m]. */
export function withCumulativeDistance(points: readonly (readonly [number, number])[]): TrackPoint[] {
  const out: TrackPoint[] = [];
  let cumul = 0;
  let prev: readonly [number, number] | null = null;

  for (const p of points) {
    if (prev) cumul += haversine(prev[0], prev[1], p[0], p[1]);
    out.push([p[0], p[1], Math.round(cumul)]);
    prev = p;
  }
  return out;
}

export function computeBounds(points: readonly TrackPoint[]): RaceBounds | null {
  if (points.length === 0) return null;
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  for (const [lat, lng] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { sw: [minLat, minLng], ne: [maxLat, maxLng] };
}

export interface SnapResult {
  index: number;
  lat: number;
  lng: number;
  distanceAlongM: number;
  offsetM: number;
}

/**
 * Projette un clic sur le trace : renvoie le point du trace le plus proche.
 * Le proche clique "a peu pres" sur la ligne, on recale exactement dessus •
 * indispensable pour que le declenchement GPS soit fiable le jour J.
 */
export function snapToTrack(
  track: readonly TrackPoint[],
  lat: number,
  lng: number,
): SnapResult | null {
  if (track.length === 0) return null;

  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < track.length; i++) {
    const p = track[i];
    if (!p) continue;
    const d = fastDistance(lat, lng, p[0], p[1]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }

  const point = track[best];
  if (!point) return null;

  return {
    index: best,
    lat: point[0],
    lng: point[1],
    distanceAlongM: point[2],
    offsetM: bestDist,
  };
}
