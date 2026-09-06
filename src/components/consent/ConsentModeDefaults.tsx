/**
 * ============================================================================
 * Valeurs par défaut de Google Consent Mode v2
 * ============================================================================
 *
 * ORDRE CRITIQUE : ces commandes doivent atteindre le `dataLayer` AVANT le
 * chargement de n'importe quel tag Google.
 *
 * D'où une balise <script> inline brute, rendue directement dans le <head> du
 * layout racine, et NON un `next/script` en `beforeInteractive` :
 *
 *   - une balise inline est émise verbatim dans le HTML initial, en tête de
 *     document. L'ordre est garanti par la position dans le markup, point ;
 *   - `beforeInteractive` repose sur une mécanique de hoisting propre à
 *     Next.js, réservée au layout racine, et sur laquelle il serait imprudent
 *     de parier pour un script dont l'ordre EST la fonction. C'est aussi ce que
 *     signale la règle ESLint `no-before-interactive-script-outside-document`.
 *
 * Le script pèse ~300 octets : le coût d'un inline est nul comparé au risque
 * d'un tag Google qui démarrerait avant que le refus soit déclaré.
 *
 * Tout est refusé par défaut — position exigée en Europe, et seule façon de
 * rendre la bannière véridique.
 */

const CONSENT_MODE_DEFAULTS = `
window.dataLayer=window.dataLayer||[];
window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
window.gtag('consent','default',{
ad_storage:'denied',
ad_user_data:'denied',
ad_personalization:'denied',
analytics_storage:'denied',
wait_for_update:500
});
`.trim();

export function ConsentModeDefaults() {
  return (
    <script
      id="google-consent-mode-defaults"
      // Contenu constant défini ci-dessus : aucune donnée utilisateur n'y entre.
      dangerouslySetInnerHTML={{ __html: CONSENT_MODE_DEFAULTS }}
    />
  );
}
