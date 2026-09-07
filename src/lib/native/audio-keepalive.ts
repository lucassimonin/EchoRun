/**
 * ============================================================================
 * Keep-alive audio • garder la course active écran éteint (app native)
 * ============================================================================
 *
 * LE point qui justifie le passage au natif, et le plus délicat.
 *
 * Même dans une app native, l'OS suspend le webview (donc notre JS : GeoEngine
 * + ChainedAudioPlayer) quand l'écran se verrouille. Deux morceaux sont donc
 * nécessaires pour jouer un vocal écran éteint :
 *
 *   1. la LOCALISATION en arrière-plan → assurée par le plugin Capacitor
 *      (background-geolocation) + les permissions/plist « Always » ;
 *   2. le RUNTIME JS + l'AUDIO qui restent vivants → assurés en maintenant une
 *      session audio active. C'est le rôle de ce module.
 *
 * La technique, éprouvée par les apps de coaching running : jouer une boucle
 * quasi silencieuse pendant toute la course. Tant qu'une session audio joue,
 * iOS (mode de fond « audio ») et Android ne suspendent pas l'app, donc nos
 * timers et la lecture des messages continuent, écran verrouillé.
 *
 * ⚠️ À VALIDER SUR APPAREIL RÉEL : c'est le seul comportement de tout le
 * projet qu'aucun test automatisé ne peut confirmer. Si la lecture écran éteint
 * n'est pas fiable avec cette approche, le plan B est le SDK
 * @transistorsoft/capacitor-background-geolocation (payant) qui gère lui-même
 * le maintien en vie natif. Voir docs/NATIVE.md.
 */

let context: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let gain: GainNode | null = null;

/**
 * Démarre la boucle. À appeler dans le même geste utilisateur que le déblocage
 * audio (bouton « Démarrer la course »), sinon la session ne s'active pas.
 */
export function startAudioKeepAlive(): void {
  if (context) return;
  try {
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return;

    context = new Ctor();
    // Un buffer d'une seconde à volume infime : inaudible, mais suffisant pour
    // que l'OS considère l'app « en train de jouer du son ».
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 1e-4;

    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    gain = context.createGain();
    gain.gain.value = 0.001; // quasi silence

    source.connect(gain).connect(context.destination);
    source.start();
    void context.resume();
  } catch {
    stopAudioKeepAlive();
  }
}

export function stopAudioKeepAlive(): void {
  try {
    source?.stop();
  } catch {
    /* déjà arrêté */
  }
  source?.disconnect();
  gain?.disconnect();
  void context?.close().catch(() => undefined);
  source = null;
  gain = null;
  context = null;
}
