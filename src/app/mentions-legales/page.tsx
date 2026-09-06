import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/marketing/ContentPage';

export const metadata: Metadata = {
  title: 'Mentions légales et conditions d’utilisation',
  description:
    'Éditeur, hébergeur, conditions générales d’utilisation, propriété intellectuelle et responsabilité du service EchoRun.',
  alternates: { canonical: '/mentions-legales' },
};

const CONTACT = process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? 'lsimonin2@gmail.com';
const ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? 'EchoRun';

export default function LegalPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Mentions légales et conditions d’utilisation"
      lede="Qui édite ce service, qui l’héberge, et les règles du jeu pour l’utiliser."
      updatedAt="4 septembre 2026"
    >
      <h2>Éditeur du site</h2>
      <p>
        <strong>{ENTITY}</strong>
        <br />
        {/* TODO avant mise en production : compléter avec les mentions obligatoires. */}
        Forme juridique&nbsp;: à compléter
        <br />
        Siège social&nbsp;: à compléter
        <br />
        RCS / SIREN&nbsp;: à compléter
        <br />
        TVA intracommunautaire&nbsp;: à compléter
        <br />
        Directeur de la publication&nbsp;: à compléter
        <br />
        Contact&nbsp;: <a href={'mailto:' + CONTACT}>{CONTACT}</a>
      </p>

      <h2>Hébergement</h2>
      <p>
        L’application est hébergée par <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133,
        Covina, CA 91723, États-Unis.
        <br />
        La base de données, l’authentification et les fichiers audio sont hébergés par{' '}
        <strong>Supabase</strong>, sur une infrastructure située dans l’Union européenne.
      </p>

      <h2>Conditions générales d’utilisation</h2>

      <h3>1. Objet</h3>
      <p>
        EchoRun est un service permettant à un coureur de partager le tracé d’une course afin que
        ses proches y déposent des messages vocaux, déclenchés par géolocalisation pendant
        l’épreuve. L’utilisation du service implique l’acceptation sans réserve des présentes
        conditions.
      </p>

      <h3>2. Accès au service</h3>
      <p>
        La création d’un compte coureur est gratuite et nécessite une adresse e-mail valide. Le dépôt
        d’un message vocal par un proche ne nécessite aucun compte. Le service est fourni «&nbsp;en
        l’état&nbsp;», accessible 7&nbsp;jours sur 7 sous réserve des opérations de maintenance et
        des aléas techniques inhérents à Internet.
      </p>

      <h3>3. Tarifs et paiement</h3>
      <p>
        Le service est gratuit pour le coureur. Chaque proche dispose de deux messages vocaux
        offerts par course&nbsp;; au-delà, chaque message supplémentaire est facturé au tarif
        indiqué avant paiement, à l’unité, sans abonnement ni reconduction. Les paiements sont
        opérés par Stripe. Une facture est disponible sur demande.
      </p>
      <p>
        <strong>Droit de rétractation.</strong> S’agissant d’un contenu numérique fourni
        immédiatement, l’acheteur reconnaît, en validant son achat, renoncer à son droit de
        rétractation de quatorze jours dès l’enregistrement effectif du message. Un crédit acheté et
        non utilisé est remboursable sur simple demande dans les quatorze jours.
      </p>

      <h3>4. Contenu déposé par les utilisateurs</h3>
      <p>
        Chaque personne déposant un message vocal reste seule responsable de son contenu. Sont
        strictement interdits&nbsp;: les propos injurieux, diffamatoires, haineux, menaçants, à
        caractère sexuel, incitant à la violence ou à la discrimination, ainsi que tout contenu
        portant atteinte aux droits de tiers, notamment l’utilisation d’enregistrements musicaux
        protégés.
      </p>
      <p>
        Le coureur destinataire peut supprimer à tout moment un message reçu et signaler un contenu
        abusif. Nous nous réservons le droit de retirer sans préavis tout contenu signalé comme
        manifestement illicite et de bloquer l’accès au service concerné.
      </p>

      <h3>5. Sécurité pendant la pratique sportive</h3>
      <p>
        L’utilisation du service pendant une activité sportive relève de la seule responsabilité de
        l’utilisateur. Il lui appartient de rester attentif à son environnement, de respecter le
        règlement de l’épreuve à laquelle il participe — certains organisateurs interdisent le port
        d’écouteurs — et le code de la route. Nous recommandons des écouteurs laissant passer les
        sons extérieurs.
      </p>

      <h3>6. Limitation de responsabilité</h3>
      <p>
        Le déclenchement des messages dépend de la qualité du signal GPS, du matériel et du système
        d’exploitation de l’utilisateur, ainsi que du respect des consignes de préparation
        (téléchargement préalable, application au premier plan, écran actif). Nous ne garantissons
        pas que chaque message sera lu au mètre près, ni qu’aucun message ne sera manqué. Notre
        responsabilité ne saurait être engagée en cas de non-déclenchement, de contre-performance
        sportive, de décharge de batterie ou de dommage indirect.
      </p>

      <h3>7. Propriété intellectuelle</h3>
      <p>
        La marque EchoRun, le nom de domaine, l’interface, les textes et le code source sont la
        propriété exclusive de l’éditeur. Toute reproduction non autorisée est interdite. Les
        utilisateurs conservent l’intégralité des droits sur les messages vocaux qu’ils déposent et
        n’accordent à l’éditeur qu’une licence technique, strictement limitée à l’hébergement et à
        la diffusion du message au coureur destinataire.
      </p>
      <p>
        Les fonds cartographiques sont fournis par OpenStreetMap (licence ODbL) et CARTO. Les tracés
        GPX importés restent la propriété de leurs auteurs ou organisateurs.
      </p>

      <h3>8. Suspension et résiliation</h3>
      <p>
        L’utilisateur peut supprimer son compte à tout moment depuis son espace ou par simple
        demande. Nous pouvons suspendre un compte en cas de manquement grave aux présentes
        conditions, après information de l’intéressé sauf urgence.
      </p>

      <h3>9. Données personnelles</h3>
      <p>
        Le traitement des données est détaillé dans notre{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>, qui fait partie intégrante
        des présentes conditions.
      </p>

      <h3>10. Droit applicable et litiges</h3>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de litige, une solution
        amiable sera recherchée avant toute action judiciaire. Le consommateur peut recourir
        gratuitement à un médiateur de la consommation. À défaut d’accord, les tribunaux français
        sont compétents.
      </p>

      <h2>Accessibilité</h2>
      <p>
        Nous visons la conformité au RGAA. Si vous rencontrez une difficulté d’accès à une
        fonctionnalité, signalez-la à <a href={'mailto:' + CONTACT}>{CONTACT}</a>&nbsp;: nous
        traitons ces signalements en priorité.
      </p>
    </ContentPage>
  );
}
