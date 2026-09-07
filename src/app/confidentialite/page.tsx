import type { Metadata } from 'next';
import Link from 'next/link';
import { ManageCookiesButton } from '@/components/consent/ManageCookiesButton';
import { ContentPage } from '@/components/marketing/ContentPage';
import { Surface } from '@/components/ui/Surface';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Comment EchoRun traite vos données : position GPS traitée localement sur votre appareil, stockage des messages vocaux, durées de conservation et exercice de vos droits RGPD.',
  alternates: { canonical: '/confidentialite' },
};

const CONTACT = process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? 'lsimonin2@gmail.com';
const ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? 'EchoRun';

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Confidentialité"
      title="Politique de confidentialité"
      lede="EchoRun manipule deux catégories de données sensibles : votre position pendant une course, et la voix de vos proches. Voici exactement ce qu’il en advient."
      updatedAt="4 septembre 2026"
      aside={
        <Surface className="p-6">
          <p className="text-[13px] font-semibold text-charcoal">En une phrase</p>
          <p className="mt-2 text-[13px] leading-relaxed text-charcoal-muted">
            Votre trace GPS de course ne quitte jamais votre téléphone. Les messages vocaux sont
            stockés chiffrés, audibles uniquement par le coureur destinataire, et supprimés sur
            simple demande.
          </p>
        </Surface>
      }
    >
      <h2>1. Qui est responsable du traitement</h2>
      <p>
        Le responsable de traitement est <strong>{ENTITY}</strong>, éditeur du service EchoRun,
        joignable à l’adresse <a href={'mailto:' + CONTACT}>{CONTACT}</a>. Les coordonnées complètes
        figurent dans les <Link href="/mentions-legales">mentions légales</Link>.
      </p>

      <h2>2. Le point le plus important&nbsp;: votre position</h2>
      <p>
        Pendant une course, l’application lit votre position GPS en continu pour savoir quand
        déclencher un message. <strong>Ces coordonnées ne sont jamais transmises à nos serveurs.</strong>
      </p>
      <p>
        Le calcul de proximité s’exécute entièrement dans votre navigateur&nbsp;: le tracé et les
        points de déclenchement ont été téléchargés au préalable, et la comparaison «&nbsp;suis-je à
        moins de 70&nbsp;mètres de ce point&nbsp;?&nbsp;» se fait localement, sur votre appareil. La
        position est conservée en mémoire vive le temps du calcul, puis remplacée par la suivante.
        Elle n’est ni journalisée, ni historisée, ni envoyée à un tiers.
      </p>
      <p>
        Conséquence pratique&nbsp;: nous sommes techniquement incapables de reconstituer votre
        itinéraire, votre allure ou vos horaires de passage. La seule information qui remonte, et
        uniquement si le réseau est disponible, est <strong>le fait qu’un message a été lu</strong>
        {' '}• un identifiant et un horodatage, sans coordonnées.
      </p>

      <h2>3. Données que nous traitons effectivement</h2>

      <h3>Pour le coureur (compte)</h3>
      <ul>
        <li>
          <strong>Adresse e-mail</strong>&nbsp;: pour l’authentification par lien magique et les
          messages de service. Base légale&nbsp;: exécution du contrat.
        </li>
        <li>
          <strong>Nom ou pseudonyme d’affichage</strong>&nbsp;: affiché à vos proches sur la page de
          dépôt, pour qu’ils sachent à qui ils parlent.
        </li>
      </ul>

      <h3>Pour les courses</h3>
      <ul>
        <li>
          <strong>Tracé issu du fichier GPX</strong> que vous importez&nbsp;: coordonnées du
          parcours, distance, nom de la course, date. Un tracé de course est une donnée publique
          d’organisateur, pas un historique de vos déplacements.
        </li>
        <li>
          <strong>Le fichier GPX d’origine</strong>, conservé pour permettre un réimport. Vous
          pouvez le supprimer sans supprimer la course.
        </li>
      </ul>

      <h3>Pour les proches (sans compte)</h3>
      <ul>
        <li>
          <strong>Le prénom ou pseudonyme saisi</strong>. Nous ne demandons ni e-mail, ni téléphone,
          ni identité vérifiée.
        </li>
        <li>
          <strong>Le message vocal enregistré</strong> et sa durée. Base légale&nbsp;: consentement,
          matérialisé par l’acte d’enregistrer et d’envoyer.
        </li>
        <li>
          <strong>Le point du parcours choisi</strong> • une position sur un tracé, pas la position
          du proche, qui n’est jamais demandée.
        </li>
        <li>
          <strong>Un jeton technique</strong> déposé dans le stockage local de son navigateur, qui
          lui permet de retrouver ses messages et son quota s’il revient. Ce jeton n’est pas un
          cookie publicitaire et ne permet aucun suivi entre sites.
        </li>
      </ul>

      <h3>Pour les paiements</h3>
      <p>
        Les paiements sont opérés par <strong>Stripe Payments Europe</strong>. Nous ne voyons jamais
        et ne stockons jamais de numéro de carte&nbsp;: la saisie a lieu sur les pages de Stripe.
        Nous conservons uniquement l’identifiant de la transaction, le montant, la devise et le
        statut, pour la comptabilité et le service après-vente.
      </p>

      <h2>4. Les messages vocaux&nbsp;: qui peut les écouter</h2>
      <p>
        Les fichiers audio sont stockés dans un espace <strong>privé</strong>. Ils ne sont accessibles
        par aucune URL publique&nbsp;: chaque lecture passe par un lien signé, temporaire, généré
        uniquement pour le coureur destinataire authentifié.
      </p>
      <ul>
        <li>Le coureur destinataire peut les écouter.</li>
        <li>
          Les autres proches ne peuvent pas les écouter. Ils voient seulement qu’un point du parcours
          est occupé, et par quel prénom.
        </li>
        <li>
          Nos équipes n’y accèdent pas, sauf réquisition judiciaire ou signalement d’un contenu
          illicite par le coureur.
        </li>
      </ul>
      <p>
        Un proche qui souhaite retirer son message peut le faire depuis le lien de partage tant que
        la course n’a pas eu lieu, ou nous écrire. Le coureur peut supprimer tout message reçu.
      </p>

      <h2>5. Durées de conservation</h2>
      <ul>
        <li>
          <strong>Messages vocaux</strong>&nbsp;: 12&nbsp;mois après la date de la course, puis
          suppression automatique. Le coureur est averti un mois avant et peut demander une
          prolongation ou télécharger ses fichiers.
        </li>
        <li>
          <strong>Tracés et courses</strong>&nbsp;: jusqu’à la suppression du compte.
        </li>
        <li>
          <strong>Compte</strong>&nbsp;: supprimé sur demande, ou après 36&nbsp;mois d’inactivité
          totale.
        </li>
        <li>
          <strong>Données de facturation</strong>&nbsp;: 10&nbsp;ans, obligation légale de
          conservation comptable.
        </li>
        <li>
          <strong>Journaux techniques</strong> (erreurs serveur, adresses IP)&nbsp;: 30&nbsp;jours.
        </li>
      </ul>

      <h2>6. Sous-traitants et hébergement</h2>
      <ul>
        <li>
          <strong>Supabase</strong> • base de données, authentification et stockage des fichiers.
          Hébergement dans l’Union européenne.
        </li>
        <li>
          <strong>Vercel</strong> • hébergement de l’application web.
        </li>
        <li>
          <strong>Stripe Payments Europe</strong> • traitement des paiements.
        </li>
        <li>
          <strong>Google AdSense</strong> • affichage de publicités, lorsque cette fonctionnalité est
          activée (voir section suivante).
        </li>
      </ul>

      <h2>7. Cookies et traceurs</h2>
      <p>
        Le service utilise deux catégories de traceurs, et deux seulement. Il n’y a ni outil de
        mesure d’audience tiers, ni bouton de réseau social, ni enregistrement de session.
      </p>

      <h3>Strictement nécessaires • pas de consentement requis</h3>
      <p>
        Ces traceurs sont exemptés de consentement car le service ne peut pas fonctionner sans eux.
        Aucun n’est utilisé à des fins publicitaires.
      </p>
      <ul>
        <li>
          <strong>Cookie de session</strong> (déposé par Supabase Auth)&nbsp;: vous maintient
          connecté. Durée&nbsp;: la session, renouvelée à chaque visite.
        </li>
        <li>
          <strong>Jeton de dépôt de vocal</strong> (stockage local, pas un cookie)&nbsp;: permet à
          un proche de retrouver ses messages et son quota sans créer de compte. Reste sur son
          appareil, ne nous est transmis qu’au moment d’un envoi.
        </li>
        <li>
          <strong>Mémorisation de votre choix de cookies</strong> (stockage local)&nbsp;: pour ne
          pas vous reposer la question à chaque page.
        </li>
        <li>
          <strong>Cache de course</strong> (IndexedDB)&nbsp;: le tracé et les fichiers audio
          téléchargés avant l’épreuve, pour la lecture hors-ligne. Supprimable depuis les réglages
          de votre navigateur.
        </li>
      </ul>

      <h3>Publicité • soumis à votre consentement</h3>
      <p>
        Le service peut afficher des publicités Google AdSense sur les pages publiques, sur la page
        de dépôt de message et sur la page de fin de course.{' '}
        <strong>Aucune publicité n’est affichée pendant une course.</strong>
      </p>
      <p>
        Tant que vous n’avez pas répondu à la bannière, <strong>aucun script publicitaire n’est
        chargé</strong> et aucune requête n’est envoyée à Google. Si vous refusez, les annonces
        deviennent contextuelles&nbsp;: elles s’affichent toujours, mais sans cookie publicitaire ni
        profilage. Nous transmettons ce refus à Google via le mécanisme «&nbsp;Consent Mode&nbsp;»,
        qui l’applique également à ses partenaires.
      </p>
      <p>
        Le service est intégralement fonctionnel dans les deux cas&nbsp;: refuser ne dégrade aucune
        fonctionnalité.
      </p>

      <h3>Revenir sur votre choix</h3>
      <p>
        Vous pouvez modifier ou retirer votre consentement à tout moment, sans justification et
        sans conséquence sur votre utilisation du service. Le lien est également présent en pied de
        chaque page.
      </p>
      <p>
        <ManageCookiesButton
          label="Ouvrir mes préférences de cookies"
          className="text-matcha-500 underline underline-offset-2"
        />
      </p>
      <p>
        Indépendamment de ce choix, les réglages publicitaires de votre compte Google sont
        modifiables sur{' '}
        <a href="https://adssettings.google.com" rel="nofollow noopener" target="_blank">
          adssettings.google.com
        </a>
        , et votre navigateur permet de bloquer ou supprimer les cookies déjà déposés.
      </p>
      <p>
        Nos statistiques internes (nombre de courses, de messages, chiffre d’affaires) sont des
        compteurs agrégés calculés directement en base, sans identifiant individuel ni traceur.
      </p>

      <h2>8. Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’effacement, de
        limitation, d’opposition et de portabilité de vos données, ainsi que du droit de retirer
        votre consentement à tout moment.
      </p>
      <p>
        Pour les exercer, écrivez à <a href={'mailto:' + CONTACT}>{CONTACT}</a>. Nous répondons sous
        30&nbsp;jours. Si notre réponse ne vous satisfait pas, vous pouvez saisir la CNIL (
        <a href="https://www.cnil.fr" rel="noopener" target="_blank">
          cnil.fr
        </a>
        ).
      </p>

      <h2>9. Sécurité</h2>
      <ul>
        <li>Chiffrement en transit (HTTPS) et au repos sur l’ensemble du service.</li>
        <li>
          Cloisonnement par <em>Row Level Security</em> en base&nbsp;: un coureur ne peut
          techniquement pas lire les données d’un autre, même en cas de faille applicative.
        </li>
        <li>Fichiers audio dans un espace privé, servis exclusivement par liens signés éphémères.</li>
        <li>Aucun mot de passe stocké&nbsp;: l’authentification se fait par lien à usage unique.</li>
      </ul>

      <h2>10. Mineurs</h2>
      <p>
        Le service n’est pas destiné aux enfants de moins de 15&nbsp;ans. Un enfant peut évidemment
        enregistrer un message pour un parent, sous la responsabilité de l’adulte qui lui confie
        l’appareil.
      </p>

      <h2>11. Modifications</h2>
      <p>
        Toute évolution substantielle de cette politique est signalée par e-mail aux titulaires de
        compte au moins 15&nbsp;jours avant son entrée en vigueur.
      </p>
    </ContentPage>
  );
}
