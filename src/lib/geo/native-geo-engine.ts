import { registerPlugin } from '@capacitor/core';
import type { TrackPoint } from '@/types';
import { FenceDetector, type RawPosition } from './fence-detector';
import type { GeoEngineOptions } from './geo-engine';

/**
 * ============================================================================
 * NativeGeoEngine • moteur GPS NATIF (app Capacitor, arrière-plan)
 * ============================================================================
 *
 * Même interface publique que GeoEngine (start/stop/seedConsumed/pendingCount)
 * et MÊME logique de déclenchement (FenceDetector partagé). Seule la source de
 * position change : au lieu de `watchPosition` (premier plan uniquement), on
 * s'abonne au plugin Capacitor de géolocalisation en arrière-plan, qui continue
 * à fournir des positions écran verrouillé.
 *
 * Le plugin est référencé par `registerPlugin` (résolu à l'exécution dans le
 * webview natif) : rien n'est importé du paquet du plugin au build, donc le
 * bundle web reste intact et compile sans le plugin installé. Le code natif du
 * plugin est ajouté sur la machine du développeur (`npx cap sync`).
 *
 * Plugin ciblé : @capacitor-community/background-geolocation
 *   addWatcher({ backgroundMessage, distanceFilter }, cb) -> id
 *   removeWatcher({ id })
 */

interface BackgroundLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  time: number | null;
}

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (location: BackgroundLocation | undefined, error?: { code?: string }) => void,
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
}

const BackgroundGeolocation =
  registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export class NativeGeoEngine {
  private readonly options: GeoEngineOptions;
  private readonly detector: FenceDetector;
  private watcherId: string | null = null;

  constructor(options: GeoEngineOptions) {
    this.options = options;
    this.detector = new FenceDetector(options.track, options.fences);
  }

  seedConsumed(ids: readonly string[]): void {
    this.detector.seedConsumed(ids);
  }

  get pendingCount(): number {
    return this.detector.pendingCount;
  }

  async start(): Promise<void> {
    if (this.watcherId !== null) return;
    this.options.onState?.('acquiring');
    // Pas de Wake Lock en natif : la localisation de fond + le keep-alive audio
    // (géré par LiveClient) prennent le relais, écran éteint autorisé.
    this.options.onWakeLock?.(false);

    try {
      this.watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: 'Course en cours',
          backgroundMessage: 'EchoRun suit ta position pour déclencher les messages.',
          requestPermissions: true,
          // Filtrage OS : on ne veut pas des dizaines de fixes/s. Le détecteur
          // gère de toute façon les fixes rapprochés.
          distanceFilter: 8,
        },
        (location, error) => {
          if (error) {
            this.options.onState?.(
              'error',
              error.code === 'NOT_AUTHORIZED'
                ? 'Autorisation de localisation « Toujours » requise dans les réglages.'
                : 'Signal GPS indisponible.',
            );
            return;
          }
          if (!location) return;
          this.handleLocation(location);
        },
      );
    } catch {
      this.options.onState?.('error', 'Impossible de démarrer la localisation en arrière-plan.');
    }
  }

  stop(): void {
    if (this.watcherId !== null) {
      const id = this.watcherId;
      this.watcherId = null;
      void BackgroundGeolocation.removeWatcher({ id }).catch(() => undefined);
    }
    this.options.onState?.('idle');
  }

  private handleLocation(location: BackgroundLocation): void {
    const raw: RawPosition = {
      lat: location.latitude,
      lng: location.longitude,
      accuracyM: location.accuracy ?? 30,
      speedMps: location.speed,
      timestamp: location.time ?? Date.now(),
    };

    this.options.onState?.('tracking');
    const result = this.detector.feed(raw);
    this.options.onPosition?.(result.snapshot);
    for (const t of result.triggers) {
      this.options.onTrigger?.(t.fence, t.reason, result.snapshot);
    }
  }
}

// Le tracé n'est utilisé que par le détecteur, via les options : ce type
// n'apporte rien de plus ici, mais on garde l'import pour l'alignement.
export type { TrackPoint };
