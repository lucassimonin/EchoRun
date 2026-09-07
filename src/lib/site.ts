/** Constantes d'identité du site, partagées par les métadonnées, robots.txt,
 *  le sitemap et les données structurées. Un seul endroit à corriger. */

export const SITE_NAME = 'EchoRun';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export const SITE_TAGLINE = 'Les voix de tes proches, au bon kilomètre.';

export const SITE_DESCRIPTION =
  'Tes proches déposent un message vocal sur ton parcours. Le jour J, ton téléphone le déclenche au bon kilomètre • sans réseau, sans rien à lire.';

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? 'lsimonin2@gmail.com';

/**
 * Routes publiques indexables. Sert à la fois au sitemap et à robots.txt :
 * ajouter une page ici la référence partout, plutôt que de l'oublier dans
 * l'un des deux fichiers.
 */
export const PUBLIC_ROUTES = [
  { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
  { path: '/comment-ca-marche', changeFrequency: 'monthly' as const, priority: 0.8 },
  { path: '/confidentialite', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/mentions-legales', changeFrequency: 'yearly' as const, priority: 0.3 },
];

/**
 * Préfixes à ne jamais indexer.
 *
 * `/e/` est le plus important : un lien de partage est un secret porteur.
 * S'il finissait dans l'index Google, n'importe qui pourrait déposer un vocal
 * sur la course d'un inconnu.
 */
export const PRIVATE_PREFIXES = ['/api/', '/app/', '/admin', '/auth/', '/e/', '/login', '/offline'];

export function absoluteUrl(path = ''): string {
  return SITE_URL + (path.startsWith('/') ? path : '/' + path);
}
