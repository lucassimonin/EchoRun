/** Concatene des classes conditionnelles sans dependance externe. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Locale -> tag BCP-47 pour Intl. Défaut français. */
function intlLocale(locale?: string): string {
  return locale === 'en' ? 'en-GB' : 'fr-FR';
}

/** Slug court, non devinable, pour les liens de partage (alphabet sans ambiguite). */
export function generateShareSlug(length = 12): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function formatDistance(metres: number, locale?: string): string {
  const decimal = locale === 'en' ? '.' : ',';
  if (metres < 1000) return Math.round(metres) + ' m';
  const km = metres / 1000;
  return km.toFixed(km < 10 ? 2 : 1).replace('.', decimal) + ' km';
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}

export function formatPrice(cents: number, locale?: string, currency = 'EUR'): string {
  return new Intl.NumberFormat(intlLocale(locale), { style: 'currency', currency }).format(
    cents / 100,
  );
}

export function formatRaceDate(iso: string | null, locale?: string): string {
  if (!iso) return locale === 'en' ? 'Date to be set' : 'Date à définir';
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

/** Petit utilitaire d'attente, utilise par les retries et le player. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Nettoyage defensif des pseudos saisis par les proches : on retire les
 * caracteres de controle (dont les injections de saut de ligne), on compacte
 * les espaces et on borne la longueur.
 */
export function sanitizeName(raw: string): string {
  return raw
    .replace(/\p{Cc}|\p{Cf}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

/** Formate une durée en secondes façon chronomètre : « 1 h 45 » ou « 45 min ». */
export function formatClock(totalSeconds: number, locale?: string): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (locale === 'en') {
    if (h > 0) return h + 'h ' + String(m).padStart(2, '0');
    return m + ' min';
  }
  if (h > 0) return h + ' h ' + String(m).padStart(2, '0');
  return m + ' min';
}

/** Chronomètre précis « h:mm:ss » ou « mm:ss » pour l'écran de course. */
export function formatStopwatch(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? h + ':' + mm + ':' + ss : mm + ':' + ss;
}
