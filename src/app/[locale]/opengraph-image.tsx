import { ImageResponse } from 'next/og';
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, OgImage } from '@/components/OgImage';

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** S'applique à toutes les routes qui ne définissent pas leur propre image. */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return new ImageResponse(<OgImage locale={locale} />, size);
}
