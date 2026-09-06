import type { TrackPoint } from '@/types';
import {
  FenceDetector,
  type Geofence,
  type PositionSnapshot,
  type RawPosition,
  type TriggerReason,
} from './fence-detector';

// Ré-exports pour ne pas casser les imports existants (LiveClient…).
export type { Geofence, PositionSnapshot, TriggerReason };

/**
 * ============================================================================
 * GeoEngine — moteur GPS WEB (watchPosition, premier plan)
 * ============================================================================
 *
 * Source de position pour la PWA. La logique de déclenchement, elle, vit dans
 * FenceDetector (pure, partagée avec le moteur natif). Cette classe ne fait que
 * brancher `watchPosition` + le Wake Lock dessus.
 *
 * Rappel de la contrainte web : ni iOS ni Android ne donnent le GPS en tâche de
 * fond à une page web. D'où le « mode écran actif » (Wake Lock + premier plan).
 * Le moteur natif (NativeGeoEngine) lève cette contrainte en réutilisant le
 * MÊME FenceDetector au-dessus d'un plugin Capacitor.
 */

export type GeoEngineState = 'idle' | 'acquiring' | 'tracking' | 'error';

export interface GeoEngineOptions {
  track: readonly TrackPoint[];
  fences: readonly Geofence[];
  onPosition?: (snapshot: PositionSnapshot) => void;
  onTrigger?: (fence: Geofence, reason: TriggerReason, snapshot: PositionSnapshot) => void;
  onState?: (state: GeoEngineState, detail?: string) => void;
  onWakeLock?: (held: boolean) => void;
}

export class GeoEngine {
  private readonly options: GeoEngineOptions;
  private readonly detector: FenceDetector;
  private watchId: number | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private state: GeoEngineState = 'idle';
  private visibilityHandler: (() => void) | null = null;

  constructor(options: GeoEngineOptions) {
    this.options = options;
    this.detector = new FenceDetector(options.track, options.fences);
  }

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /** Marque des points comme déjà joués (reprise après rechargement). */
  seedConsumed(ids: readonly string[]): void {
    this.detector.seedConsumed(ids);
  }

  get pendingCount(): number {
    return this.detector.pendingCount;
  }

  /** À appeler dans un geste utilisateur (bouton « Démarrer la course »). */
  async start(): Promise<void> {
    if (!GeoEngine.isSupported()) {
      this.setState('error', "Ce navigateur n'expose pas la géolocalisation.");
      return;
    }
    if (this.watchId !== null) return;

    this.setState('acquiring');
    await this.acquireWakeLock();

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        void this.acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    void this.releaseWakeLock();
    this.setState('idle');
  }

  // ------------------------------------------------------------- internals --

  private setState(state: GeoEngineState, detail?: string): void {
    if (this.state === state && !detail) return;
    this.state = state;
    this.options.onState?.(state, detail);
  }

  private handlePosition(pos: GeolocationPosition): void {
    const { latitude, longitude, accuracy, speed } = pos.coords;
    const raw: RawPosition = {
      lat: latitude,
      lng: longitude,
      accuracyM: accuracy,
      speedMps: typeof speed === 'number' ? speed : null,
      timestamp: pos.timestamp || Date.now(),
    };

    this.setState('tracking');
    const result = this.detector.feed(raw);
    this.options.onPosition?.(result.snapshot);
    for (const t of result.triggers) {
      this.options.onTrigger?.(t.fence, t.reason, result.snapshot);
    }
  }

  private handleError(err: GeolocationPositionError): void {
    const messages: Record<number, string> = {
      1: 'Autorisation de localisation refusée. Active-la dans les réglages du navigateur.',
      2: 'Position indisponible. Sors à l’air libre et réessaie.',
      3: 'Signal GPS trop lent à arriver.',
    };
    // Un timeout est banal en course (tunnel, forêt) : on ne casse pas l'état.
    if (err.code === err.TIMEOUT) return;
    this.setState('error', messages[err.code] ?? err.message);
  }

  private async acquireWakeLock(): Promise<void> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      this.options.onWakeLock?.(false);
      return;
    }
    if (this.wakeLock && !this.wakeLock.released) return;

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.options.onWakeLock?.(true);
      this.wakeLock.addEventListener('release', () => this.options.onWakeLock?.(false));
    } catch {
      this.options.onWakeLock?.(false);
    }
  }

  private async releaseWakeLock(): Promise<void> {
    try {
      await this.wakeLock?.release();
    } catch {
      /* déjà relâché */
    }
    this.wakeLock = null;
    this.options.onWakeLock?.(false);
  }
}
