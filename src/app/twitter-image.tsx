import { ImageResponse } from 'next/og';
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, OgImage } from '@/components/OgImage';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Même visuel que Open Graph. Fichier séparé parce que Next.js ne déduit pas
 * `twitter:image` de `opengraph-image` : sans lui, X/Twitter n'affiche
 * qu'un lien nu.
 */
export default function Image() {
  return new ImageResponse(<OgImage />, size);
}
