import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/marketing/ContentPage';
import { FaqJsonLd, type FaqEntry } from '@/components/StructuredData';
import { ButtonLink } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';

export const metadata: Metadata = {
  title: 'Comment ça marche',
  description:
    'Le détail du fonctionnement d’EchoRun : trois façons de créer sa course (import GPX, tracé dessiné, mode chrono), lien de partage, enregistrement des vocaux par vos proches, déclenchement pendant la course et lecture hors-ligne.',
  alternates: { canonical: '/comment-ca-marche' },
};

/**
 * La FAQ est une donnée, pas du JSX.
 *
 * Elle alimente à la fois le rendu de la page et le balisage FAQPage. Une
 * FAQPage qui décrit des questions absentes de la page visible est un motif de
 * rejet chez Google — et c'est exactement ce qui finit par arriver quand les
 * deux sont saisies séparément.
 */
const FAQ: readonly FaqEntry[] = [
  {
    question: 'Faut-il un fichier GPX pour créer une course ?',
    answer:
      'Non. Trois options s’offrent à vous : importer un GPX, dessiner votre parcours directement sur la carte (il est calé sur les vraies routes), ou choisir le mode chrono si vous n’avez pas de tracé — vous annoncez une durée et vos proches déposent leurs voix sur une frise temporelle.',
  },
  {
    question: 'Faut-il des écouteurs ?',
    answer:
      'C’est fortement conseillé, en particulier des écouteurs à conduction osseuse ou ouverts, qui laissent entendre l’environnement. Sans écouteurs, le message sort du haut-parleur du téléphone : audible sur une route de campagne, inaudible dans un peloton.',
  },
  {
    question: 'Et si je porte une montre GPS ?',
    answer:
      'EchoRun n’interfère pas avec votre montre : ce sont deux appareils indépendants. Continuez à enregistrer votre course comme d’habitude.',
  },
  {
    question: 'Combien de messages peut-on recevoir ?',
    answer:
      'Chaque course accueille 15 messages offerts. Si vos proches en déposent plus, on prévient le coureur par e-mail : pour 1,99 €, il débloque la course jusqu’à 50 messages. Chaque personne est limitée à 5 messages, pour laisser de la place à tout le monde.',
  },
  {
    question: 'Mes proches voient-ils les messages des autres ?',
    answer:
      'Ils voient qu’un point (ou un moment, en mode chrono) est déjà pris et par qui — utile pour se répartir le parcours — mais ils ne peuvent pas écouter les messages des autres. Seul le coureur les entend.',
  },
  {
    question: 'Est-ce que ça fonctionne sans réseau ?',
    answer:
      'Oui, et c’est le point central. Les vocaux et le tracé sont téléchargés sur le téléphone avant la course, puis lus depuis le stockage local. Vous pouvez courir en mode avion : les messages se déclencheront quand même.',
  },
  {
    question: 'Faut-il garder l’écran allumé pendant la course ?',
    answer:
      'Dans la version web (PWA), oui : un site n’a pas accès au GPS en arrière-plan, c’est une restriction d’iOS et d’Android. L’application maintient donc l’écran allumé et doit rester au premier plan (comptez environ 12 % de batterie par heure). L’application mobile native, elle, suit votre position en arrière-plan : écran éteint, téléphone dans la poche.',
  },
] as const;

export default function HowItWorksPage() {
  return (
    <ContentPage
      eyebrow="Guide"
      title="Comment ça marche, précisément"
      lede="Pas de magie : vous créez votre course (par GPX, en la dessinant, ou en mode chrono), vous partagez un lien, et le jour J votre téléphone déclenche les voix au bon endroit. Voici chaque étape, y compris ce qui peut mal se passer."
      aside={
        <Surface className="p-6">
          <p className="text-[14px] font-semibold text-charcoal">Prêt à essayer&nbsp;?</p>
          <p className="mt-2 text-[13px] leading-relaxed text-charcoal-muted">
            La création d’une course prend trois minutes et ne coûte rien.
          </p>
          <ButtonLink href="/login" size="sm" className="mt-5" fullWidth>
            Créer ma course
          </ButtonLink>
        </Surface>
      }
    >
      <FaqJsonLd entries={FAQ} />

      <h2>1. Le coureur crée sa course — trois façons</h2>
      <p>
        Selon ce que vous avez sous la main, vous choisissez la méthode la plus simple. Les trois
        aboutissent au même résultat&nbsp;: une course prête à partager.
      </p>
      <ul>
        <li>
          <strong>Importer un GPX.</strong> C’est le plus précis. Le <code>.gpx</code> est le format
          universel des traces GPS&nbsp;: l’organisateur de votre course le met presque toujours à
          disposition, et vous pouvez aussi exporter n’importe quelle sortie depuis Strava, Garmin
          Connect, Komoot ou OpenRunner.
        </li>
        <li>
          <strong>Dessiner le parcours sur la carte.</strong> Pas de fichier&nbsp;? Posez vos points
          sur la carte&nbsp;: EchoRun les relie en suivant les vraies routes (calage automatique).
          Idéal pour un entraînement ou une boucle maison.
        </li>
        <li>
          <strong>Le mode chrono.</strong> Aucun tracé du tout&nbsp;? Annoncez simplement une durée
          prévue — disons 2&nbsp;h — et vos proches déposeront leurs voix sur une{' '}
          <strong>frise temporelle</strong> plutôt que sur une carte. Le déclenchement se fait alors
          à la minute de course choisie, pas à un kilomètre.
        </li>
      </ul>
      <p>
        Pour un GPX ou un tracé dessiné, nous ne conservons que la suite des coordonnées du tracé.
        Les points sont <strong>simplifiés</strong> (algorithme de Douglas-Peucker) pour passer d’un
        fichier qui peut contenir 40&nbsp;000 points à environ 1&nbsp;500 — assez pour un tracé
        fidèle au mètre près, assez léger pour s’afficher instantanément sur un téléphone. La
        distance totale et la distance cumulée de chaque point sont calculées à ce moment-là.
      </p>

      <h2>2. Le lien de partage</h2>
      <p>
        Chaque course reçoit une adresse courte et non devinable, du type{' '}
        <code>echo-run.com/e/k7m2pq9xr4tz</code>. C’est le même principe qu’un Tricount&nbsp;: qui a
        le lien peut participer, sans compte ni installation. Vous le diffusez comme vous voulez —
        SMS, WhatsApp, groupe familial, mail.
      </p>
      <p>
        Ce lien n’est pas indexé par les moteurs de recherche et ne peut pas être retrouvé par
        tâtonnement. Vous pouvez le fermer à tout moment depuis votre espace&nbsp;: personne ne peut
        plus déposer de message, mais ceux déjà enregistrés restent.
      </p>

      <h2>3. Vos proches choisissent leur moment</h2>
      <p>
        En ouvrant le lien, votre proche renseigne son prénom. Puis, selon le type de course&nbsp;:
        sur une course avec tracé, il voit le parcours sur une carte et{' '}
        <strong>clique sur le point</strong> où il veut que son message se déclenche&nbsp;; en mode
        chrono, il fait <strong>glisser un curseur sur la frise</strong> jusqu’à la minute de course
        voulue. Dans les deux cas, il enregistre ensuite jusqu’à trente secondes de voix directement
        dans son navigateur.
      </p>
      <p>
        Sur une carte, le clic n’a pas besoin d’être précis&nbsp;: la position est automatiquement
        recalée sur le point du tracé le plus proche. C’est important, car le déclenchement en
        course dépend de cette précision.
      </p>
      <p>
        Chaque proche peut déposer <strong>jusqu’à 5 messages</strong>, gratuitement et sans compte.
        Une course accueille <strong>15 messages offerts</strong>&nbsp;; au-delà, c’est le
        <strong> coureur</strong> — prévenu par e-mail — qui débloque la course pour 1,99&nbsp;€
        (jusqu’à 50 messages). Vos proches, eux, ne paient jamais rien.
      </p>

      <h3>Ce qu’il faut savoir sur l’enregistrement</h3>
      <ul>
        <li>
          Le navigateur demande l’autorisation d’accéder au micro. Sur iPhone, cela n’est possible
          que dans Safari ou Chrome, pas dans le navigateur intégré à certaines applications de
          messagerie&nbsp;: si le bouton ne répond pas, ouvrez le lien dans un vrai navigateur.
        </li>
        <li>
          Le fichier produit est compressé (Opus, ou AAC sur les appareils Apple)&nbsp;: un message
          de trente secondes pèse moins de 200&nbsp;ko.
        </li>
        <li>
          Vous pouvez réécouter votre message avant de l’envoyer, et le refaire autant de fois que
          vous voulez&nbsp;: rien n’est envoyé tant que vous n’avez pas validé.
        </li>
      </ul>

      <h2>4. La veille de la course&nbsp;: la préparation</h2>
      <p>
        C’est l’étape que personne ne devrait sauter. Depuis votre espace, vous lancez la{' '}
        <strong>préparation de la course</strong>. L’application télécharge alors sur votre
        téléphone&nbsp;: le tracé (ou la frise, en mode chrono), la liste des déclenchements, et{' '}
        <strong>tous les fichiers audio</strong>.
      </p>
      <p>
        Tout est stocké localement (IndexedDB pour les audios, cache du navigateur pour
        l’application elle-même). Conséquence directe&nbsp;: le jour J, vous pouvez courir en mode
        avion, dans un tunnel ou au fond d’une vallée sans réseau — les messages se déclencheront
        quand même. Nous demandons également au navigateur un stockage persistant, pour éviter que
        le système ne vide le cache entre la préparation et le départ.
      </p>

      <h2>5. Pendant la course&nbsp;: le déclenchement</h2>
      <p>
        Vous appuyez sur <strong>Démarrer la course</strong>. Ce geste est indispensable, et pas
        seulement pour des raisons d’ergonomie&nbsp;: les navigateurs mobiles n’autorisent la lecture
        audio et la synthèse vocale qu’après une action explicite de l’utilisateur. C’est à cet
        instant que l’application «&nbsp;débloque&nbsp;» le son pour toute la durée de la course.
      </p>
      <p>Ensuite, la boucle dépend du type de course&nbsp;:</p>
      <ul>
        <li>
          <strong>Course avec tracé&nbsp;:</strong> le GPS remonte votre position en continu et, pour
          chaque message en attente, l’application calcule la distance jusqu’à son point de
          déclenchement. Le rayon par défaut est de 70&nbsp;mètres, et il s’élargit automatiquement
          si le GPS annonce une position imprécise.
        </li>
        <li>
          <strong>Mode chrono&nbsp;:</strong> pas de GPS du tout. Un chronomètre démarre au top
          départ, et chaque message se déclenche à la minute de course que votre proche a choisie sur
          la frise.
        </li>
        <li>
          Quand le moment arrive, la synthèse vocale annonce{' '}
          <strong>«&nbsp;Message de Camille&nbsp;»</strong>, puis le vocal de Camille est lu
          immédiatement après.
        </li>
        <li>
          Si deux messages sont proches, ils sont lus <strong>l’un après l’autre</strong>, dans
          l’ordre. Jamais en même temps.
        </li>
        <li>
          Si le signal GPS se perd juste au mauvais moment, l’application s’en aperçoit dès qu’elle
          vous retrouve au-delà du point et joue le message en léger différé. Un message n’est
          jamais perdu.
        </li>
      </ul>

      <h3>L’écran allumé&nbsp;: une limite de la version web, pas de l’app</h3>
      <p>
        Nous préférons être francs plutôt que de vous laisser le découvrir sur un dossard. Une
        application <strong>web</strong> (celle que vos proches et vous ouvrez dans le navigateur)
        n’a <strong>pas</strong> accès au GPS en arrière-plan&nbsp;: c’est une restriction du
        système, pas un manque de notre part. Sur iPhone, la géolocalisation s’arrête dès que Safari
        passe en arrière-plan ou que l’écran se verrouille&nbsp;; sur Android, elle survit quelques
        minutes puis est coupée pour économiser la batterie.
      </p>
      <p>
        En version web, notre réponse est donc que l’application maintient elle-même l’écran allumé
        (API Screen Wake Lock) et vous demande de garder EchoRun au premier plan. Le téléphone reste
        dans le brassard ou la poche, écran actif. Comptez environ 12&nbsp;% de batterie par heure
        sur un appareil récent avec la luminosité réduite&nbsp;; sur un marathon, partez à
        100&nbsp;%.
      </p>
      <p>
        C’est précisément pour lever cette contrainte qu’existe l’<strong>application mobile
        native</strong>&nbsp;: elle, a le droit de suivre votre position en arrière-plan. Vous
        démarrez la course, vous rangez le téléphone écran éteint, et les messages se déclenchent
        quand même — sans vider la batterie. Le mode chrono, lui, n’a jamais eu besoin de l’écran
        allumé, puisqu’il ne dépend pas du GPS.
      </p>

      <h2>6. Après l’arrivée</h2>
      <p>
        Tous les messages restent accessibles dans votre espace, réécoutables autant de fois que
        vous voulez. Vous voyez lesquels se sont déclenchés, à quel kilomètre (ou à quelle minute),
        et à quelle heure. C’est aussi la page que la plupart des gens envoient à leurs proches pour
        les remercier.
      </p>

      <h2>Questions fréquentes</h2>

      {FAQ.map((entry) => (
        <div key={entry.question}>
          <h3>{entry.question}</h3>
          <p>{entry.answer}</p>
        </div>
      ))}

      <p className="mt-10">
        Pour le détail du traitement des données, voyez notre{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
    </ContentPage>
  );
}
