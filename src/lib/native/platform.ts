import { Capacitor } from '@capacitor/core';

/**
 * Détection de l'environnement d'exécution.
 *
 * `@capacitor/core` est web-safe : sur le web classique, `isNativePlatform()`
 * renvoie false et rien de natif n'est chargé. Dans le webview de l'app
 * empaquetée (iOS/Android), il renvoie true et les plugins natifs deviennent
 * disponibles via `registerPlugin`.
 */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  try {
    const p = Capacitor.getPlatform();
    return p === 'ios' || p === 'android' ? p : 'web';
  } catch {
    return 'web';
  }
}
