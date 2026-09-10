import { defineRouting } from 'next-intl/routing';

/**
 * i18n EchoRun : français (défaut, sans préfixe) et anglais (sous /en).
 * `localePrefix: 'as-needed'` → FR reste sur les URLs actuelles, EN prend /en.
 * `localeDetection` → à la 1re visite, on choisit selon la langue du navigateur.
 */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
