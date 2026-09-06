'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearConsent,
  pushConsentUpdate,
  readConsent,
  writeConsent,
  type MaybeConsent,
} from '@/lib/consent';

interface ConsentContextValue {
  /** `null` tant qu'aucun choix n'a été exprimé. */
  consent: MaybeConsent;
  /** `false` pendant le premier rendu : évite tout flash de bannière au SSR. */
  hydrated: boolean;
  /** La régie est-elle activée et configurée côté back-office ? */
  adsAvailable: boolean;
  /** La bannière doit-elle être visible ? */
  shouldAsk: boolean;
  /** Le panneau de préférences est-il ouvert ? */
  preferencesOpen: boolean;
  decide: (advertising: boolean) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  /** Réinitialise le choix : la bannière réapparaît. */
  reset: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({
  children,
  adsAvailable,
}: {
  children: ReactNode;
  adsAvailable: boolean;
}) {
  const [consent, setConsent] = useState<MaybeConsent>(null);
  const [hydrated, setHydrated] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Lecture au montage uniquement : `localStorage` n'existe pas au SSR.
  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    setHydrated(true);
    // Rejoue le choix vers le tag Google : au rechargement, les valeurs par
    // défaut sont repassées à « denied », il faut donc les relever.
    if (stored) pushConsentUpdate(stored.advertising);
  }, []);

  const decide = useCallback((advertising: boolean) => {
    const next = writeConsent(advertising);
    setConsent(next);
    setPreferencesOpen(false);
    pushConsentUpdate(advertising);
  }, []);

  const reset = useCallback(() => {
    clearConsent();
    setConsent(null);
    setPreferencesOpen(false);
    // Retrait du consentement : on redescend immédiatement les signaux.
    pushConsentUpdate(false);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      hydrated,
      adsAvailable,
      // Pas de régie active = aucun cookie non essentiel = aucune bannière à
      // afficher. Une bannière sans finalité serait du bruit, pas de la
      // conformité.
      shouldAsk: hydrated && adsAvailable && consent === null,
      preferencesOpen,
      decide,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      reset,
    }),
    [adsAvailable, consent, decide, hydrated, preferencesOpen, reset],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent doit être utilisé à l’intérieur de <ConsentProvider>.');
  }
  return context;
}

/**
 * Variante tolérante, pour les composants susceptibles d'être montés hors du
 * provider (tests, pages isolées) : renvoie un état « aucun consentement »
 * plutôt que de lever.
 */
export function useOptionalConsent(): ConsentContextValue | null {
  return useContext(ConsentContext);
}
