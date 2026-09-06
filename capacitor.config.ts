import type { CapacitorConfig } from '@capacitor/cli';

/**
 * ============================================================================
 * Capacitor — empaquetage natif iOS / Android
 * ============================================================================
 *
 * Stratégie : l'app native est une COQUILLE qui charge le site hébergé
 * (`server.url`) dans un webview natif, et y injecte les plugins natifs
 * (géolocalisation en arrière-plan). On ne ré-exporte PAS le Next.js en
 * statique — impossible avec nos Server Components, API routes et middleware.
 * Le webview charge donc la version en ligne, et le service worker + IndexedDB
 * assurent le hors-ligne une fois la course préparée.
 *
 * ⚠️ Remplace `server.url` par ton domaine de production avant de builder.
 * En dev, tu peux pointer vers l'IP de ta machine (http://192.168.x.x:3000)
 * avec `cleartext: true`.
 */
const config: CapacitorConfig = {
  appId: 'app.echorun',
  appName: 'EchoRun',
  // Répertoire web : requis par Capacitor même en mode server.url. On y met un
  // fallback minimal (public/) ; le contenu réel vient de server.url.
  webDir: 'native/webdir',
  server: {
    url: process.env.CAP_SERVER_URL || 'https://echo-run.app',
    // Passe à true UNIQUEMENT en dev pour charger un http://IP local.
    cleartext: process.env.CAP_CLEARTEXT === '1',
  },
  ios: {
    // Le webview doit pouvoir jouer de l'audio sans geste à chaque lecture :
    // le déblocage initial (bouton Démarrer) suffit.
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    // Valeurs par défaut de la géolocalisation de fond ; les libellés affichés
    // dans la notification Android sont surchargés à l'exécution.
    BackgroundGeolocation: {},
  },
};

export default config;
