/**
 * ============================================================================
 * Consentement cookies — état et persistance
 * ============================================================================
 *
 * Le service n'a qu'UNE seule catégorie non essentielle : la publicité. Pas de
 * mesure d'audience tierce, pas de réseaux sociaux, pas de heatmap. La bannière
 * reste donc volontairement simple — c'est aussi ce qui la rend honnête.
 *
 * Règles CNIL appliquées ici :
 *   - aucun cookie publicitaire avant un choix explicite ;
 *   - refuser doit être aussi simple qu'accepter (deux boutons de même niveau) ;
 *   - le choix est révocable à tout moment (lien en pied de page) ;
 *   - absence de choix = refus. Il n'y a donc pas de croix de fermeture.
 *
 * Le choix est stocké dans `localStorage` plutôt que dans un cookie : rien
 * n'est envoyé au serveur, et on évite le paradoxe du cookie de consentement.
 */

export const CONSENT_STORAGE_KEY = 'echorun:consent';

/**
 * Incrémenter cette version force une nouvelle demande de consentement.
 * À faire dès qu'une finalité change (nouveau sous-traitant, mesure d'audience…).
 */
export const CONSENT_VERSION = 1;

export interface ConsentState {
  version: number;
  /** Publicité personnalisée : cookies Google et partenaires. */
  advertising: boolean;
  /** Horodatage du choix — preuve de consentement exigée par le RGPD. */
  decidedAt: string;
}

/** `null` = aucun choix exprimé : la bannière doit s'afficher. */
export type MaybeConsent = ConsentState | null;

export function readConsent(): MaybeConsent {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (typeof parsed.advertising !== 'boolean') return null;

    return {
      version: CONSENT_VERSION,
      advertising: parsed.advertising,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : new Date().toISOString(),
    };
  } catch {
    // localStorage indisponible (Safari en navigation privée, stockage bloqué).
    // On traite comme une absence de choix : aucune pub ne sera chargée.
    return null;
  }
}

export function writeConsent(advertising: boolean): ConsentState {
  const state: ConsentState = {
    version: CONSENT_VERSION,
    advertising,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* non bloquant : la session courante respectera le choix en mémoire */
  }
  return state;
}

export function clearConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Signaux Google Consent Mode v2.
 *
 * `ad_user_data` et `ad_personalization` sont obligatoires depuis mars 2024
 * pour le trafic EEE : sans eux, Google cesse de servir des annonces
 * personnalisées ET dégrade la mesure. Les omettre coûte du revenu, ce n'est
 * pas un détail de conformité.
 */
export function consentModeSignals(advertising: boolean) {
  const value = advertising ? 'granted' : 'denied';
  return {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    // Aucune mesure d'audience tierce sur le service : refusé en permanence.
    analytics_storage: 'denied',
  } as const;
}

/** Pousse une mise à jour de consentement vers le tag Google, s'il est présent. */
export function pushConsentUpdate(advertising: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.gtag?.('consent', 'update', consentModeSignals(advertising));
  } catch {
    /* le tag n'est pas encore chargé : les valeurs par défaut restent en place */
  }
}
