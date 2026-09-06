/**
 * ============================================================================
 * TimeEngine — déclenchement des vocaux par chronomètre (mode « temps »)
 * ============================================================================
 *
 * Pendant du GeoEngine pour les courses sans GPX. Le coureur a annoncé une
 * durée prévue ; ses proches ont placé leurs messages à des instants (« à
 * 45 min »). Ici, aucun GPS : on démarre un chronomètre au départ et on
 * déclenche chaque message quand le temps écoulé atteint son instant.
 *
 * C'est plus simple ET plus fiable que le GPS — pas de dérive, pas d'attente
 * de fix. La SEULE contrainte partagée avec le mode GPX est l'autoplay audio :
 * la lecture n'est autorisée qu'au premier plan, donc l'écran doit rester
 * allumé et l'app active. On garde donc le Wake Lock.
 *
 * Interface publique alignée sur GeoEngine (`start`/`stop`/`seedConsumed`/
 * callbacks) : LiveClient orchestre les deux moteurs sans les distinguer.
 */

export interface TimeFence {
  id: string;
  /** Instant de déclenchement, en secondes depuis le départ. */
  triggerAtS: number;
}

export interface TimeSnapshot {
  /** Temps écoulé depuis le départ, en secondes. */
  elapsedS: number;
  timestamp: number;
}

export type TimeEngineState = 'idle' | 'running' | 'error';

export interface TimeEngineOptions {
  fences: readonly TimeFence[];
  /** Durée prévue de la course, pour la barre de progression. */
  durationS: number;
  onTick?: (snapshot: TimeSnapshot) => void;
  onTrigger?: (fence: TimeFence, snapshot: TimeSnapshot) => void;
  onState?: (state: TimeEngineState, detail?: string) => void;
  onWakeLock?: (held: boolean) => void;
}

const TICK_MS = 500;

export class TimeEngine {
  private readonly options: TimeEngineOptions;
  private readonly consumed = new Set<string>();
  private wakeLock: WakeLockSentinel | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private state: TimeEngineState = 'idle';

  /**
   * Départ mesuré en horloge murale (Date.now), pas en compteur de ticks :
   * ainsi le chrono reste juste même si l'onglet est mis en arrière-plan et
   * que le navigateur ralentit les timers. Au retour au premier plan, le temps
   * écoulé reflète le temps réel, et le rattrapage joue les messages manqués.
   */
  private startedAtMs = 0;
  /** Reprise après pause : temps déjà couru avant le (re)démarrage. */
  private baseElapsedMs = 0;

  constructor(options: TimeEngineOptions) {
    this.options = options;
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  seedConsumed(ids: readonly string[]): void {
    for (const id of ids) this.consumed.add(id);
  }

  get pendingCount(): number {
    return this.options.fences.filter((f) => !this.consumed.has(f.id)).length;
  }

  get elapsedS(): number {
    if (this.startedAtMs === 0) return Math.round(this.baseElapsedMs / 1000);
    return Math.round((this.baseElapsedMs + (Date.now() - this.startedAtMs)) / 1000);
  }

  /** À appeler dans un geste utilisateur (débloque aussi l'audio via LiveClient). */
  async start(): Promise<void> {
    if (this.ticker !== null) return;

    this.startedAtMs = Date.now();
    this.setState('running');
    await this.acquireWakeLock();

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // Au retour au premier plan : reprendre le Wake Lock (relâché en fond)
        // et rattraper immédiatement les déclenchements manqués.
        void this.acquireWakeLock();
        this.evaluate();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.ticker = setInterval(() => this.evaluate(), TICK_MS);
    this.evaluate();
  }

  /** Met en pause : le chrono s'arrête, l'état déjà couru est conservé. */
  pause(): void {
    if (this.ticker === null) return;
    this.baseElapsedMs += Date.now() - this.startedAtMs;
    this.startedAtMs = 0;
    this.teardownTicker();
    void this.releaseWakeLock();
    this.setState('idle');
  }

  stop(): void {
    this.baseElapsedMs = 0;
    this.startedAtMs = 0;
    this.teardownTicker();
    void this.releaseWakeLock();
    this.setState('idle');
  }

  // ------------------------------------------------------------- internals --

  private evaluate(): void {
    const elapsedS = this.elapsedS;
    const snapshot: TimeSnapshot = { elapsedS, timestamp: Date.now() };
    this.options.onTick?.(snapshot);

    // Tri par instant : si deux messages tombent au même moment (ou qu'on
    // rattrape un retard), ils partent dans l'ordre chronologique.
    const pending = this.options.fences
      .filter((f) => !this.consumed.has(f.id))
      .sort((a, b) => a.triggerAtS - b.triggerAtS);

    for (const fence of pending) {
      if (elapsedS >= fence.triggerAtS) {
        this.consumed.add(fence.id);
        this.options.onTrigger?.(fence, snapshot);
      }
    }
  }

  private teardownTicker(): void {
    if (this.ticker !== null) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  private setState(state: TimeEngineState, detail?: string): void {
    if (this.state === state && !detail) return;
    this.state = state;
    this.options.onState?.(state, detail);
  }

  private async acquireWakeLock(): Promise<void> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      this.options.onWakeLock?.(false);
      return;
    }
    if (this.wakeLock && !this.wakeLock.released) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.options.onWakeLock?.(true);
      this.wakeLock.addEventListener('release', () => this.options.onWakeLock?.(false));
    } catch {
      this.options.onWakeLock?.(false);
    }
  }

  private async releaseWakeLock(): Promise<void> {
    try {
      await this.wakeLock?.release();
    } catch {
      /* déjà relâché */
    }
    this.wakeLock = null;
    this.options.onWakeLock?.(false);
  }
}
