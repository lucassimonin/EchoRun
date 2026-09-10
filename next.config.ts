import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `standalone` uniquement pour le build Docker de prod (cf. Dockerfile).
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        // Le service worker doit pouvoir controler toute l'origine.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Geoloc + micro sont indispensables ; on refuse tout le reste.
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), microphone=(self), camera=(), payment=(self)',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
