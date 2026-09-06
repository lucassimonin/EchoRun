import type { Metadata } from 'next';
import { AdSenseUnit } from '@/components/ads/AdSenseUnit';
import { AppJsonLd, HowToJsonLd, SiteJsonLd } from '@/components/StructuredData';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Badge, Eyebrow, Surface } from '@/components/ui/Surface';
import { adSlotFor, getAppSettings } from '@/lib/settings';
import { formatPrice } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'EchoRun — les voix de tes proches, au bon kilomètre',
  alternates: { canonical: '/' },
};

export const revalidate = 300;

const STEPS = [
  {
    step: '01',
    title: 'Tu crées ta course',
    body: 'Importe ton GPX, dessine ton tracé sur la carte, ou fixe simplement une durée. Trois façons, deux minutes, aucun compte compliqué.',
  },
  {
    step: '02',
    title: 'Tu partages un lien',
    body: 'Un lien unique, comme un Tricount. Tes proches n’ont ni compte à créer ni application à installer. Ils ouvrent, ils parlent, c’est fini.',
  },
  {
    step: '03',
    title: 'Le jour J fait le reste',
    body: 'Pendant la course, ton téléphone annonce « Message de Camille » puis joue son vocal, pile au bon endroit — ou à la bonne minute. Sans réseau.',
  },
];

const CREATION_MODES = [
  {
    key: 'gpx',
    tag: 'Le plus précis',
    title: 'Importe ton GPX',
    body: 'Le fichier de ta course — celui de l’organisateur ou ton export Strava. On en tire le tracé au mètre près.',
    icon: (
      <>
        <path
          d="M9 3.5h6l4.5 4.5v11a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 9 3.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M14.5 3.5V9h5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M10.5 15.5c1-2 2-2 3 0s2 2 3 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    key: 'draw',
    tag: 'Sans fichier',
    title: 'Dessine ton parcours',
    body: 'Pose tes points sur la carte, EchoRun les cale sur les vraies routes. Idéal pour un entraînement ou une boucle maison.',
    icon: (
      <>
        <path
          d="M4 18c2.5 0 3-9 6-9s2 6 4.5 6 3.5-6 5.5-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M15.5 4.5 19 8l-8.5 8.5-3.5.7.7-3.5L15.5 4.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    key: 'time',
    tag: 'Pas de tracé ?',
    title: 'Cale sur le temps',
    body: 'Annonce ta durée — disons 2 h — et tes proches déposent leurs voix sur une frise. Le chrono les déclenche à la minute pile.',
    icon: (
      <>
        <circle cx="12" cy="13" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 9v4l2.5 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M9.5 3.5h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
];

const USE_CASES = [
  {
    title: 'Le mur du 30ᵉ kilomètre',
    body: 'Sur un marathon, tout le monde sait où ça casse. Place trois voix entre le 30 et le 35 : c’est exactement là qu’elles servent.',
  },
  {
    title: 'Un trail où personne ne peut venir',
    body: 'Cols, forêts, ravitaillements inaccessibles. Tes proches ne peuvent pas être au bord du chemin — leur voix, si.',
  },
  {
    title: 'Ton premier 10 km',
    body: 'La ligne d’arrivée fait peur quand on ne l’a jamais franchie. Un message à 500 mètres du bout change la fin de l’histoire.',
  },
  {
    title: 'Un anniversaire en dossard',
    body: 'Courir le jour de ses 40 ans, et recevoir dix messages surprises échelonnés sur le parcours. Personne ne le voit venir.',
  },
];

const BENEFITS = [
  {
    label: 'Aucune application pour tes proches',
    body: 'Un lien web. Ça marche sur le vieil iPhone de ta mère comme sur l’Android de ton frère.',
  },
  {
    label: 'Zéro réseau pendant la course',
    body: 'Les vocaux sont téléchargés sur ton téléphone la veille. En pleine forêt, ça fonctionne pareil.',
  },
  {
    label: 'Rien à manipuler en courant',
    body: 'Pas de notification à lire, pas d’écran à déverrouiller. Ça parle dans tes écouteurs, tu continues à courir.',
  },
  {
    label: 'Tu gardes tout',
    body: 'Après la course, les messages restent. C’est le seul souvenir de ta course qui a une voix.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Au 32ᵉ, j’étais en train de lâcher. J’ai entendu la voix de ma fille qui me disait « allez papa, plus que dix ». J’ai fini en pleurant, mais j’ai fini.',
    author: 'Karim',
    detail: 'Marathon de Paris',
  },
  {
    quote:
      'J’ai mis des messages à chaque col pour ma sœur sans lui dire. Elle m’a appelée le soir, elle n’avait pas compris d’où venaient les voix.',
    author: 'Léa',
    detail: 'a offert 6 vocaux sur un trail de 45 km',
  },
  {
    quote:
      'Le truc bête, c’est que ça arrive au bon moment. Un encouragement à la ligne de départ ne sert à rien. Au 18ᵉ, ça change tout.',
    author: 'Sophie',
    detail: 'semi-marathon de Lille',
  },
];

export default async function LandingPage() {
  const settings = await getAppSettings();
  const ad = adSlotFor(settings, 'landing');

  return (
    <>
      {/* Données structurées : identité, application et déroulé en 3 étapes. */}
      <SiteJsonLd />
      <AppJsonLd extraMessagePriceCents={settings.unlock_price_cents} />
      <HowToJsonLd />

      <SiteHeader />

      <main>
        {/* ------------------------------------------------------------- hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(62,90,71,0.12),transparent_70%)]"
          />
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
            <div className="max-w-3xl animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-matcha-500/20 bg-matcha-500/[0.06] px-3.5 py-1.5 text-[12px] font-medium tracking-[0.01em] text-matcha-500">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-matcha-500/60 animate-pulse-ring" />
                  <span className="relative inline-flex size-2 rounded-full bg-matcha-500" />
                </span>
                Encouragements vocaux géolocalisés
              </span>
              <h1 className="mt-6 text-[clamp(2.5rem,7vw,3.9rem)] font-semibold leading-[1.0] tracking-[-0.035em] text-charcoal">
                Les voix de tes proches,
                <br />
                <span className="text-matcha-500">au bon kilomètre.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lede text-charcoal-muted">
                Tes proches déposent un message vocal sur un point précis de ton parcours. Le jour
                de la course, ton téléphone le déclenche tout seul quand tu passes devant. Toi, tu
                cours. Eux, ils sont là.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink href="/login" size="lg">
                  Créer ma course
                </ButtonLink>
                <ButtonLink href="/comment-ca-marche" size="lg" variant="secondary">
                  Voir comment ça marche
                </ButtonLink>
              </div>

              <p className="mt-5 text-[13px] text-charcoal-faint">
                Gratuit pour tes proches · 15 messages offerts par course · aucune application à
                installer
              </p>
            </div>

            {/* Aperçu du déclenchement : rien d'autre qu'une carte stylisée. */}
            <div className="mt-14 sm:mt-20">
              <TriggerPreview />
            </div>
          </div>
        </section>

        {/* --------------------------------------------- 3 façons de créer */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Trois façons de démarrer</Eyebrow>
            <h2 className="mt-4 text-title text-charcoal">
              Avec ou sans fichier, il y a toujours un moyen
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-charcoal-muted">
              Que tu aies le GPX officiel, une idée de boucle, ou juste une durée en tête — tu peux
              lancer ta course en deux minutes.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {CREATION_MODES.map((mode, index) => (
              <div
                key={mode.key}
                className="group animate-rise rounded-card border border-charcoal/[0.07] bg-paper p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-matcha-500/[0.09] text-matcha-500 transition-transform duration-300 group-hover:scale-110 group-hover:bg-matcha-500 group-hover:text-bone">
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    {mode.icon}
                  </svg>
                </span>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-matcha-300">
                  {mode.tag}
                </p>
                <h3 className="mt-1.5 text-[17px] font-semibold tracking-[-0.015em] text-charcoal">
                  {mode.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-muted">
                  {mode.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- 3 étapes */}
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-4 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Le principe</Eyebrow>
            <h2 className="mt-4 text-title text-charcoal">Trois minutes pour tout mettre en place</h2>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-card border border-charcoal/[0.07] bg-charcoal/[0.07] md:grid-cols-3">
            {STEPS.map((item, index) => (
              <div
                key={item.step}
                id={'etape-' + (index + 1)}
                className="animate-rise bg-paper p-8 transition-colors duration-300 hover:bg-bone-100"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="text-[11px] font-semibold tracking-[0.16em] text-matcha-300">
                  {item.step}
                </span>
                <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.015em] text-charcoal">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-muted">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ cas d'usage */}
        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Quand ça sert vraiment</Eyebrow>
            <h2 className="mt-4 text-title text-charcoal">
              Un encouragement ne vaut que par son timing
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-charcoal-muted">
              Un message reçu la veille se perd dans la masse. Un message reçu à l’endroit exact où
              tu commences à douter, c’est autre chose.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {USE_CASES.map((item) => (
              <Surface key={item.title} className="p-7 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                <h3 className="text-[16px] font-semibold tracking-[-0.015em] text-charcoal">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-muted">
                  {item.body}
                </p>
              </Surface>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------- bénéfices */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="rounded-sheet bg-matcha-500 px-7 py-14 text-bone sm:px-14">
            <Eyebrow className="text-matcha-200">Ce que ça change</Eyebrow>
            <h2 className="mt-4 max-w-2xl text-title">
              Pensé pour le seul moment où ça compte : pendant l’effort.
            </h2>

            <div className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
              {BENEFITS.map((item) => (
                <div key={item.label} className="border-t border-bone/20 pt-5">
                  <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{item.label}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-matcha-100/85">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------- témoignages */}
        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Retours de coureurs</Eyebrow>
            <h2 className="mt-4 text-title text-charcoal">Ce qu’on nous raconte après l’arrivée</h2>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <figure
                key={item.author}
                className="flex flex-col justify-between rounded-card border border-charcoal/[0.07] bg-paper p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <blockquote className="text-[14.5px] leading-relaxed text-charcoal">
                  « {item.quote} »
                </blockquote>
                <figcaption className="mt-6 text-[12.5px] text-charcoal-faint">
                  <span className="font-medium text-charcoal-muted">{item.author}</span> ·{' '}
                  {item.detail}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- publicité */}
        {ad ? (
          <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
            <AdSenseUnit clientId={ad.clientId} slotId={ad.slotId} format="auto" minHeight={140} />
          </div>
        ) : null}

        {/* ------------------------------------------------------------ tarifs */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Tarifs</Eyebrow>
            <h2 className="mt-4 text-title text-charcoal">Gratuit pour commencer. 1,99 € seulement si ça déborde.</h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Surface className="p-8">
              <Badge tone="matcha">Tes proches</Badge>
              <p className="mt-5 text-[2.5rem] font-semibold leading-none tracking-[-0.03em] text-charcoal">
                0 €
              </p>
              <p className="mt-2 text-[13.5px] text-charcoal-faint">
                Toujours. Tes proches ne paient jamais rien.
              </p>
              <ul className="mt-7 space-y-2.5 text-[14px] text-charcoal-muted">
                <li>Jusqu’à 5 messages par personne</li>
                <li>Aucun compte à créer, tout dans le navigateur</li>
                <li>Enregistrement en un geste</li>
                <li>Jusqu’à 30 secondes par message</li>
              </ul>
            </Surface>

            <Surface className="p-8">
              <Badge>Toi, le coureur</Badge>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="text-[2.5rem] font-semibold leading-none tracking-[-0.03em] text-charcoal">
                  {settings.free_message_cap}
                </span>
                <span className="text-[15px] text-charcoal-muted">messages offerts par course</span>
              </p>
              <p className="mt-2 text-[13.5px] text-charcoal-faint">
                Puis {formatPrice(settings.unlock_price_cents)} une fois pour débloquer jusqu’à{' '}
                {settings.unlocked_message_cap} messages. Tu paies pour tout le monde.
              </p>
              <ul className="mt-7 space-y-2.5 text-[14px] text-charcoal-muted">
                <li>GPX, dessin sur carte ou mode chrono — au choix</li>
                <li>Lien de partage illimité, sans limite de courses</li>
                <li>Lecture hors-ligne pendant la course</li>
                <li>Archive de tous les messages reçus</li>
              </ul>
            </Surface>
          </div>
        </section>

        {/* --------------------------------------------------------- CTA final */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="rounded-sheet border border-charcoal/[0.07] bg-paper px-7 py-16 text-center shadow-lift sm:px-14">
            <h2 className="mx-auto max-w-xl text-[clamp(1.75rem,4vw,2.25rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-charcoal">
              Ta prochaine course a une date. Donne-lui des voix.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-charcoal-muted">
              GPX, tracé dessiné ou simple chrono — crée ta course et envoie le lien à tes proches.
              Il te reste juste à courir.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/login" size="lg">
                Créer ma course
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * Illustration statique du déclenchement. Pas de carte réelle sur la landing :
 * Leaflet coûterait ~150 ko et un LCP dégradé pour une image décorative.
 * Le tracé se dessine à l'arrivée et la carte de notification flotte doucement.
 */
function TriggerPreview() {
  return (
    <div className="overflow-hidden rounded-sheet border border-charcoal/[0.07] bg-paper shadow-lift">
      <div className="relative h-[260px] bg-bone-100 sm:h-[320px]">
        <svg
          viewBox="0 0 800 320"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0v40" fill="none" stroke="#111812" strokeOpacity="0.045" />
            </pattern>
          </defs>
          <rect width="800" height="320" fill="url(#grid)" />
          <path
            d="M40 250C120 250 150 120 230 120s110 150 190 150 130-200 210-200 90 60 130 60"
            fill="none"
            stroke="#3E5A47"
            strokeOpacity="0.13"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M40 250C120 250 150 120 230 120s110 150 190 150 130-200 210-200 90 60 130 60"
            fill="none"
            stroke="#3E5A47"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="1200"
            className="animate-draw"
          />
          <circle cx="230" cy="120" r="7" fill="#9DB3A3" stroke="#fff" strokeWidth="2.5" />
          <circle cx="630" cy="70" r="7" fill="#9DB3A3" stroke="#fff" strokeWidth="2.5" />
          <circle cx="420" cy="270" r="11" fill="#111812" stroke="#FAF8F5" strokeWidth="3" />
          <circle
            cx="420"
            cy="270"
            r="11"
            fill="none"
            stroke="#111812"
            strokeOpacity="0.35"
            strokeWidth="1.5"
            className="origin-[420px_270px] animate-pulse-ring"
          />
        </svg>

        <div className="absolute bottom-5 left-1/2 w-[min(92%,380px)] -translate-x-1/2 animate-float">
          <div className="flex items-center gap-3.5 rounded-2xl border border-charcoal/[0.07] bg-paper/95 p-3.5 shadow-lift backdrop-blur">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-matcha-500 text-bone">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-charcoal">
                « Message de Camille »
              </p>
              <p className="mt-0.5 text-[11.5px] text-charcoal-faint">
                Déclenché au km 21,3 · 14 s · hors-ligne
              </p>
            </div>
            <div className="ml-auto flex items-end gap-[3px]" aria-hidden="true">
              {[8, 15, 22, 13, 19, 9, 16].map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-matcha-300 animate-bob"
                  style={{ height: h, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
