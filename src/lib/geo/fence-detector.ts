import type { TrackPoint } from '@/types';
import { fastDistance } from './geometry';

/**
 * ============================================================================
 * FenceDetector • logique PURE de déclenchement par proximité
 * ============================================================================
 *
 * Extraite de GeoEngine pour être partagée entre le moteur web (watchPosition)
 * et le moteur natif (plugin Capacitor de géolocalisation en arrière-plan) :
 * les deux reçoivent des positions brutes et doivent décider quels messages
 * déclencher, avec exactement les mêmes règles (rayon adaptatif, rattrapage,
 * projection sur le tracé). Un seul endroit à tester, deux sources de position.
 *
 * Ne touche à AUCUNE API navigateur : c'est du calcul pur.
 */

export interface Geofence {
  id: string;
  lat: number;
  lng: number;
  radiusM: number;
  /** Distance depuis le départ le long du tracé : tri et rattrapage. */
  distanceAlongM: number;
}

export interface RawPosition {
  lat: number;
  lng: number;
  accuracyM: number;
  speedMps: number | null;
  timestamp: number;
}

export interface PositionSnapshot extends RawPosition {
  /** Distance parcourue estimée, projetée sur le tracé. */
  progressM: number;
}

export type TriggerReason = 'entered' | 'passed';

export interface DetectorResult {
  snapshot: PositionSnapshot;
  /** Position exploitable (fix assez précis) ? Sinon, aucun déclenchement. */
  usable: boolean;
  triggers: { fence: Geofence; reason: TriggerReason }[];
}

/** Au-delà, le fix est trop mauvais pour déclencher quoi que ce soit. */
const MAX_USABLE_ACCURACY_M = 65;
/** Si aucun bon fix depuis ce délai, on accepte un fix dégradé. */
const STALE_FIX_MS = 20_000;
/** Le rayon effectif s'élargit avec l'imprécision, mais jamais au-delà. */
const MAX_EFFECTIVE_RADIUS_M = 220;
/** Fenêtre de recherche autour du dernier index connu (perf + anti-boucle). */
const SNAP_WINDOW = 220;

export class FenceDetector {
  private readonly track: readonly TrackPoint[];
  private readonly fences: readonly Geofence[];
  private readonly consumed = new Set<string>();
  private lastGoodFixAt = 0;
  private lastIndex = 0;

  constructor(track: readonly TrackPoint[], fences: readonly Geofence[]) {
    this.track = track;
    this.fences = fences;
  }

  seedConsumed(ids: readonly string[]): void {
    for (const id of ids) this.consumed.add(id);
  }

  get pendingCount(): number {
    return this.fences.filter((f) => !this.consumed.has(f.id)).length;
  }

  /** Ingère une position brute, renvoie le snapshot et les déclenchements. */
  feed(raw: RawPosition): DetectorResult {
    const snapshot: PositionSnapshot = {
      ...raw,
      progressM: this.estimateProgress(raw.lat, raw.lng),
    };

    const usable =
      raw.accuracyM <= MAX_USABLE_ACCURACY_M || raw.timestamp - this.lastGoodFixAt > STALE_FIX_MS;

    if (!usable) return { snapshot, usable: false, triggers: [] };
    this.lastGoodFixAt = raw.timestamp;

    // Le rayon s'adapte à la qualité du fix.
    const slack = Math.max(0, raw.accuracyM - 15);

    // Tri par distance sur le tracé : à carrefour serré, le premier point du
    // parcours passe en premier.
    const pending = this.fences
      .filter((f) => !this.consumed.has(f.id))
      .sort((a, b) => a.distanceAlongM - b.distanceAlongM);

    const triggers: { fence: Geofence; reason: TriggerReason }[] = [];

    for (const fence of pending) {
      const effectiveRadius = Math.min(fence.radiusM + slack, MAX_EFFECTIVE_RADIUS_M);
      const d = fastDistance(raw.lat, raw.lng, fence.lat, fence.lng);

      if (d <= effectiveRadius) {
        this.consumed.add(fence.id);
        triggers.push({ fence, reason: 'entered' });
        continue;
      }

      // Rattrapage d'un point manqué (tunnel, fix perdu, coureur rapide).
      const overshoot = snapshot.progressM - fence.distanceAlongM;
      if (overshoot > fence.radiusM + 60 && overshoot < 1500) {
        this.consumed.add(fence.id);
        triggers.push({ fence, reason: 'passed' });
      }
    }

    return { snapshot, usable: true, triggers };
  }

  /**
   * Projection de la position sur le tracé, en ne scannant qu'une fenêtre
   * autour du dernier index connu. Empêche les retours en arrière aberrants
   * sur les parcours en boucle.
   */
  private estimateProgress(lat: number, lng: number): number {
    if (this.track.length === 0) return 0;

    const from = Math.max(0, this.lastIndex - 40);
    const to = Math.min(this.track.length - 1, this.lastIndex + SNAP_WINDOW);

    let bestIndex = this.lastIndex;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = from; i <= to; i++) {
      const p = this.track[i];
      if (!p) continue;
      const d = fastDistance(lat, lng, p[0], p[1]);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
    }

    // Hors fenêtre (départ tardif, GPS perdu longtemps) : recherche globale.
    if (bestDist > 400) {
      for (let i = 0; i < this.track.length; i++) {
        const p = this.track[i];
        if (!p) continue;
        const d = fastDistance(lat, lng, p[0], p[1]);
        if (d < bestDist) {
          bestDist = d;
          bestIndex = i;
        }
      }
    }

    this.lastIndex = bestIndex;
    return this.track[bestIndex]?.[2] ?? 0;
  }
}
