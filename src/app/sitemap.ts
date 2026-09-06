import type { MetadataRoute } from 'next';
import { PUBLIC_ROUTES, absoluteUrl } from '@/lib/site';

/**
 * /sitemap.xml
 *
 * Uniquement les pages publiques et stables. Les courses ne sont
 * volontairement PAS listées : leur URL est un secret partagé, pas un contenu
 * à référencer.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
