'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useConsent } from './ConsentProvider';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Surface';
import { cx } from '@/lib/utils';

/**
 * ============================================================================
 * Bannière de consentement
 * ============================================================================
 *
 * Choix d'interface, tous dictés par les lignes directrices CNIL :
 *
 *  - « Tout refuser » et « Tout accepter » ont le MÊME poids visuel. Un refus
 *    grisé ou relégué en lien invalide le consentement.
 *  - Aucune croix de fermeture : fermer sans choisir vaudrait acceptation
 *    implicite. Tant qu'aucun bouton n'est touché, rien n'est chargé.
 *  - Pas de superposition modale bloquante : le contenu du site reste
 *    consultable et navigable pendant le choix.
 *  - Le détail des finalités est accessible en un geste, sans quitter la page.
 *
 * La bannière ne s'affiche pas du tout si la régie est désactivée dans le
 * back-office : sans cookie non essentiel, il n'y a rien à consentir.
 */
export function CookieBanner() {
  const { shouldAsk, preferencesOpen, decide, openPreferences, closePreferences } = useConsent();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [detailed, setDetailed] = useState(false);
  const [advertising, setAdvertising] = useState(false);

  const open = shouldAsk || preferencesOpen;

  // On n'interrompt jamais une course pour parler de cookies. L'écran de course
  // n'affiche aucune publicité de toute façon : la demande peut attendre.
  const isRacing = /^\/app\/races\/[^/]+\/live$/.test(pathname ?? '');

  useEffect(() => {
    if (preferencesOpen) setDetailed(true);
  }, [preferencesOpen]);

  useEffect(() => {
    if (open && !isRacing) containerRef.current?.focus();
  }, [open, isRacing]);

  if (!open || isRacing) return null;

  const close = () => {
    setDetailed(false);
    closePreferences();
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      tabIndex={-1}
      className={cx(
        'fixed inset-x-0 bottom-0 z-50 outline-none',
        'px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6',
      )}
    >
      <div
        className={cx(
          'mx-auto w-full max-w-2xl rounded-lg border-[3px] border-black bg-paper',
          'p-6 shadow-[6px_6px_0_0_#000] animate-rise sm:p-7',
        )}
      >
        <h2
          id="cookie-banner-title"
          className="text-[16.5px] font-bold uppercase tracking-[-0.01em] text-charcoal"
        >
          Un mot sur les cookies
        </h2>

        <p
          id="cookie-banner-description"
          className="mt-2.5 text-[13.5px] leading-relaxed text-charcoal-muted"
        >
          Ce site affiche des publicités, qui financent la gratuité du service pour les coureurs.
          Elles peuvent déposer des cookies pour être personnalisées.{' '}
          <strong className="font-bold text-charcoal">
            Si tu refuses, tu verras des publicités non personnalisées et aucun cookie
            publicitaire ne sera déposé.
          </strong>{' '}
          Le service fonctionne à l’identique dans les deux cas.
        </p>

        <p className="mt-2.5 text-[12.5px] leading-relaxed text-charcoal-faint">
          Nous n’utilisons aucun outil de mesure d’audience tiers. Ta position GPS pendant une
          course ne quitte jamais ton téléphone •{' '}
          <Link href="/confidentialite" className="underline underline-offset-2">
            voir la politique de confidentialité
          </Link>
          .
        </p>

        {/* --------------------------------------------------- détail par finalité */}
        {detailed ? (
          <div className="mt-5 animate-rise">
            <Divider />
            <div className="space-y-4 py-5">
              <Purpose
                title="Strictement nécessaires"
                description="Session de connexion, jeton de dépôt de vocal, mémorisation de ce choix. Sans eux, le service ne fonctionne pas."
                locked
              />
              <Purpose
                title="Publicité personnalisée"
                description="Google AdSense et ses partenaires, pour adapter les annonces à tes centres d’intérêt. Refuser n’enlève pas les publicités : elles deviennent contextuelles."
                checked={advertising}
                onChange={setAdvertising}
                id="purpose-advertising"
              />
            </div>
            <Divider />
          </div>
        ) : null}

        {/* ------------------------------------------------------------- actions */}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse">
          {detailed ? (
            <Button size="md" className="sm:flex-1" onClick={() => decide(advertising)}>
              Enregistrer mes choix
            </Button>
          ) : (
            <Button size="md" className="sm:flex-1" onClick={() => decide(true)}>
              Tout accepter
            </Button>
          )}

          {/* Même variante, même taille, même largeur que l'acceptation. */}
          <Button
            size="md"
            variant="secondary"
            className="sm:flex-1"
            onClick={() => decide(false)}
          >
            Tout refuser
          </Button>

          {!detailed ? (
            <Button
              size="md"
              variant="ghost"
              className="sm:flex-none"
              onClick={() => {
                setDetailed(true);
                openPreferences();
              }}
            >
              Personnaliser
            </Button>
          ) : (
            <Button size="md" variant="ghost" className="sm:flex-none" onClick={close}>
              Annuler
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Purpose({
  title,
  description,
  locked,
  checked,
  onChange,
  id,
}: {
  title: string;
  description: string;
  locked?: boolean;
  checked?: boolean;
  onChange?: (next: boolean) => void;
  id?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0">
        <p className="text-[13.5px] font-bold text-charcoal">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-charcoal-faint">{description}</p>
      </div>

      {locked ? (
        <span className="mt-0.5 shrink-0 rounded-md border-2 border-black bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-black">
          Toujours actifs
        </span>
      ) : (
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={!!checked}
          aria-label={title}
          onClick={() => onChange?.(!checked)}
          className={cx(
            'relative mt-0.5 h-6 w-11 shrink-0 rounded-md border-2 border-black transition-colors duration-200',
            checked ? 'bg-neon' : 'bg-white',
          )}
        >
          <span
            className={cx(
              'absolute top-1/2 size-4 -translate-y-1/2 rounded-sm bg-black transition-transform duration-200',
              checked ? 'translate-x-[24px]' : 'translate-x-[3px]',
            )}
          />
        </button>
      )}
    </div>
  );
}
