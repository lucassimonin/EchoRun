import { isNativeApp } from '@/lib/native/platform';
import { GeoEngine, type GeoEngineOptions } from './geo-engine';
import { NativeGeoEngine } from './native-geo-engine';

/**
 * Interface commune aux deux moteurs — c'est tout ce que LiveClient manipule.
 * Le choix web/natif est invisible pour lui.
 */
export interface IGeoEngine {
  start(): Promise<void>;
  stop(): void;
  seedConsumed(ids: readonly string[]): void;
  readonly pendingCount: number;
}

/**
 * Fabrique : renvoie le moteur natif dans l'app empaquetée (GPS en arrière-plan,
 * écran éteint possible), le moteur web sinon (watchPosition, premier plan).
 */
export function createGeoEngine(options: GeoEngineOptions): IGeoEngine {
  if (isNativeApp()) {
    return new NativeGeoEngine(options);
  }
  return new GeoEngine(options);
}
