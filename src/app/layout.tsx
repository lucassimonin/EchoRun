import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AdSenseScript } from '@/components/ads/AdSenseScript';
import { ConsentModeDefaults } from '@/components/consent/ConsentModeDefaults';
import { ConsentProvider } from '@/components/consent/ConsentProvider';
import { CookieBanner } from '@/components/consent/CookieBanner';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { isValidAdSenseClientId } from '@/lib/adsense';
import { getAppSettings } from '@/lib/settings';
import { CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL, SITE_TAGLINE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME + ' — ' + SITE_TAGLINE.replace(/\.$/, ''),
    template: '%s · ' + SITE_NAME,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: SITE_NAME },
  formatDetection: { telephone: false },
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'sports',
  // Requêtes réellement visées, pas un empilement de mots-clés : les moteurs
  // n'utilisent plus la balise pour le classement, mais elle reste lue par
  // certains agrégateurs et par les aperçus de partage.
  keywords: [
    'encouragement vocal course',
    'message vocal marathon',
    'supporter coureur à distance',
    'GPX message vocal',
    'application marathon proches',
    'trail encouragement GPS',
  ],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME + ' — ' + SITE_TAGLINE.replace(/\.$/, ''),
    description: SITE_DESCRIPTION,
    // L'image vient de la convention de fichier app/opengraph-image.tsx.
    emails: [CONTACT_EMAIL],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME + ' — ' + SITE_TAGLINE.replace(/\.$/, ''),
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Autorise les extraits longs et les grandes vignettes : sans ça,
      // Google se limite à une miniature sur les résultats français.
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#FAF8F5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // La config AdSense vient du back-office : le loader n'est injecté que si la
  // régie est activée, correctement renseignée ET consentie.
  const settings = await getAppSettings();
  const clientId = settings.ads_enabled ? settings.adsense_client_id : null;

  // Aucune régie active = aucun cookie non essentiel = aucune bannière.
  const adsAvailable = isValidAdSenseClientId(clientId);

  return (
    <html lang="fr">
      <head>
        {/*
          Consent Mode doit être posé avant tout tag Google. `beforeInteractive`
          l'injecte dans le <head>, en amont du loader AdSense — qui n'est de
          toute façon monté qu'après un choix explicite de l'utilisateur.
        */}
        {adsAvailable ? <ConsentModeDefaults /> : null}
      </head>
      <body className="min-h-dvh antialiased">
        <ConsentProvider adsAvailable={adsAvailable}>
          {children}
          <CookieBanner />
          <AdSenseScript clientId={clientId} />
        </ConsentProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
