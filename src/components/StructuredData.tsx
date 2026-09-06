import { CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site';

/**
 * ============================================================================
 * Données structurées (JSON-LD, schema.org)
 * ============================================================================
 *
 * Injectées via une balise inline plutôt que par le champ `other` des
 * métadonnées Next : le JSON-LD doit rester du JSON valide, et passer par
 * l'API de métadonnées l'échapperait.
 *
 * `JSON.stringify` suffit à neutraliser le contenu, mais on échappe en plus
 * les séquences `</` : c'est le seul motif capable de fermer prématurément la
 * balise <script> et d'ouvrir une injection.
 */
function JsonLd({ id, data }: { id: string; data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/** Identité du site et de l'éditeur. À rendre une seule fois, sur la landing. */
export function SiteJsonLd() {
  return (
    <>
      <JsonLd
        id="ld-website"
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': absoluteUrl('/#website'),
          url: SITE_URL,
          name: SITE_NAME,
          description: SITE_DESCRIPTION,
          inLanguage: 'fr-FR',
          publisher: { '@id': absoluteUrl('/#organization') },
        }}
      />
      <JsonLd
        id="ld-organization"
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': absoluteUrl('/#organization'),
          name: SITE_NAME,
          url: SITE_URL,
          logo: absoluteUrl('/icons/icon-512.png'),
          email: CONTACT_EMAIL,
          contactPoint: {
            '@type': 'ContactPoint',
            email: CONTACT_EMAIL,
            contactType: 'customer support',
            availableLanguage: ['fr'],
          },
        }}
      />
    </>
  );
}

/**
 * L'application elle-même.
 *
 * `WebApplication` et non `SoftwareApplication` : il n'y a rien à installer
 * depuis un store. Les deux offres décrivent honnêtement le modèle — gratuit
 * pour le coureur, payant au-delà de deux vocaux pour un proche.
 */
export function AppJsonLd({ extraMessagePriceCents }: { extraMessagePriceCents: number }) {
  return (
    <JsonLd
      id="ld-application"
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': absoluteUrl('/#application'),
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: 'HealthApplication',
        applicationSubCategory: 'Running',
        operatingSystem: 'Web (iOS, Android, desktop)',
        inLanguage: 'fr-FR',
        browserRequirements: 'Navigateur avec géolocalisation et micro (Safari 16+, Chrome 100+)',
        publisher: { '@id': absoluteUrl('/#organization') },
        offers: [
          {
            '@type': 'Offer',
            name: 'Coureur',
            description: 'Création de courses et lecture des messages, sans limite.',
            price: 0,
            priceCurrency: 'EUR',
          },
          {
            '@type': 'Offer',
            name: 'Message vocal supplémentaire',
            description: 'Au-delà des deux messages offerts par proche et par course.',
            price: (extraMessagePriceCents / 100).toFixed(2),
            priceCurrency: 'EUR',
          },
        ],
      }}
    />
  );
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * FAQ.
 *
 * Les entrées viennent de la même constante que le rendu de la page : une
 * FAQPage qui décrirait des questions absentes de la page est une raison de
 * rejet chez Google, et c'est exactement ce qui arrive quand les deux sont
 * saisies séparément.
 */
export function FaqJsonLd({ entries }: { entries: readonly FaqEntry[] }) {
  return (
    <JsonLd
      id="ld-faq"
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: entries.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
      }}
    />
  );
}

/** Le déroulé en trois étapes de la landing, en HowTo. */
export function HowToJsonLd() {
  return (
    <JsonLd
      id="ld-howto"
      data={{
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'Recevoir des messages vocaux de ses proches pendant une course',
        description:
          'Importer le tracé GPX de sa course, partager un lien, puis laisser le GPS déclencher les vocaux enregistrés par ses proches.',
        totalTime: 'PT3M',
        inLanguage: 'fr-FR',
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Importer son parcours',
            text: 'Déposer le fichier .gpx de la course, fourni par l’organisateur ou exporté depuis Strava, Garmin Connect, Komoot ou OpenRunner.',
            url: absoluteUrl('/#etape-1'),
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Partager le lien',
            text: 'Envoyer le lien unique à ses proches. Ils n’ont ni compte à créer ni application à installer : ils ouvrent, choisissent un point du parcours et enregistrent leur voix.',
            url: absoluteUrl('/#etape-2'),
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Courir',
            text: 'Le jour de la course, le téléphone annonce « Message de Camille » puis joue son vocal au kilomètre choisi, sans avoir besoin de réseau.',
            url: absoluteUrl('/#etape-3'),
          },
        ],
      }}
    />
  );
}
