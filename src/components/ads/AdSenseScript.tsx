'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { useOptionalConsent } from '@/components/consent/ConsentProvider';
import { isValidAdSenseClientId } from '@/lib/adsense';

/**
 * ============================================================================
 * Loader AdSense — piloté par le consentement
 * ============================================================================
 *
 * Trois états, trois comportements :
 *
 *  1. AUCUN CHOIX EXPRIMÉ → le script n'est pas chargé du tout. C'est la seule
 *     lecture défendable de la directive ePrivacy : pas de requête vers Google
 *     avant un acte positif de l'utilisateur.
 *
 *  2. REFUS → le script est chargé, mais Consent Mode est resté sur `denied` et
 *     `requestNonPersonalizedAds` est armé. Google sert alors des annonces
 *     contextuelles sans déposer de cookie publicitaire. Le refus ne fait donc
 *     pas disparaître le revenu, il le diminue — c'est ce qui rend le modèle
 *     tenable tout en étant conforme.
 *
 *  3. ACCEPTATION → Consent Mode passe en `granted` (cf. ConsentProvider) et
 *     les annonces sont personnalisées.
 *
 * `afterInteractive` : le script pèse ~150 ko et ne doit pas peser sur le LCP
 * de la landing — un critère de qualité qu'AdSense évalue lui-même.
 */
export function AdSenseScript({ clientId }: { clientId: string | null }) {
  const consent = useOptionalConsent();
  const advertising = consent?.consent?.advertising ?? null;
  const previousRef = useRef<boolean | null>(null);

  const configured = isValidAdSenseClientId(clientId);

  /**
   * Un changement d'avis APRÈS le chargement du script exige un rechargement.
   *
   * Google fige les signaux au moment où il demande les annonces : sans ça, un
   * utilisateur qui refuse puis accepte resterait servi en non-personnalisé
   * jusqu'à sa prochaine navigation — du revenu perdu alors qu'il a consenti.
   * L'inverse est plus grave encore : accepter puis refuser laisserait des
   * annonces personnalisées à l'écran.
   */
  useEffect(() => {
    if (!configured || advertising === null) return;

    const previous = previousRef.current;
    previousRef.current = advertising;

    if (previous !== null && previous !== advertising) {
      window.location.reload();
    }
  }, [advertising, configured]);

  if (!configured || advertising === null) return null;

  // Écriture volontaire en phase de rendu : il s'agit d'un drapeau global
  // idempotent qui DOIT être posé avant que next/script n'injecte la balise
  // (ce qui se produit après le commit). Un useEffect ne garantirait pas cet
  // ordre par rapport à l'effet de <Script>.
  if (typeof window !== 'undefined') {
    const queue = (window.adsbygoogle = window.adsbygoogle ?? []);
    if (advertising) {
      // Remise à zéro explicite : le drapeau a pu être armé plus tôt dans la
      // même session par un refus. Le laisser en place annulerait l'accord.
      delete queue.requestNonPersonalizedAds;
    } else {
      queue.requestNonPersonalizedAds = 1;
    }
  }

  return (
    <Script
      id="adsbygoogle-loader"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      // Sans consentement connu côté Google, on force le non-personnalisé.
      data-npa-on-unknown-consent={advertising ? undefined : 'true'}
      src={
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
        encodeURIComponent(clientId)
      }
    />
  );
}
