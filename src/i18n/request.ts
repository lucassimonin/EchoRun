import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

/**
 * Les messages sont répartis en plusieurs fichiers par locale pour rester
 * lisibles, fusionnés au niveau des namespaces (clés de premier niveau
 * disjointes) :
 *  - `<locale>.json`         : chrome commun, accueil, connexion, offline.
 *  - `<locale>.content.json` : pages éditoriales longues (guide, mentions, RGPD).
 *  - `<locale>.app.json`     : espace coureur, dépôt de message, admin.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const [core, content, app] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/${locale}.content.json`),
    import(`../../messages/${locale}.app.json`),
  ]);

  return {
    locale,
    messages: { ...core.default, ...content.default, ...app.default },
  };
});
