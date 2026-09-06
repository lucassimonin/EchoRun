import type { MetadataRoute } from 'next';
import { PRIVATE_PREFIXES, absoluteUrl } from '@/lib/site';

/**
 * /robots.txt
 *
 * Généré plutôt qu'écrit en dur : la liste des préfixes privés vit dans
 * lib/site.ts et sert aussi au sitemap, donc les deux ne peuvent pas diverger.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PREFIXES,
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl(),
  };
}
