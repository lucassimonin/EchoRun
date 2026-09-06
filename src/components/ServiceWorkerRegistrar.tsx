'use client';

import { useEffect } from 'react';

/**
 * Enregistre le service worker. Uniquement en production : en dev, un SW
 * actif sert des bundles perimes et fait perdre un temps considerable.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    };

    // Apres le load : ne pas concurrencer le rendu initial.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
