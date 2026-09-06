'use client';

import { useOptionalConsent } from './ConsentProvider';
import { cx } from '@/lib/utils';

/**
 * Point d'entrée pour revenir sur son choix — exigence RGPD : le retrait doit
 * être aussi simple que le consentement. Placé en pied de page et sur la page
 * de confidentialité.
 *
 * Ne s'affiche que si la régie est active : sinon il n'y a aucun choix à gérer.
 */
export function ManageCookiesButton({
  className,
  label = 'Gérer les cookies',
}: {
  className?: string;
  label?: string;
}) {
  const consent = useOptionalConsent();
  if (!consent?.adsAvailable) return null;

  return (
    <button
      type="button"
      onClick={consent.openPreferences}
      className={cx('text-left transition-colors hover:text-charcoal', className)}
    >
      {label}
    </button>
  );
}
