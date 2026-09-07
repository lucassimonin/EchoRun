'use client';

import Script from 'next/script';
import { isValidAdSenseClientId } from '@/lib/adsense';

/**
 * Loader AdSense — chargement direct.
 *
 * Le consentement est géré par la CMP certifiée de Google (Privacy & messaging),
 * activée dans le compte AdSense : c'est elle qui affiche le message RGPD et
 * pilote Consent Mode. On ne recharge donc plus le script en fonction d'une
 * bannière maison ; il suffit qu'il soit présent pour que la CMP s'affiche.
 *
 * `afterInteractive` : le script pèse ~150 ko et ne doit pas peser sur le LCP.
 */
export function AdSenseScript({ clientId }: { clientId: string | null }) {
  if (!clientId || !isValidAdSenseClientId(clientId)) return null;

  return (
    <Script
      id="adsbygoogle-loader"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
        encodeURIComponent(clientId)
      }
    />
  );
}
