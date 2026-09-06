import type { RaceBounds, TrackPoint } from '@/types';
import { computeBounds, simplify, withCumulativeDistance } from './geometry';

export interface ParsedGpx {
  name: string | null;
  track: TrackPoint[];
  distanceM: number;
  bounds: RaceBounds | null;
  rawPointCount: number;
}

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GpxParseError';
  }
}

/** Bornes de securite : un GPX est un fichier fourni par l'utilisateur. */
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_POINTS = 200_000;
/** Au-dela, la carte rame sur mobile et le payload JSON gonfle pour rien. */
const TARGET_POINTS = 1_500;

const POINT_RE = /<(?:trkpt|rtept)\b[^>]*?\blat\s*=\s*["']([^"']+)["'][^>]*?\blon\s*=\s*["']([^"']+)["']/gi;
const POINT_RE_ALT = /<(?:trkpt|rtept)\b[^>]*?\blon\s*=\s*["']([^"']+)["'][^>]*?\blat\s*=\s*["']([^"']+)["']/gi;
const NAME_RE = /<name>\s*(?:<!\[CDATA\[)?([^<\]]{1,120})/i;

/**
 * Parseur GPX volontairement sans dependance : une regex sur les attributs
 * lat/lon des <trkpt>. On n'a besoin de rien d'autre (pas d'elevation, pas de
 * temps) et ca evite d'embarquer un parseur XML de 100 ko pour 15 lignes.
 *
 * A executer cote serveur (Route Handler) : le fichier n'est jamais parse
 * dans le navigateur du coureur.
 */
export function parseGpx(xml: string): ParsedGpx {
  if (xml.length > MAX_BYTES) {
    throw new GpxParseError('Fichier trop volumineux (10 Mo maximum).');
  }

  const raw = extractPoints(xml);

  if (raw.length < 2) {
    throw new GpxParseError(
      'Aucun trace exploitable trouve. Verifie que le fichier contient bien un segment (trkpt).',
    );
  }

  // Tolerance adaptative : on vise ~1500 points quelle que soit la source
  // (une trace Garmin de marathon en compte 40 000, un export Strava 4 000).
  let tolerance = 0.00005;
  let simplified = simplify(raw, tolerance);
  let guard = 0;
  while (simplified.length > TARGET_POINTS && guard < 12) {
    tolerance *= 1.8;
    simplified = simplify(raw, tolerance);
    guard++;
  }

  const track = withCumulativeDistance(simplified);
  const last = track[track.length - 1];

  return {
    name: extractName(xml),
    track,
    distanceM: last ? last[2] : 0,
    bounds: computeBounds(track),
    rawPointCount: raw.length,
  };
}

function extractPoints(xml: string): [number, number][] {
  const points: [number, number][] = [];

  const push = (lat: number, lng: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    // Deduplication des points strictement identiques consecutifs (pauses).
    const prev = points[points.length - 1];
    if (prev && prev[0] === lat && prev[1] === lng) return;
    points.push([lat, lng]);
  };

  POINT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = POINT_RE.exec(xml)) !== null) {
    if (points.length >= MAX_POINTS) break;
    push(Number.parseFloat(match[1] ?? ''), Number.parseFloat(match[2] ?? ''));
  }

  // Certains exports placent lon avant lat.
  if (points.length < 2) {
    POINT_RE_ALT.lastIndex = 0;
    while ((match = POINT_RE_ALT.exec(xml)) !== null) {
      if (points.length >= MAX_POINTS) break;
      push(Number.parseFloat(match[2] ?? ''), Number.parseFloat(match[1] ?? ''));
    }
  }

  return points;
}

function extractName(xml: string): string | null {
  const m = NAME_RE.exec(xml);
  const value = m?.[1]?.trim();
  return value && value.length > 0 ? value : null;
}
