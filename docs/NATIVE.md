# EchoRun • application native (iOS / Android)

Ce document est le mode d'emploi pour transformer la PWA en application native
avec **Capacitor**, afin d'obtenir le **GPS en arrière-plan** (écran éteint,
téléphone en poche) et une présence sur l'App Store / Play Store.

> **Ce qui a déjà été fait dans le code** (côté web, vérifié) :
> - la logique de déclenchement est isolée dans `FenceDetector` (pure) ;
> - `GeoEngine` (web) et `NativeGeoEngine` (natif) la partagent ;
> - `createGeoEngine()` choisit le bon moteur selon la plateforme ;
> - un **keep-alive audio** (`audio-keepalive.ts`) maintient la course active
>   écran verrouillé ;
> - `capacitor.config.ts` est prêt.
>
> **Ce qui reste à faire sur TON Mac** (ne peut pas être fait ni testé dans le
> cloud) : générer les projets natifs, régler permissions et modes de fond,
> tester sur un vrai téléphone, publier. C'est le contenu de ce guide.

---

## 0. Le point à valider en priorité : l'audio écran éteint

C'est le seul comportement du projet qu'aucun test automatisé ne peut confirmer.

Le plugin de géolocalisation garantit les **positions** en arrière-plan. Mais
jouer un **vocal** écran verrouillé exige que le runtime JS reste vivant. La
technique retenue (`audio-keepalive.ts`) : jouer une boucle quasi silencieuse
pendant la course, ce qui empêche l'OS de suspendre l'app. C'est éprouvé par les
apps de coaching running, **mais à confirmer sur ton matériel** (§6).

Si ça ne tient pas de façon fiable, le plan B est le SDK commercial
[`@transistorsoft/capacitor-background-geolocation`](https://github.com/transistorsoft/capacitor-background-geolocation)
(~payant, licence unique), qui gère lui-même le maintien en vie natif. Le reste
du code (FenceDetector, factory) ne change pas • seule l'implémentation de
`NativeGeoEngine` serait à réécrire au-dessus de ce SDK.

---

## 1. Prérequis

| Pour | Il te faut |
|---|---|
| iOS | un **Mac** + **Xcode**, un compte **Apple Developer** (99 $/an) |
| Android | **Android Studio**, un compte **Google Play** (25 $ une fois) |
| Les deux | Node 22 (déjà en place), le projet qui build en web |

Le site doit être **déployé en HTTPS** (Vercel…) et joignable à l'URL que tu
mettras dans `capacitor.config.ts` → `server.url`. La coquille native charge ce
site ; elle n'embarque pas le Next.js.

---

## 2. Installer la chaîne Capacitor

Depuis la racine du projet :

```bash
npm install -D @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor-community/background-geolocation
```

Puis générer les projets natifs (crée les dossiers `ios/` et `android/`, à
**commiter** • tu vas y éditer des fichiers) :

```bash
npx cap add ios
npx cap add android
npx cap sync
```

> `capacitor.config.ts` est déjà configuré : `appId = app.echorun`,
> `server.url` = ton domaine. **Change `server.url`** pour ton vrai domaine
> avant `cap sync`. En dev, tu peux pointer sur `http://<IP-de-ta-machine>:3000`
> en lançant avec `CAP_SERVER_URL=... CAP_CLEARTEXT=1`.

---

## 3. iOS • permissions et modes de fond

Ouvre `ios/App/App/Info.plist` (via `npx cap open ios` puis l'éditeur Xcode, ou
directement) et ajoute :

```xml
<!-- Localisation -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>EchoRun utilise ta position pour déclencher les messages de tes proches au bon endroit de ta course.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Pour jouer les messages même écran éteint, EchoRun a besoin de ta position en arrière-plan pendant la course.</string>

<!-- Micro (enregistrement côté proche, si l'app sert aussi à ça) -->
<key>NSMicrophoneUsageDescription</key>
<string>Pour enregistrer un message vocal.</string>

<!-- Modes de fond : localisation + audio (le keep-alive) -->
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>audio</string>
</array>
```

> Le mode `audio` est **indispensable** au keep-alive. Apple le scrute en
> revue : c'est légitime ici puisque l'app joue réellement des vocaux pendant la
> course. Prépare une phrase claire pour la revue (cf. §7).

---

## 4. Android • permissions et service de premier plan

Ouvre `android/app/src/main/AndroidManifest.xml` et ajoute, dans `<manifest>` :

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

Le plugin `background-geolocation` fournit le service de premier plan (avec la
notification persistante « Course en cours » définie dans `NativeGeoEngine`).
Suis le README du plugin pour la déclaration du service si une version le
demande.

---

## 5. Builder et lancer sur un téléphone

```bash
npx cap sync          # après chaque changement de config/plugins
npx cap open ios      # ouvre Xcode  -> Run sur ton iPhone branché
npx cap open android  # ouvre Android Studio -> Run sur ton Android branché
```

À chaque modification du **site** (le code web), rien à rebuilder côté natif :
la coquille recharge `server.url`. Tu ne refais `cap sync` que si tu changes la
config Capacitor ou un plugin natif.

---

## 6. LE test qui compte : audio écran éteint

Sur un **vrai téléphone** (pas le simulateur • le simulateur ne reproduit ni le
GPS réel ni la suspension d'app) :

1. Prépare une course avec un message placé ~200 m après ton point de départ.
2. Lance la course, autorise la localisation **« Toujours »**.
3. **Verrouille l'écran** et mets le téléphone en poche.
4. Marche/cours jusqu'au point.
5. Le vocal doit se déclencher, écran verrouillé.

- ✅ Ça marche → le keep-alive tient, tu es bon.
- ❌ Rien ne sort écran éteint → passe au SDK Transistorsoft (§0), ou vérifie
  que le mode de fond `audio` est bien déclaré (iOS) et la permission
  `ACCESS_BACKGROUND_LOCATION` accordée (Android 11+ : elle se règle dans les
  réglages système, pas seulement à la 1re demande).

Teste aussi : batterie sur une heure, reprise après un tunnel, appel entrant
pendant un vocal.

---

## 7. Publier

**iOS (App Store Connect)**
- Icône et écran de lancement : Xcode → Assets.
- Archive → Distribute → App Store Connect.
- Dans la revue, explique l'usage du mode de fond `audio` et `location` :
  « L'app joue des messages vocaux déclenchés par la position pendant une course
  à pied ; la localisation et l'audio de fond permettent de les entendre écran
  verrouillé. » Joins une vidéo de démonstration.

**Android (Play Console)**
- L'usage de `ACCESS_BACKGROUND_LOCATION` demande un formulaire de justification
  + une vidéo montrant le cas d'usage. Prépare-les.
- Build → App Bundle signé (`.aab`) → Play Console.

---

## 8. Rappels d'architecture

- `src/lib/geo/fence-detector.ts` • logique de déclenchement PURE, partagée.
- `src/lib/geo/geo-engine.ts` • source de position WEB (watchPosition).
- `src/lib/geo/native-geo-engine.ts` • source de position NATIVE (plugin).
- `src/lib/geo/create-geo-engine.ts` • la fabrique qui choisit.
- `src/lib/native/audio-keepalive.ts` • le keep-alive audio (§0).
- `src/lib/native/platform.ts` • détection web/natif.
- `capacitor.config.ts` • coquille pointant sur `server.url`.

Sur le web, **rien de tout ceci ne s'active** : `isNativeApp()` renvoie `false`,
le moteur web et le Wake Lock prennent le relais. Le même code sert les deux.
