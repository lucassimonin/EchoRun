/** Tableau de commandes AdSense : c'est un Array qui porte aussi des drapeaux. */
interface AdsByGoogleQueue extends Array<unknown> {
  requestNonPersonalizedAds?: number;
  pauseAdRequests?: number;
}

// Completions de types absentes de lib.dom (selon la version de TypeScript).
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    adsbygoogle?: AdsByGoogleQueue;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export {};
