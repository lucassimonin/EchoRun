import type { Metadata } from 'next';
import { AdSenseUnit } from '@/components/ads/AdSenseUnit';
import { AppJsonLd, HowToJsonLd, SiteJsonLd } from '@/components/StructuredData';
import { SiteFooter } from '@/components/marketing/SiteFooter';
import { SiteHeader } from '@/components/marketing/SiteHeader';
import { ButtonLink } from '@/components/ui/Button';
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
  },
  {
    key: 'draw',
    tag: 'Sans fichier',
    title: 'Dessine ton parcours',
    body: 'Pose tes points sur la carte, EchoRun les cale sur les vraies routes. Idéal pour un entraînement ou une boucle maison.',
  },
  {
    key: 'time',
    tag: 'Pas de tracé ?',
    title: 'Cale sur le temps',
    body: 'Annonce ta durée — disons 2 h — et tes proches déposent leurs voix sur une frise. Le chrono les déclenche à la minute pile.',
  },
];

const USE_CASES = [
  {
    tag: 'MARATHON',
    title: 'Le mur du 30ᵉ',
    body: 'Sur un marathon, tout le monde sait où ça casse. Place trois voix entre le 30 et le 35 : c’est exactement là qu’elles servent.',
  },
  {
    tag: 'TRAIL',
    title: 'Là où personne ne vient',
    body: 'Cols, forêts, ravitaillements inaccessibles. Tes proches ne peuvent pas être au bord du chemin — leur voix, si.',
  },
  {
    tag: '10 KM',
    title: 'Ton premier dossard',
    body: 'La ligne d’arrivée fait peur quand on ne l’a jamais franchie. Un message à 500 m du bout change la fin de l’histoire.',
  },
  {
    tag: 'SURPRISE',
    title: 'Un anniv en dossard',
    body: 'Courir le jour de ses 40 ans, et recevoir dix messages surprises échelonnés sur le parcours. Personne ne le voit venir.',
  },
];

const BENEFITS = [
  {
    label: 'Zéro appli pour tes proches',
    body: 'Un lien web. Ça marche sur le vieil iPhone de ta mère comme sur l’Android de ton frère.',
  },
  {
    label: 'Zéro réseau en course',
    body: 'Les vocaux sont téléchargés sur ton téléphone la veille. En pleine forêt, ça fonctionne pareil.',
  },
  {
    label: 'Rien à toucher en courant',
    body: 'Pas de notif à lire, pas d’écran à déverrouiller. Ça parle dans tes écouteurs, tu continues à courir.',
  },
  {
    label: 'Tu gardes tout',
    body: 'Après la course, les messages restent. C’est le seul souvenir de ta course qui a une voix.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Au 32ᵉ, j’étais en train de lâcher. J’ai entendu la voix de ma fille : « allez papa, plus que dix ». J’ai fini en pleurant, mais j’ai fini.',
    author: 'Karim',
    detail: 'Marathon de Paris',
  },
  {
    quote:
      'J’ai mis des messages à chaque col pour ma sœur sans lui dire. Elle m’a appelée le soir, elle n’avait pas compris d’où venaient les voix.',
    author: 'Léa',
    detail: '6 vocaux sur un trail de 45 km',
  },
  {
    quote:
      'Le truc, c’est que ça arrive au bon moment. Un encouragement au départ ne sert à rien. Au 18ᵉ, ça change tout.',
    author: 'Sophie',
    detail: 'Semi de Lille',
  },
];

export default async function LandingPage() {
  const settings = await getAppSettings();
  const ad = adSlotFor(settings, 'landing');

  return (
    <>
      <SiteJsonLd />
      <AppJsonLd extraMessagePriceCents={settings.unlock_price_cents} />
      <HowToJsonLd />

      <SiteHeader />

      <main>
        {/* ------------------------------------------------------------- hero */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-xl animate-rise">
            <span className="inline-flex items-center gap-2 rounded-md border-[3px] border-black bg-neon px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-black shadow-[3px_3px_0_0_#000]">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-black/50 animate-pulse-ring" />
                <span className="relative inline-flex size-2.5 rounded-full bg-black" />
              </span>
              Encouragements vocaux géolocalisés
            </span>

            <h1 className="mt-6 text-[clamp(2.5rem,6vw,4.25rem)] font-bold uppercase leading-[0.9] tracking-[-0.02em] text-black">
              Les voix de
              <br />
              tes proches,
              <br />
              <span className="bg-orange px-2 text-white">
                au bon km.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lede font-medium text-black">
              Tes proches déposent un message vocal sur un point précis de ton parcours. Le jour de
              la course, ton téléphone le déclenche tout seul quand tu passes devant. Toi, tu cours.
              Eux, ils sont là.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/login" size="lg">
                Créer ma course
              </ButtonLink>
              <ButtonLink href="/comment-ca-marche" size="lg" variant="secondary">
                Comment ça marche
              </ButtonLink>
            </div>

            <p className="mt-5 font-mono text-[12px] font-bold uppercase tracking-[0.06em] text-black/70">
              Gratuit pour tes proches · {settings.free_message_cap} messages offerts · zéro appli
            </p>
            </div>
            <div className="animate-rise">
              <TriggerPreview />
            </div>
          </div>
        </section>

        {/* --------------------------------------------- 3 façons de créer */}
        <section className="border-t-[3px] border-black bg-off">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <SectionHead
              eyebrow="Trois façons de démarrer"
              title="Avec ou sans fichier, il y a toujours un moyen"
            />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {CREATION_MODES.map((mode, index) => (
                <div
                  key={mode.key}
                  className="group animate-rise rounded-lg border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000] transition-transform duration-100 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#000]"
                  style={{ animationDelay: index * 80 + 'ms' }}
                >
                  <span className="inline-block rounded-md border-2 border-black bg-yellow px-2 py-0.5 font-mono text-[24px] font-bold leading-none tnum">
                    0{index + 1}
                  </span>
                  <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-orange">
                    {mode.tag}
                  </p>
                  <h3 className="mt-1 text-[19px] font-bold uppercase tracking-[-0.01em] text-black">
                    {mode.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-muted">
                    {mode.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- 3 étapes */}
        <section className="border-t-[3px] border-black">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <SectionHead eyebrow="Le principe" title="Trois minutes pour tout mettre en place" />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((item, index) => (
                <div
                  key={item.step}
                  id={'etape-' + (index + 1)}
                  className="animate-rise rounded-lg border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000]"
                  style={{ animationDelay: index * 80 + 'ms' }}
                >
                  <span className="font-mono text-[40px] font-bold leading-none text-black/15 tnum">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-[18px] font-bold uppercase tracking-[-0.01em] text-black">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ cas d'usage */}
        <section className="border-t-[3px] border-black bg-off">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <SectionHead
              eyebrow="Quand ça sert vraiment"
              title="Un encouragement ne vaut que par son timing"
            />
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {USE_CASES.map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000] transition-transform duration-100 hover:-translate-y-[2px] hover:shadow-[6px_6px_0_0_#000]"
                >
                  <span className="inline-block rounded border-2 border-black bg-neon px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
                    {item.tag}
                  </span>
                  <h3 className="mt-3 text-[18px] font-bold uppercase tracking-[-0.01em] text-black">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-charcoal-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- bénéfices */}
        <section className="border-t-[3px] border-black">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <div className="rounded-lg border-[3px] border-black bg-black px-6 py-12 shadow-[6px_6px_0_0_#000] sm:px-12">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-neon">
                Ce que ça change
              </p>
              <h2 className="mt-3 max-w-2xl text-[clamp(1.6rem,4vw,2.25rem)] font-bold uppercase leading-[1.02] tracking-[-0.01em] text-yellow">
                Pensé pour le seul moment qui compte : pendant l’effort.
              </h2>
              <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {BENEFITS.map((item) => (
                  <div key={item.label} className="border-t-2 border-yellow/30 pt-4">
                    <h3 className="text-[15px] font-bold uppercase tracking-[0.01em] text-neon">
                      {item.label}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-white/80">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- témoignages */}
        <section className="border-t-[3px] border-black bg-off">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <SectionHead eyebrow="Retours de coureurs" title="Ce qu’on nous raconte à l’arrivée" />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((item) => (
                <figure
                  key={item.author}
                  className="flex flex-col justify-between rounded-lg border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000]"
                >
                  <blockquote className="text-[14.5px] font-medium leading-relaxed text-black">
                    « {item.quote} »
                  </blockquote>
                  <figcaption className="mt-6 font-mono text-[11px] uppercase tracking-[0.06em] text-charcoal-faint">
                    <span className="font-bold text-black">{item.author}</span> · {item.detail}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- publicité */}
        {ad ? (
          <div className="border-t-[3px] border-black">
            <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
              <AdSenseUnit clientId={ad.clientId} slotId={ad.slotId} format="auto" minHeight={140} />
            </div>
          </div>
        ) : null}

        {/* ------------------------------------------------------------ tarifs */}
        <section className="border-t-[3px] border-black">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <SectionHead
              eyebrow="Tarifs"
              title={'Gratuit pour commencer. ' + formatPrice(settings.unlock_price_cents) + ' si ça déborde.'}
            />
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {/* Dossard "PROCHE" */}
              <BibCard bib="00" label="Tes proches" accent="bg-neon">
                <p className="text-[3rem] font-bold leading-none text-black tnum">0 €</p>
                <p className="mt-2 font-mono text-[12px] font-bold uppercase tracking-[0.05em] text-charcoal-faint">
                  Toujours. Ils ne paient jamais rien.
                </p>
                <ul className="mt-6 space-y-2.5 text-[14px] font-medium text-black">
                  <BibLi>Jusqu’à 5 messages par personne</BibLi>
                  <BibLi>Aucun compte, tout dans le navigateur</BibLi>
                  <BibLi>Enregistrement en un geste</BibLi>
                  <BibLi>Jusqu’à 30 secondes par message</BibLi>
                </ul>
              </BibCard>

              {/* Dossard "COUREUR" */}
              <BibCard bib="01" label="Toi, le coureur" accent="bg-orange">
                <p className="flex items-baseline gap-2">
                  <span className="text-[3rem] font-bold leading-none text-black tnum">
                    {settings.free_message_cap}
                  </span>
                  <span className="font-mono text-[13px] font-bold uppercase text-charcoal-faint">
                    messages offerts / course
                  </span>
                </p>
                <p className="mt-2 font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-charcoal-faint">
                  Puis {formatPrice(settings.unlock_price_cents)} pour débloquer jusqu’à{' '}
                  {settings.unlocked_message_cap}. Tu paies pour tout le monde.
                </p>
                <ul className="mt-6 space-y-2.5 text-[14px] font-medium text-black">
                  <BibLi>GPX, dessin sur carte ou mode chrono</BibLi>
                  <BibLi>Lien de partage illimité</BibLi>
                  <BibLi>Lecture hors-ligne pendant la course</BibLi>
                  <BibLi>Archive de tous les messages reçus</BibLi>
                </ul>
              </BibCard>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- CTA final */}
        <section className="border-t-[3px] border-black bg-orange">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8">
            <h2 className="mx-auto max-w-2xl text-[clamp(1.9rem,5vw,3rem)] font-bold uppercase leading-[0.95] tracking-[-0.01em] text-white">
              Ta prochaine course a une date. Donne-lui des voix.
            </h2>
            <p className="mx-auto mt-4 max-w-md font-medium text-black">
              GPX, tracé dessiné ou simple chrono — crée ta course et envoie le lien à tes proches.
              Il te reste juste à courir.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/login" size="lg" variant="dark">
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

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-orange">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[clamp(1.6rem,4vw,2.4rem)] font-bold uppercase leading-[1.0] tracking-[-0.01em] text-black">
        {title}
      </h2>
    </div>
  );
}

function BibCard({
  bib,
  label,
  accent,
  children,
}: {
  bib: string;
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000]">
      <div
        className={
          'flex items-center justify-between border-b-[3px] border-black px-5 py-3 ' + accent
        }
      >
        <span className="font-mono text-[13px] font-bold uppercase tracking-[0.1em] text-black">
          {label}
        </span>
        <span className="rounded border-2 border-black bg-white px-2 font-mono text-[15px] font-bold text-black tnum">
          {bib}
        </span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function BibLi({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[3px] size-3.5 shrink-0 border-2 border-black bg-neon" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/**
 * Aperçu "dossard" : un bandeau titre + un tracé qui se dessine + une carte de
 * notification style compteur rétro-digital.
 */
function TriggerPreview() {
  return (
    <div className="overflow-hidden rounded-lg border-[3px] border-black bg-off shadow-[6px_6px_0_0_#000]">
      {/* Bandeau dossard */}
      <div className="flex items-center justify-between border-b-[3px] border-black bg-black px-4 py-2.5">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-yellow">
          ECHORUN // DOSSARD
        </span>
        <span className="flex items-center gap-2 font-mono text-[11px] font-bold text-neon">
          <span className="size-2 rounded-full bg-neon animate-blink" />
          LIVE
        </span>
      </div>

      {/* Carte du parcours */}
      <div className="relative h-[200px] bg-off sm:h-[260px]">
        <svg
          viewBox="0 0 800 300"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0v40" fill="none" stroke="#000" strokeOpacity="0.08" />
            </pattern>
          </defs>
          <rect width="800" height="300" fill="url(#grid)" />
          <path
            d="M40 230C120 230 150 110 230 110s110 140 190 140 130-180 210-180 90 55 130 55"
            fill="none"
            stroke="#000"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="1200"
            className="animate-draw"
          />
          <circle cx="230" cy="110" r="9" fill="#00FF66" stroke="#000" strokeWidth="3" />
          <circle cx="630" cy="65" r="9" fill="#00FF66" stroke="#000" strokeWidth="3" />
          <circle cx="420" cy="250" r="13" fill="#FF5500" stroke="#000" strokeWidth="3.5" />
          <circle
            cx="420"
            cy="250"
            r="13"
            fill="none"
            stroke="#000"
            strokeOpacity="0.4"
            strokeWidth="2"
            className="origin-[420px_250px] animate-pulse-ring"
          />
        </svg>
      </div>

      {/* Bande notification, dans le flux : lisible sur mobile comme desktop */}
      <div className="flex items-center gap-3 border-t-[3px] border-black bg-white p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-md border-2 border-black bg-orange text-white">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold uppercase text-black">Message de Camille</p>
          <p className="mt-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.04em] text-charcoal-faint tnum">
            KM 21,3 · 14 S · OFFLINE
          </p>
        </div>
        <div className="ml-auto flex items-end gap-[3px]" aria-hidden="true">
          {[10, 18, 26, 15, 22, 11, 19].map((h, i) => (
            <span
              key={i}
              className="w-[3px] bg-orange animate-bob"
              style={{ height: h, animationDelay: i * 110 + 'ms' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
