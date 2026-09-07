'use client';

import { useEffect, useRef, useState } from 'react';
import { isValidAdSenseClientId, isValidAdSenseSlotId } from '@/lib/adsense';
import { cx } from '@/lib/utils';

type Format = 'auto' | 'horizontal' | 'rectangle';

export interface AdSenseUnitProps {
  clientId: string | null;
  slotId: string | null;
  /** Format responsive AdSense. `auto` couvre 95 % des besoins. */
  format?: Format;
  /** Hauteur reservee avant remplissage, pour eviter tout saut de mise en page. */
  minHeight?: number;
  label?: string;
  className?: string;
}

/**
 * ============================================================================
 * <AdSenseUnit /> • bloc publicitaire integre a la charte SF Matcha
 * ============================================================================
 *
 * Garde-fous, dans l'ordre d'importance :
 *
 * 1. RIEN NE S'AFFICHE SI CE N'EST PAS CONFIGURE. clientId et slotId sont
 *    valides par regex : un champ mal rempli dans le BO ne casse pas la page
 *    et ne genere pas d'appel invalide (les appels invalides repetes sont un
 *    motif de suspension de compte AdSense).
 *
 * 2. UN SEUL PUSH PAR <ins>. React 18+ monte deux fois en Strict Mode ; un
 *    double push declenche "adsbygoogle.push() error: All ins elements in the
 *    DOM with class=adsbygoogle already have ads in them". On verrouille par
 *    ref ET en lisant l'attribut pose par le script Google.
 *
 * 3. REMONTAGE PROPRE SUR CHANGEMENT DE SLOT. On force une nouvelle instance
 *    de <ins> via une `key`, sinon Google refuse de re-remplir l'element.
 *
 * 4. PAS DE BOITE VIDE. Si Google ne remplit pas (inventaire, adblock), le
 *    conteneur se replie au lieu de laisser un trou dans la maquette.
 *
 * 5. HORS PRODUCTION, on affiche un placeholder : jamais d'impression de test,
 *    qui serait comptee comme trafic invalide.
 *
 * 6. RIEN AVANT LE CONSENTEMENT. Tant que l'utilisateur n'a pas repondu a la
 *    banniere, le loader n'est pas charge (cf. AdSenseScript) : pousser dans
 *    une file inexistante produirait une erreur console a chaque bloc, et
 *    laisserait un cadre vide dans la maquette.
 */
export function AdSenseUnit({
  clientId,
  slotId,
  format = 'auto',
  minHeight = 120,
  label = 'Publicite',
  className,
}: AdSenseUnitProps) {
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);
  const [status, setStatus] = useState<'idle' | 'filled' | 'unfilled'>('idle');

  const configured = isValidAdSenseClientId(clientId) && isValidAdSenseSlotId(slotId);
  const isProd = process.env.NODE_ENV === 'production';

  useEffect(() => {
    if (!configured || !isProd) return;
    const ins = insRef.current;
    if (!ins || pushedRef.current) return;
    if (ins.getAttribute('data-adsbygoogle-status')) return;

    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      pushedRef.current = false;
    }

    // Google positionne data-ad-status="filled" | "unfilled" apres reponse.
    const observer = new MutationObserver(() => {
      const value = ins.getAttribute('data-ad-status');
      if (value === 'filled') setStatus('filled');
      else if (value === 'unfilled') setStatus('unfilled');
    });
    observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => observer.disconnect();
  }, [configured, isProd, slotId]);

  if (!configured) return null;
  if (status === 'unfilled') return null;

  if (!isProd) {
    return (
      <div
        className={cx(
          'rounded-lg border-[3px] border-dashed border-black bg-off',
          'grid place-items-center text-[11px] uppercase tracking-[0.16em] text-charcoal-faint',
          className,
        )}
        style={{ minHeight }}
      >
        Emplacement AdSense · {slotId}
      </div>
    );
  }

  return (
    <aside
      className={cx('group', className)}
      aria-label={label}
      // Pas de titre visuel criard : un simple filet et une mention discrete,
      // conforme aux regles AdSense (la pub doit rester identifiable) sans
      // casser le calme de la page.
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-[0.18em] text-charcoal-faint/70">
          {label}
        </span>
        <span className="h-px flex-1 bg-charcoal/[0.07]" />
      </div>
      <div
        className="overflow-hidden rounded-lg border-[3px] border-black bg-off"
        style={{ minHeight: status === 'filled' ? undefined : minHeight }}
      >
        <ins
          key={slotId}
          ref={insRef}
          className="adsbygoogle block"
          style={{ display: 'block', minHeight }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
