# EchoRun — décisions d'architecture

Ce document explique **pourquoi** le code est écrit comme il est. Il vise le
développeur qui reprend le projet dans six mois, ou qui doit décider si on
empaquette en natif.

---

## 1. Le problème central : il n'y a pas de geofencing en PWA

C'est la contrainte qui structure tout le reste. Il faut l'avoir en tête avant
de toucher au code.

| Plateforme | Ce qui est possible | Ce qui ne l'est pas |
|---|---|---|
| iOS / Safari | `watchPosition` au premier plan | Géolocalisation en arrière-plan, Geofencing API, Web Push déclenché par la position. `watchPosition` **s'arrête** dès que Safari passe en arrière-plan ou que l'écran se verrouille. |
| Android / Chrome | `watchPosition`, survit quelques minutes en arrière-plan | Aucune garantie : le Doze mode finit par couper. Pas de Geofencing API (retirée de Chrome). |

Trois stratégies existaient. On a retenu la première.

### A. Mode « écran actif » — **retenu pour le MVP**

Le coureur démarre explicitement la course, l'application maintient l'écran
allumé (Screen Wake Lock API) et tourne au premier plan.

- Coût de développement : nul, c'est du web standard.
- Coût pour l'utilisateur : ~12 %/h de batterie, et une consigne à respecter.
- Fiabilité : totale tant que la consigne est suivie.

Le compromis est acceptable parce qu'un coureur avec un dossard a déjà son
téléphone dans un brassard, et qu'on annonce la contrainte franchement — sur la
page « Comment ça marche » comme sur l'écran de préparation. Une promesse tenue
vaut mieux qu'une promesse floue.

### B. Wrapper Capacitor + plugin de géolocalisation native

Vrai geofencing OS, écran éteint, poche fermée. Coût : comptes développeur
Apple/Google, revue des stores, deux à trois semaines, et la maintenance d'un
build natif.

**Le code est déjà prêt pour ce basculement.** `GeoEngine`
(`src/lib/geo/geo-engine.ts`) est le seul point de contact avec le GPS, derrière
une interface de quatre méthodes (`start`, `stop`, `seedConsumed`, callbacks).
Réimplémenter cette classe au-dessus d'un plugin natif ne touche **aucun**
composant React.

### C. Serveur qui pousse des notifications selon la position

Impose de remonter la position en continu au serveur : contraire à notre
promesse de confidentialité, et de toute façon impossible en arrière-plan sur
iOS. Écarté.

---

## 2. La chaîne audio : trois pièges iOS

`src/lib/audio/chained-player.ts`. Chacun de ces trois points est une cause de
« ça ne marche pas sur iPhone » qu'on a traitée explicitement.

### Piège 1 — le déblocage

Un `HTMLAudioElement` ne peut démarrer que depuis un geste utilisateur. On crée
donc **un seul** élément, on le débloque avec un WAV silencieux de 60 ms au clic
sur « Démarrer la course », puis on ne fait plus que remplacer son `src` par des
`blob:` URL. Un élément créé plus tard dans la course serait bloqué.

> Corollaire dans `LiveClient.tsx` : `player.unlock()` est appelé **avant tout
> autre `await`** dans le handler. Un `await` sur autre chose d'abord ferait
> perdre le contexte de geste utilisateur.

### Piège 2 — la synthèse vocale ne rend pas toujours la main

`speechSynthesis` exige aussi un geste préalable (on « chauffe » le moteur dans
le même clic), et son évènement `onend` n'est pas fiable sur iOS. Chaque annonce
est donc doublée d'un garde-fou temporel (~95 ms par caractère, plafonné à 6 s).
Sans lui, une annonce muette bloquerait la file **définitivement** — plus aucun
message pour le reste de la course.

### Piège 3 — le séquencement

TTS et audio se coupent mutuellement s'ils se chevauchent. La file est donc
strictement séquentielle : un seul son à la fois. Si deux messages se
déclenchent au même carrefour, le second attend. Une pause de 180 ms entre
l'annonce et le vocal évite que Safari tronque le début du fichier.

---

## 3. Fiabilité du déclenchement

`GeoEngine.handlePosition`. Quatre mécanismes, tous justifiés par ce qui se
passe réellement en course.

**Filtre de précision.** Un fix à ±200 m déclencherait des messages au hasard.
On ignore les positions au-delà de 65 m de précision — sauf si aucun bon fix
n'est arrivé depuis 20 s, cas où un fix dégradé vaut mieux que rien.

**Rayon adaptatif.** Le rayon effectif s'élargit avec l'imprécision annoncée
(`radius + max(0, accuracy - 15)`, plafonné à 220 m). Inutile d'exiger d'être à
70 m pile quand le GPS annonce ±40 m.

**Rattrapage des points manqués.** Tunnel, forêt, coureur rapide : la fenêtre
peut être manquée. Dès que la progression sur le tracé dépasse un point non
déclenché de plus de `rayon + 60 m`, le message est joué en léger différé. Un
message n'est jamais perdu — pour la personne qui l'a enregistré, c'est ce qui
compte.

**Projection en fenêtre glissante.** La progression est calculée en ne scannant
qu'environ 260 points autour du dernier index connu. C'est à la fois une
optimisation (appelé à chaque fix, sur un tracé de 1 500 points) et une
protection contre les retours en arrière aberrants sur les parcours en boucle ou
en aller-retour. Une recherche globale est relancée si l'écart dépasse 400 m
(départ tardif, GPS perdu longtemps).

---

## 4. Stratégie hors-ligne

Deux stockages, deux rôles.

| Stockage | Contenu | Pourquoi celui-là |
|---|---|---|
| **IndexedDB** (`src/lib/offline/db.ts`) | Métadonnées des messages + **Blobs audio** + tracé + lectures à synchroniser | Seul stockage qui accepte des `Blob` de façon fiable sur iOS, et qui survit à un rechargement. Un Blob ne périme jamais, contrairement à une URL signée Supabase. |
| **CacheStorage** (`public/sw.js`) | Shell HTML/JS/CSS + tuiles de carte | C'est le rôle natif d'un service worker. |

Le service worker est **écrit à la main** plutôt que généré par `next-pwa` ou
`serwist`. Le seul besoin critique est que l'écran de course se charge sans
réseau ; 60 lignes lisibles valent mieux qu'un plugin de build dont on ne
maîtrise pas le comportement le matin du marathon. Il n'est enregistré qu'en
production — un SW actif en dev sert des bundles périmés et fait perdre un temps
considérable.

`requestPersistentStorage()` est appelé au moment de la préparation : sans ça,
iOS peut évincer le cache entre la veille au soir et le départ.

Le pré-téléchargement (`prefetch.ts`) est **séquentiel**, pas parallèle : sur un
réseau mobile faible, trois requêtes concurrentes échouent plus souvent qu'elles
n'accélèrent. Trois tentatives par fichier, avec backoff.

Les lectures sont enregistrées localement puis synchronisées de façon
opportuniste (à la lecture, au retour de l'évènement `online`, au chargement de
l'écran). Aucun échec de synchro n'a de conséquence sur la course.

---

## 5. Modèle de sécurité : deux populations

C'est l'autre décision structurante.

### Le coureur est authentifié → RLS

Toutes ses lectures et écritures passent par l'`anon key` avec Row Level
Security active. Les policies s'appuient sur deux helpers `security definer`
(`is_admin()`, `owns_race()`) dont le `search_path` est figé — sans ça, une
policy sur `profiles` qui lit `profiles` provoque une récursion infinie.

Conséquence : un coureur ne peut **techniquement pas** lire la course d'un
autre, même en cas de bug applicatif. C'est aussi vrai pour l'écriture de la
config du back-office : la route `PUT /api/admin/settings` ne teste pas
`is_admin` en JavaScript, elle laisse RLS refuser et interprète `0 ligne
modifiée` comme un 403.

### Le proche est anonyme → service_role côté serveur, aucune policy `anon`

Aucune policy n'est ouverte au rôle `anon`. Toutes les écritures du tunnel
proche passent par des Route Handlers en `service_role` qui valident : validité
du slug, statut de la course, quota, type MIME, taille, durée, collision de
position.

L'alternative — ouvrir des policies `anon` avec des contraintes en base — aurait
été plus « élégante » mais nettement plus difficile à auditer : la règle de
quota se serait retrouvée en double, dans une policy et dans le front.

Le `claim_token` n'est **pas** un secret d'authentification : il n'ouvre aucun
droit au-delà de ce que permet déjà la possession du lien de partage (poster un
message, lire son propre quota). Le vrai secret, c'est le `share_slug`.

### Le prénom comme identité

`contributors` porte un index unique sur `(race_id, lower(trim(name)))`. Sans
lui, vider son localStorage remettrait le compteur de messages gratuits à zéro.
C'est volontairement souple — deux Camille se partagent un quota — mais ça ferme
l'abus le plus évident sans imposer de compte. Si le contournement devient un
problème, l'étape suivante est un contrôle par SMS, pas un compte.

### Les fichiers audio

Bucket **privé**, aucune URL publique. Le coureur télécharge via des URL signées
à 30 minutes générées côté serveur. Les autres proches ne peuvent pas écouter
les messages : ils voient seulement qu'un point est occupé, et par quel prénom.

---

## 6. Pourquoi le tracé est en `jsonb` et pas en PostGIS

Aucune requête spatiale n'est faite côté serveur : tout le calcul de proximité
se fait sur l'appareil du coureur, hors-ligne. PostGIS n'apporterait qu'un index
GiST dont personne ne se sert, au prix d'une extension à gérer et de types moins
directs à sérialiser.

Le tracé est simplifié à l'import (Douglas-Peucker itératif — pas récursif : un
GPX de trail dépasse les 50 000 points et ferait sauter la pile). La tolérance
est adaptative pour viser ~1 500 points quelle que soit la source. La distance
cumulée est pré-calculée par point : c'est elle qui sert au tri de la file
d'attente et au rattrapage.

Le parseur GPX (`src/lib/geo/gpx.ts`) est une regex sur les attributs
`lat`/`lon` des `<trkpt>`. On n'a besoin de rien d'autre — ni élévation, ni
temps — et ça évite d'embarquer un parseur XML de 100 ko pour quinze lignes. Il
gère les deux ordres d'attributs (certains exports mettent `lon` avant `lat`) et
tourne **côté serveur** uniquement.

---

## 7. Publicité : les six garde-fous

`src/components/ads/AdSenseUnit.tsx`. Dans l'ordre d'importance :

1. **Rien ne s'affiche si ce n'est pas configuré.** `client_id` et `slot_id`
   sont validés par regex. Des appels invalides répétés sont un motif de
   suspension de compte AdSense.
2. **Un seul `push()` par `<ins>`.** React monte deux fois en Strict Mode ; un
   double push produit *« All ins elements in the DOM with class=adsbygoogle
   already have ads in them »*. Verrou par `ref` **et** lecture de l'attribut
   posé par le script Google.
3. **Remontage propre au changement de slot**, via une `key` sur le `<ins>` :
   Google refuse de re-remplir un élément déjà servi.
4. **Pas de boîte vide.** Si Google ne remplit pas (inventaire, bloqueur), le
   conteneur se replie au lieu de laisser un trou dans la maquette.
5. **Placeholder hors production**, pour ne jamais générer d'impression de test
   — comptée comme trafic invalide.
6. **Rien avant le consentement** : tant que l'utilisateur n'a pas répondu à la
   bannière, le loader n'est même pas monté. Pousser dans une file inexistante
   produirait une erreur console à chaque bloc et laisserait un cadre vide.

Le loader (`AdSenseScript`) est injecté par le layout racine, en
`afterInteractive` : le script pèse ~150 ko et ne doit pas peser sur le LCP de
la landing, qui est un critère de qualité AdSense lui-même.

**Aucune publicité pendant une course.** Non négociable : c'est le moment où le
produit doit être silencieux.

### Contenu requis par AdSense

Quatre pages textuelles substantielles, statiquement rendues et indexables :
`/`, `/comment-ca-marche`, `/confidentialite`, `/mentions-legales`. La page de
dépôt `/e/[slug]` est en revanche en `noindex` — un lien de partage ne doit
jamais finir dans Google.

---

## 7 bis. Consentement : Consent Mode v2, et pourquoi le refus rapporte quand même

`src/components/consent/`. Trois états, trois comportements — c'est le cœur du
dispositif.

| État | Script AdSense | Consent Mode | Ce que voit l'utilisateur |
|---|---|---|---|
| Aucun choix | **pas chargé** | `denied` (défaut) | Bannière, aucune pub, zéro requête vers Google |
| Refus | chargé | reste `denied` + `requestNonPersonalizedAds` | Annonces contextuelles, aucun cookie publicitaire |
| Acceptation | chargé | `granted` | Annonces personnalisées |

**Le point non évident : refuser ne supprime pas le revenu.** Beaucoup
d'implémentations traitent le refus comme « pas de publicité du tout », ce qui
transforme chaque refus en perte sèche. Google sait servir des annonces
contextuelles sans cookie — c'est légal, et ça représente typiquement 40 à 60 %
du CPM personnalisé. D'où le choix de charger le script en cas de refus, mais
avec les signaux baissés.

### Pourquoi Consent Mode v2 et pas seulement un booléen maison

Depuis mars 2024, `ad_user_data` et `ad_personalization` sont **obligatoires**
pour le trafic EEE. Sans eux, Google ne se contente pas de servir du
non-personnalisé : il cesse aussi de remonter la mesure, et l'inventaire se
dégrade au-delà de ce que le refus justifierait. Les omettre coûte du revenu —
ce n'est pas un détail de conformité.

### L'ordre de chargement est la seule vraie difficulté

Les commandes `consent default` doivent atteindre le `dataLayer` **avant** tout
tag Google. D'où `ConsentModeDefaults` en `strategy="beforeInteractive"`, rendu
dans le `<head>` du layout racine, alors que le loader AdSense est en
`afterInteractive` — et de toute façon monté seulement après un choix.

Même problème à plus petite échelle pour `requestNonPersonalizedAds` : le
drapeau doit être posé avant que `next/script` n'injecte la balise, ce qui se
produit après le commit React. Il est donc écrit **en phase de rendu** dans
`AdSenseScript` — une entorse assumée et commentée, car un `useEffect` ne
garantirait pas cet ordre relatif.

### Le changement d'avis impose un rechargement

Piège trouvé au test : un utilisateur qui refuse puis accepte dans la même
session restait servi en non-personnalisé. Le drapeau
`requestNonPersonalizedAds` avait été armé par le refus et n'était jamais
nettoyé — du revenu perdu alors que l'accord avait été donné. Le cas
symétrique est plus grave : accepter puis refuser laissait des annonces
personnalisées à l'écran.

Deux corrections, complémentaires :

1. le drapeau est explicitement **supprimé** quand la publicité est acceptée,
   pas seulement posé quand elle est refusée ;
2. tout changement de décision **postérieur** à une première décision déclenche
   un `window.location.reload()`.

Le rechargement n'est pas de la paresse : Google fige les signaux au moment où
il demande les annonces. Sans repartir d'un document propre, aucune garantie que
les emplacements déjà servis respectent le nouveau choix. C'est ce que font les
CMP sérieuses, et ça évite de raisonner sur un état intermédiaire impossible à
tester.

Le premier choix, lui, ne recharge pas : le script n'était pas encore chargé.

Au rechargement de page, les valeurs par défaut repassent à `denied` : le
`ConsentProvider` rejoue donc le choix stocké au montage. Sans ce rejeu, un
utilisateur ayant accepté verrait des annonces non personnalisées à chaque
visite suivante.

### Décisions d'interface dictées par les lignes directrices CNIL

- « Tout refuser » et « Tout accepter » ont le **même poids visuel** : même
  taille, même largeur, même niveau. Un refus grisé ou relégué en lien invalide
  le consentement.
- **Aucune croix de fermeture.** Fermer sans choisir vaudrait acceptation
  implicite. Tant qu'aucun bouton n'est touché, rien n'est chargé.
- **Pas de superposition modale bloquante** : le site reste consultable pendant
  le choix, ce qui évite le « consentement par lassitude ».
- **Retrait aussi simple que le consentement** : lien en pied de chaque page et
  bouton sur la page de confidentialité.
- L'horodatage du choix est conservé (`decidedAt`) — c'est la preuve de
  consentement exigée par le RGPD.

### Deux détails qui évitent des ennuis

**Aucune bannière si la régie est éteinte.** Si `ads_enabled` est à `false`
dans le back-office, il n'y a aucun cookie non essentiel, donc rien à
consentir : `shouldAsk` reste `false`. Une bannière sans finalité n'est pas de
la conformité, c'est du bruit — et ça permet de lancer le produit sans pub sans
imposer un pop-up à personne.

**Aucune bannière pendant une course.** `CookieBanner` se retire sur
`/app/races/*/live`. L'écran de course n'affiche de toute façon aucune
publicité ; interrompre un coureur au 30ᵉ kilomètre pour parler de cookies
serait absurde.

### Stockage du choix

`localStorage`, pas un cookie : rien n'est envoyé au serveur, et on évite le
paradoxe du cookie de consentement. Si `localStorage` est indisponible (Safari
en navigation privée, stockage bloqué), la lecture échoue silencieusement et
l'état retombe sur « aucun choix » — donc aucune publicité. La dégradation va
toujours dans le sens protecteur.

`CONSENT_VERSION` dans `src/lib/consent.ts` force une nouvelle demande dès
qu'une finalité change. À incrémenter en même temps qu'on ajoute un
sous-traitant.

---

## 7 ter. Le piège des extensions Postgres sur Supabase

Rencontré en poussant les migrations sur un projet cloud :

```
ERROR: function gen_random_bytes(integer) does not exist (SQLSTATE 42883)
```

**Ce qui se passe.** Supabase pré-installe `pgcrypto` dans le schéma
`extensions`, qui n'est pas dans le `search_path` pendant une migration. Donc
`create extension if not exists pgcrypto` ne fait rien — l'extension existe
déjà — et l'appel non qualifié à `gen_random_bytes()` échoue.

Le détail qui égare : `gen_random_uuid()` fonctionne dans la même migration.
Ce n'est pas pgcrypto mais une fonction du cœur Postgres depuis la version 13.
On croit donc que pgcrypto est disponible alors que non.

**Ce qu'on n'a pas fait.** Qualifier en `extensions.gen_random_bytes()`
réglerait le cas Supabase et casserait sur tout Postgres où l'extension vit
dans `public` — un Postgres local, un autre hébergeur, un futur
auto-hébergement. Poser un `set search_path` en tête de migration marcherait
aussi, mais laisserait la dépendance en place pour la prochaine fois.

**Ce qu'on a fait.** Supprimé toute dépendance à une extension. Le schéma
n'utilise plus que du cœur Postgres :

| Besoin | Avant | Après |
|---|---|---|
| Jeton aléatoire | `encode(gen_random_bytes(24), 'hex')` | `encode(uuid_send(gen_random_uuid()) \|\| uuid_send(gen_random_uuid()), 'hex')` |
| E-mail insensible à la casse | type `citext` | `text` + index unique sur `lower(email)` |

Deux UUID v4 concaténés donnent 32 octets, soit 64 caractères hexadécimaux et
244 bits d'entropie — largement au-dessus des 24 octets d'origine.
`gen_random_uuid()` s'appuie sur le CSPRNG de Postgres, ce n'est pas un
générateur affaibli. `uuid_send()` est dans `pg_catalog`, toujours résoluble.

Conséquence côté application : `CLAIM_TOKEN_RE` dans `src/lib/api.ts` valide
désormais 64 caractères et non 48. Les deux doivent rester alignés.

### Valider une migration sans base distante

Les migrations sont vérifiables hors ligne sur un Postgres nu, avec un
simulacre minimal de Supabase — trois rôles, `auth.users`, `auth.uid()`,
`storage.buckets`, `storage.objects` et `storage.foldername()`, plus
`pgcrypto` volontairement installé dans `extensions` et hors du `search_path`
pour reproduire le piège ci-dessus.

C'est ce qui a permis de valider la correction, puis de rejouer le scénario
complet — inscription, course, quota, achat, unicité du prénom, contraintes de
validation, garde `admin_stats` — sans toucher au projet distant. À refaire
avant chaque `db push` sur une migration non triviale.

## 7 quater. Le mode « temps » : une course sans GPX

Tous les coureurs n'ont pas de fichier GPX. Le mode « temps » leur permet
d'annoncer une durée prévue (2 h) ; leurs proches placent leurs vocaux sur une
frise (« à 45 min ») plutôt que sur une carte, et un chronomètre les déclenche
le jour J.

### Un seul schéma, deux modes

Plutôt que des tables parallèles, une course porte un `mode` (`gpx` | `time`)
et chaque donnée propre à un mode est nullable, avec une contrainte CHECK qui
garantit la cohérence (migration `20260904130000_time_mode.sql`) :

- `races` : `duration_s` obligatoire si `mode='time'`, nul si `mode='gpx'` ;
- `audio_messages` : soit `lat`+`lng` (GPX), soit `trigger_at_s` (temps),
  jamais les deux, jamais aucun — une contrainte l'impose en base, testée.

Les contraintes ont été validées sur un vrai Postgres : les deux modes valides
passent, tous les cas incohérents (durée sur une course GPX, position + instant
sur un message, durée hors bornes) sont rejetés.

### `TimeEngine`, jumeau du `GeoEngine`

`src/lib/time/time-engine.ts` expose exactement la même interface publique que
le `GeoEngine` (`start`/`stop`/`pause`/`seedConsumed`/callbacks). Différences :

- **aucun GPS.** Le chrono est mesuré en horloge murale (`Date.now`), pas en
  compteur de ticks : il reste juste même quand l'onglet passe en arrière-plan
  et que le navigateur ralentit les timers. Au retour au premier plan, le temps
  écoulé reflète le temps réel et le rattrapage joue les messages manqués ;
- **la seule contrainte partagée avec le GPX est l'autoplay audio** : la
  lecture n'est autorisée qu'au premier plan, donc on garde le Wake Lock et la
  consigne « écran allumé, app active ». C'est le mode le plus fiable des deux —
  pas de dérive, pas d'attente de fix.

### Deux écrans de course plutôt qu'un composant branché

`LiveClient` (GPX, carte + km) et `TimeLiveClient` (temps, chronomètre + frise)
sont deux composants distincts, choisis par `live/page.tsx` selon `race.mode`.
Ils partagent leurs **bibliothèques** — `ChainedAudioPlayer`, le préchargement
hors-ligne, IndexedDB, la synchro des lectures — c'est-à-dire le vrai code
réutilisé, pas leur mise en page. Brancher un unique composant de 500 lignes
sur chaque affichage aurait été moins lisible et plus fragile.

Côté proche, `ContributorFlow` bascule entre la carte Leaflet et le composant
`Timeline` (`src/components/timeline/`) selon le mode. Le reste du tunnel
— identité, quota, enregistrement, paywall, AdSense — est commun.

## 7 quinquies. Dessiner son parcours (snap-to-roads)

Troisième façon d'entrer un tracé, à côté de l'import GPX et du mode temps :
dessiner sur la carte. Ce n'est PAS un nouveau mode de course — le résultat est
une course `gpx` ordinaire (même structure de tracé, même déclenchement GPS),
signalée à la création par `source=draw`.

### Calé sur les routes, pas à main levée

Le choix produit : chaque segment entre deux clics est routé le long des rues
réelles. Un tracé à main levée qui coupe les virages s'écarterait de la route,
et comme le message se déclenche là où passe la ligne, un écart > 70 m
décalerait le déclenchement. Le routage élimine ce risque : la ligne est sur la
route, là où le coureur court réellement.

### Architecture

- `src/lib/routing.ts` (serveur) parle à un service compatible **OSRM**. Défaut :
  le serveur de démo public, libre et sans clé — parfait pour démarrer, interdit
  en production, d'où la configuration par `ROUTING_BASE_URL` / `ROUTING_PROFILE`
  pour brancher une instance dédiée le jour du lancement.
- `/api/route` est un **proxy serveur** réservé au coureur authentifié : il évite
  qu'un tiers se serve de l'endpoint comme d'un routeur gratuit, et garde le
  fournisseur (et une éventuelle clé) hors du navigateur.
- `RouteDrawMap` route de façon **incrémentale** — un segment par clic, « Annuler »
  retire le dernier — ce qui est réactif et suffit à construire un parcours.
  L'édition d'un point au milieu est volontairement hors de cette première
  version.
- Si un segment n'est pas routable, on trace une **ligne droite de secours** en
  le signalant, plutôt que de bloquer.
- Le tracé obtenu est envoyé à `/api/races` (`source=draw`) qui **reconstruit
  distance cumulée et bounds côté serveur** — on ne fait pas confiance au client
  sur ces valeurs dérivées, seulement sur la géométrie (c'est la course du
  coureur, RLS garantit qu'il en est propriétaire).

## 8. Nettoyage du storage

`DELETE /api/races/:id` supprime la course en base ; la cascade emporte messages
et contributeurs. Les **fichiers** du bucket ne sont pas supprimés dans la
foulée, pour ne pas bloquer la réponse HTTP sur un nombre arbitraire de
suppressions.

À mettre en place avant la production, en tâche planifiée Supabase :

```sql
-- Objets du bucket voice-messages dont la course n'existe plus.
-- Le premier segment du chemin est l'UUID de la course.
select o.name
from storage.objects o
where o.bucket_id = 'voice-messages'
  and not exists (
    select 1 from public.races r
    where r.id::text = (storage.foldername(o.name))[1]
  );
```

Même mécanisme pour la rétention de 12 mois annoncée dans la politique de
confidentialité.

---

## 9. Économie du modèle

À 0,99 €, Stripe prélève 0,25 € + 1,5 %, soit ~0,26 € — **26 % de marge brute
perdue sur les frais fixes**. C'est le point faible du modèle à l'unité.

Le champ `extra_message_credits` d'`app_settings` existe pour tester un pack
(par exemple 5 vocaux à 2,99 €, soit 8 % de frais) sans redéployer. Le prix est
toujours lu **en base** au moment de créer la session Stripe, jamais envoyé par
le client — sinon il suffirait de modifier la requête pour acheter à un centime.

`audio_messages.is_billable` marque les vocaux consommés au-delà du quota
gratuit : c'est ce qui alimente le taux de conversion affiché dans le
back-office, et donc la décision de faire varier le quota gratuit par course
(`races.free_quota`).

---

## 10. Ce qui n'est pas fait, et pourquoi

| Non fait | Raison | Quand le faire |
|---|---|---|
| Rate limiting distribué | L'implémentation en mémoire suffit en mono-instance | Au premier déploiement multi-région |
| Modération des vocaux | Aucun volume, aucun signalement à traiter | Dès le premier signalement |
| Icônes PWA | Attend une identité visuelle | Avant la première vraie course |
| Tests automatisés | Le cœur (geo, GPX) est testé manuellement ; le reste bouge encore | Dès que `GeoEngine` se stabilise — c'est le premier candidat |
| Purge du storage | Voir §8 | Avant la production |
| Notifications au coureur | Pas de besoin identifié | Peut-être jamais |
| Empaquetage Capacitor | Voir §1.B | Si le mode « écran actif » bloque l'adoption |

---

## 11. Ordre de lecture du code

1. `src/lib/geo/geo-engine.ts` — la détection de proximité, cœur du produit
2. `src/lib/audio/chained-player.ts` — l'enchaînement TTS puis vocal
3. `src/app/(runner)/app/races/[id]/live/LiveClient.tsx` — leur orchestration
4. `src/app/e/[slug]/ContributorFlow.tsx` — le tunnel proche de bout en bout
5. `supabase/migrations/*` — le modèle et les règles d'accès
6. `src/components/consent/` + `src/lib/consent.ts` — le consentement, si tu
   touches à la publicité

Le reste est de la plomberie conventionnelle.
