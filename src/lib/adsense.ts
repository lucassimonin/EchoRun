/**
 * Validation des identifiants AdSense.
 *
 * Isolée dans lib/ pour être importable sans franchir la frontière
 * serveur/client : le back-office valide à la saisie, le loader valide au
 * rendu, l'unité valide avant de pousser.
 */

const CLIENT_ID_RE = /^ca-pub-\d{10,20}$/;
const SLOT_ID_RE = /^\d{6,20}$/;

export function isValidAdSenseClientId(value: string | null | undefined): value is string {
  return typeof value === 'string' && CLIENT_ID_RE.test(value.trim());
}

export function isValidAdSenseSlotId(value: string | null | undefined): value is string {
  return typeof value === 'string' && SLOT_ID_RE.test(value.trim());
}
