/**
 * Pousse un événement dans le dataLayer de Google Tag Manager.
 *
 * SSR-safe (no-op côté serveur). GTM, s'il est chargé, écoute ces événements
 * pour déclencher des balises (conversions Google Ads, GA4…) sans qu'on ait à
 * redéployer le code : il suffit de créer un déclencheur « Événement
 * personnalisé » sur le nom passé ici.
 *
 * Événements émis par EchoRun :
 *  - 'login_code_requested' : un visiteur demande un code de connexion.
 *  - 'race_created'         : une course vient d'être créée (param: race_mode).
 *  - 'purchase'             : déblocage payé (params: value, currency).
 */
export function trackEvent(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
}
