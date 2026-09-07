# EchoRun

> Les voix de tes proches, au bon kilomètre.

Un coureur importe le `.gpx` de sa course et partage un lien. Ses proches ouvrent
ce lien, cliquent sur un point du tracé et enregistrent un vocal. Le jour J, le
GPS du coureur annonce « Message de Camille » puis joue le vocal, pile à cet
endroit • **sans réseau**.

---

## Démarrage

### Prérequis

- **Node 22** (ligne LTS) • voir ci-dessous
- [Supabase CLI](https://supabase.com/docs/guides/cli) (orchestre sa propre stack Docker)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) pour tester les webhooks en local

### Version de Node

La version est épinglée en quatre endroits qui doivent rester cohérents :

| Fichier | Rôle |
|---|---|
| `.nvmrc` | `nvm use` |
| `.node-version` | `fnm` / `nodenv` / `asdf-nodejs` |
| `package.json` → `engines` | avertissement npm si la version est hors bornes |
| `Dockerfile`, `Dockerfile.dev` | `node:22-alpine` |

```bash
nvm use          # ou : fnm use
nvm install      # si la 22 n'est pas encore installée
```

On épingle la **ligne majeure** (`22`) et pas un patch exact : tout le monde
travaille sur une version compatible sans avoir à modifier le fichier à chaque
correctif de sécurité. Si tu veux du strictement identique, remplace le contenu
de `.nvmrc` et `.node-version` par le numéro complet (`22.23.2`) • au prix d'un
`nvm install` pour chaque nouvelle personne.

Pour que le changement de version soit automatique en entrant dans le dossier,
ajoute le hook `cd` de nvm à ton shell
([documentation](https://github.com/nvm-sh/nvm#deeper-shell-integration)), ou
utilise `fnm` qui le fait nativement.

En CI, ne recopie pas le numéro : `actions/setup-node` lit le fichier
directement.

```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'
    cache: 'npm'
```

### Installation

```bash
nvm use
npm install

# Initialise la config du CLI Supabase sans toucher aux migrations existantes
supabase init          # répondre "no" si on propose d'écraser quoi que ce soit
supabase start         # base + auth + storage en local
supabase db reset      # applique supabase/migrations/* + seed.sql

cp .env.example .env.local
# Renseigner les clés affichées par `supabase start`
```

`supabase start` imprime l'`anon key` et la `service_role key` : les coller dans
`.env.local`.

```bash
npm run dev            # http://localhost:3000
```

Dans un second terminal, pour que le webhook Stripe arrive :

```bash
npm run stripe:listen  # copier le whsec_… dans STRIPE_WEBHOOK_SECRET
```

### Se donner les droits admin

Après une première connexion (magic link), le mail de dev est visible dans
l'inbox locale de Supabase (`http://127.0.0.1:54324`). Ensuite :

```sql
update public.profiles set is_admin = true where email = 'moi@exemple.fr';
```

Le back-office est alors accessible sur `/admin`.

### Docker

`docker-compose.yml` ne gère que l'app Next (la stack Supabase est pilotée par
son propre CLI) :

```bash
docker compose up
```

Build de production auto-hébergé :

```bash
DOCKER_BUILD=1 docker build -t echorun .
```

---

## Stack

| Brique | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 15, App Router | Server Components pour injecter la config AdSense au rendu (zéro CLS, zéro appel client) |
| Styles | Tailwind CSS v4 (`@theme` CSS-first) | Le design system tient dans un seul fichier, `src/app/globals.css` |
| Données | Supabase • Postgres, Auth, Storage, RLS | RLS = cloisonnement au niveau base, pas au niveau applicatif |
| Auth | Magic link (OTP e-mail) | Aucun mot de passe à stocker, aucun écran de reset à construire |
| Carte | Leaflet en impératif, **sans** react-leaflet | 3 besoins seulement (tracé, pastilles, clic) ; pas de dépendance au cycle React |
| Paiement | Stripe Checkout hébergé | PCI sans effort, Apple/Google Pay natifs, proches anonymes |
| Offline | IndexedDB (`idb`) + service worker écrit à la main | Un Blob en IndexedDB ne périme pas, contrairement à une URL signée |
| PWA | `manifest.webmanifest` + `public/sw.js` | Pas de plugin de build : comportement prévisible le jour de la course |

---

## Architecture en une page

```
src/
├── app/
│   ├── page.tsx                      Landing (contenu AdSense)
│   ├── comment-ca-marche/            Guide détaillé (contenu AdSense)
│   ├── confidentialite/              Politique de confidentialité (contenu AdSense)
│   ├── mentions-legales/             CGU + mentions (contenu AdSense)
│   ├── offline/                      Fallback servi par le service worker
│   ├── login/                        Magic link
│   ├── auth/callback/                Échange code ↔ session
│   │
│   ├── e/[slug]/                     ★ TUNNEL PROCHE (public, anonyme, noindex)
│   │   ├── page.tsx                  Server Component : charge la course
│   │   ├── load-public-race.ts       Projection publique (service_role)
│   │   └── ContributorFlow.tsx       Carte + quota + micro + paywall + AdSense
│   │
│   ├── (runner)/                     Espace coureur (authentifié)
│   │   ├── layout.tsx                Garde de session
│   │   └── app/
│   │       ├── page.tsx              Liste des courses
│   │       ├── races/new/            Import GPX
│   │       └── races/[id]/
│   │           ├── page.tsx          Détail + lien de partage + messages
│   │           ├── live/             ★ MODE COURSE (GPS + audio + offline)
│   │           └── finish/           Récapitulatif + AdSense
│   │
│   ├── admin/                        Back-office (garde is_admin)
│   └── api/
│       ├── public/{contributor,message,checkout}/   service_role, proches anonymes
│       ├── races/[…]                 Authentifié, passe par RLS
│       ├── admin/settings/           Écriture arbitrée par RLS
│       └── stripe/webhook/           Source de vérité du paiement
│
├── components/
│   ├── ads/AdSenseUnit.tsx           Bloc pub sécurisé, intégré à la charte
│   ├── consent/                      Bannière cookies + Consent Mode v2
│   ├── map/RaceMap.tsx               Leaflet impératif
│   ├── recorder/RecorderPanel.tsx    Micro + VU-mètre + relecture
│   └── ui/                           Button, Surface, Field, MiniBars
│
└── lib/
    ├── audio/chained-player.ts       ★ TTS puis audio, file séquentielle
    ├── audio/recorder.ts             MediaRecorder (Opus / AAC Safari)
    ├── geo/geo-engine.ts             ★ Détection de proximité + Wake Lock
    ├── geo/geometry.ts               Haversine, Douglas-Peucker, snap au tracé
    ├── geo/gpx.ts                    Parseur GPX sans dépendance
    ├── offline/db.ts                 IndexedDB (métadonnées + Blobs)
    ├── offline/prefetch.ts           Téléchargement de la course
    ├── settings.ts                   Config AdSense/tarifs depuis le BO
    └── quota.ts                      Source de vérité unique du quota
```

Les trois fichiers marqués ★ portent l'essentiel de la difficulté du produit.
Ils sont commentés en conséquence • commencer par là.

Décisions détaillées, pièges iOS et roadmap : **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

Application native (iOS/Android) via Capacitor • échafaudage en place, build et
publication : **[docs/NATIVE.md](docs/NATIVE.md)**.

---

## Deux modes de course

Une course peut être créée de deux façons :

- **GPX** • le coureur importe son tracé (fichier) **ou le dessine sur la carte**
  (chemin calé sur les routes, cf. docs section 7 quinquies), ses proches cliquent
  un point sur la carte, le **GPS** déclenche les vocaux au bon endroit.
- **Temps** • le coureur annonce une durée prévue (ex. 2 h), ses proches
  placent leurs vocaux sur une **frise** (« à 45 min »), un **chronomètre** les
  déclenche à la bonne minute. Pas de GPS : plus simple et plus fiable, mais
  l'écran doit rester allumé (contrainte de l'autoplay audio, comme en GPX).

Le mode est porté par `races.mode`. Détails dans
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), section 7 quater.

## Modèle de données

| Table | Rôle |
|---|---|
| `profiles` | Miroir de `auth.users`, porte `is_admin` |
| `races` | Course + tracé simplifié en `jsonb` + `share_slug` |
| `contributors` | Un proche anonyme, identifié par `claim_token` ; unique par `(race_id, lower(name))` |
| `audio_messages` | Un vocal : chemin storage, position, `distance_m`, `trigger_radius_m`, `played_at` |
| `payments` | Sessions Stripe, `pending → paid` par webhook |
| `app_settings` | Ligne unique éditée par le BO : clés AdSense, activation, tarifs |

Fonctions : `contributor_quota()` (règle de quota unique), `admin_stats()` (toutes
les métriques du BO en une requête), `increment_paid_credits()` (incrément
atomique appelé par le webhook), `is_admin()` / `owns_race()` (helpers RLS).

### Modèle de sécurité

Deux populations, deux mécanismes • c'est le point à retenir :

- **Le coureur est authentifié** → toutes ses lectures/écritures passent par
  l'`anon key` avec RLS active. Un coureur ne peut techniquement pas voir la
  course d'un autre.
- **Le proche est anonyme** → aucune policy `anon` n'est ouverte en base. Ses
  écritures passent par des Route Handlers en `service_role`, qui valident tout
  (slug, quota, format, taille, collision de position). Le `claim_token` n'ouvre
  aucun droit supplémentaire par rapport à la simple possession du lien.

Les audios vivent dans un bucket **privé**. Aucune URL publique : le coureur les
télécharge via des URL signées à 30 minutes, générées côté serveur.

---

## Monétisation

- **2 vocaux offerts par proche et par course** (`races.free_quota`, modifiable
  par course).
- Au-delà : Stripe Checkout, prix lu **en base** (`app_settings`), jamais envoyé
  par le client.
- Le webhook `checkout.session.completed` crédite via `increment_paid_credits`,
  idempotent sur les rejeux Stripe.
- `audio_messages.is_billable` marque les vocaux consommés au-delà du quota
  gratuit : c'est ce qui alimente le taux de conversion du BO.

> **Note économique.** À 0,99 €, Stripe prélève 0,25 € + 1,5 % ≈ 0,26 €, soit
> 26 % de marge brute perdue. Le champ `extra_message_credits` du BO existe pour
> tester un pack (5 vocaux à 2,99 €) sans redéployer.

---

## Publicité

`<AdSenseUnit />` (`src/components/ads/AdSenseUnit.tsx`) applique six garde-fous :

1. rien ne s'affiche si `client_id`/`slot_id` ne passent pas la validation regex ;
2. un seul `push()` par `<ins>`, même en React Strict Mode ;
3. remontage propre au changement de slot (via `key`) ;
4. repli du conteneur si Google ne remplit pas • pas de trou dans la maquette ;
5. placeholder hors production, pour ne jamais générer d'impression de test ;
6. **rien avant le consentement** • le loader lui-même n'est pas monté.

Emplacements : landing, page proche, page de fin de course. **Jamais pendant une
course.**

### Consentement (RGPD / ePrivacy)

`src/components/consent/` implémente Google **Consent Mode v2** :

- les signaux `ad_storage`, `ad_user_data`, `ad_personalization` et
  `analytics_storage` sont posés à `denied` en `beforeInteractive`, donc avant
  tout tag Google ;
- tant qu'aucun choix n'est exprimé, **le script AdSense n'est pas chargé** •
  zéro requête vers Google ;
- en cas de refus, le script est chargé avec Consent Mode toujours `denied` et
  `requestNonPersonalizedAds` armé : annonces contextuelles, aucun cookie
  publicitaire. Le refus réduit le revenu, il ne le supprime pas ;
- « Tout refuser » a exactement le même poids visuel que « Tout accepter »
  (exigence CNIL), il n'y a pas de croix de fermeture, et le choix est révocable
  depuis le pied de page ;
- **si `ads_enabled` est à `false` dans le back-office, aucune bannière ne
  s'affiche** : sans cookie non essentiel, il n'y a rien à consentir ;
- un changement d'avis après un premier choix recharge la page, pour que Google
  re-demande les annonces avec les bons signaux (cf. `docs/ARCHITECTURE.md` §7 bis) ;
- la bannière ne s'affiche jamais sur l'écran de course.

Pour forcer une nouvelle demande de consentement (nouvelle finalité, nouveau
sous-traitant), incrémenter `CONSENT_VERSION` dans `src/lib/consent.ts`.

---

## Identité visuelle et SEO

### Icônes

`src/app/icon.svg` est la **source unique**. Tout le reste est dérivé :

```bash
npm run icons
```

| Généré | Usage |
|---|---|
| `src/app/favicon.ico` | 16/32/48, navigateurs sans support du SVG |
| `src/app/apple-icon.png` | touch icon iOS, 180 px |
| `public/icons/icon-192.png`, `icon-512.png` | manifeste PWA |
| `public/icons/maskable-512.png` | Android, marque réduite à 76 % pour la zone sûre |

Ne pas éditer les fichiers générés à la main : modifier le SVG et rejouer la
commande. La géométrie a été arrêtée après comparaison visuelle en 16 / 24 /
32 / 48 px • le wordmark horizontal du site est illisible en favicon, d'où une
marque carrée distincte sur fond matcha plein.

`scripts/generate-icons.mjs` assemble aussi le `.ico` à la main (en-tête de
6 octets + PNG embarqués) : `sharp` ne sait pas écrire ce format, et une
dépendance de plus pour ça serait disproportionné.

### Fond de carte

Le fond des cartes est **configurable et sans clé par défaut** (Esri World
Light Gray, clair et sobre) • cf. `src/lib/map-tiles.ts`. CARTO, qu'on utilisait
au départ, exige désormais une clé API : ses tuiles renvoient
« API KEY REQUIRED » sans elle.

Pour un rendu plus soigné en production, un fournisseur avec clé (MapTiler,
CARTO, Stadia) se branche via variables d'environnement, sans toucher au code :

```
NEXT_PUBLIC_MAP_TILE_URL="https://api.maptiler.com/maps/dataviz-light/{z}/{x}/{y}.png?key=TA_CLE"
NEXT_PUBLIC_MAP_ATTRIBUTION="© MapTiler © OpenStreetMap"
```

MapTiler a un palier gratuit (100 000 chargements/mois) et un style
« dataviz-light » très proche de l'esthétique visée.

### Référencement

| Fichier | Rôle |
|---|---|
| `src/lib/site.ts` | constantes partagées, liste des routes publiques et des préfixes privés |
| `src/app/robots.ts` | `/robots.txt`, généré depuis `PRIVATE_PREFIXES` |
| `src/app/sitemap.ts` | `/sitemap.xml`, généré depuis `PUBLIC_ROUTES` |
| `src/app/opengraph-image.tsx` + `twitter-image.tsx` | visuel de partage 1200×630, rendu par `next/og` |
| `src/components/StructuredData.tsx` | JSON-LD : WebSite, Organization, WebApplication, HowTo, FAQPage |

Trois points d'attention :

- **`/e/` est dans `PRIVATE_PREFIXES`.** Un lien de partage est un secret
  porteur : indexé, n'importe qui pourrait déposer un vocal sur la course d'un
  inconnu. Les courses ne sont pas listées dans le sitemap pour la même raison.
- **La FAQ est une donnée**, dans `comment-ca-marche/page.tsx`. Elle alimente
  le rendu *et* le balisage `FAQPage`. Un balisage décrivant des questions
  absentes de la page visible est un motif de rejet chez Google • ce qui
  finit toujours par arriver quand les deux sont saisies séparément.
- **L'image OG passe par `next/og`, pas par sharp.** Satori convertit le texte
  en tracés : le rendu ne dépend d'aucune police installée sur la machine.
  C'est l'inverse du choix fait pour les icônes, qui n'ont pas de texte.

Pour ajouter une page publique : l'inscrire dans `PUBLIC_ROUTES`, elle apparaît
alors dans le sitemap et reste autorisée par `robots.txt`.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de dev |
| `npm run build` | Build de production |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (config Next) |
| `npm run db:reset` | Réapplique migrations + seed |
| `npm run db:push` | Pousse les migrations vers le projet distant |
| `npm run icons` | Régénère favicon, icône Apple et icônes PWA depuis `src/app/icon.svg` |
| `npm run admin -- <email>` | Promeut (ou `--revoke` rétrograde, `--list` liste) un administrateur |
| `npm run stripe:listen` | Relaie les webhooks Stripe en local |

---

## Auto-réparation du profil coureur

Le profil (`public.profiles`) est créé par le trigger `on_auth_user_created`
au moment de l'inscription. Ce trigger est le chemin nominal, **mais pas la
seule garantie** : tout compte créé avant que le trigger existe • ou pendant
une panne • se retrouverait authentifié sans profil, et bloqué en écriture
(violation de clé étrangère `23503`) sans recours depuis l'interface.

Trois filets, posés par la migration `20260904120000_profile_self_heal.sql` et
`src/lib/profile.ts` :

1. **Rattrapage** : la migration crée les profils manquants pour tous les
   comptes existants.
2. **Auto-réparation applicative** : `getOrCreateProfile()` recrée le profil à
   la volée s'il manque, à l'entrée de l'espace coureur (`(runner)/layout.tsx`),
   du back-office et de `POST /api/races`. L'écriture passe par RLS.
3. **Trigger résilient** : `handle_new_user()` ne peut plus faire échouer une
   inscription • en cas d'erreur imprévue il journalise et laisse le compte se
   créer, l'auto-réparation prend le relais.

La policy d'insertion borne la création à `id = auth.uid()` **et**
`is_admin = false` : un utilisateur ne peut ni créer le profil d'un autre, ni
s'auto-promouvoir administrateur. Les deux cas sont vérifiés dans les tests de
migration.

### Promouvoir un administrateur

Puisque personne ne peut s'auto-promouvoir, `is_admin` se règle hors de
l'application, via un script qui utilise la clé `service_role` :

```bash
npm run admin -- toi@exemple.fr          # promeut
npm run admin -- toi@exemple.fr --revoke # rétrograde
npm run admin -- --list                  # liste les administrateurs
```

Le script fonctionne à l'identique en local et contre le projet cloud de
production (il lit `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
depuis `.env.local`, `.env` ou l'environnement). La personne doit s'être
connectée au moins une fois, puis **se reconnecter** après la promotion pour
que `/admin` s'ouvre.

## Ce qui reste à faire avant une mise en production

- [ ] Compléter les mentions légales (forme juridique, RCS, éditeur)
- [x] ~~Bannière de consentement cookies~~ • faite, Consent Mode v2
- [x] ~~Icônes PWA~~ • faites, régénérables par `npm run icons`
- [ ] **SMTP personnalisé** (Resend / Brevo / Postmark) • le service e-mail intégré de
      Supabase est plafonné à 2 envois/heure et n'envoie qu'aux membres de
      l'organisation. Bloquant dès les premiers testeurs.
- [ ] Rate limiting distribué (l'implémentation actuelle est en mémoire, mono-instance)
- [ ] Purge du storage à la suppression d'une course (cron Supabase)
- [ ] Rétention 12 mois des vocaux (cron + e-mail d'avertissement)
- [ ] Modération : signalement d'un vocal par le coureur
