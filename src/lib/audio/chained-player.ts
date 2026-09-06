import { sleep } from '@/lib/utils';

/**
 * ============================================================================
 * ChainedAudioPlayer — "Message de [Prenom]" puis lecture du vocal
 * ============================================================================
 *
 * Trois pieges resolus ici, tous specifiques a iOS/Safari :
 *
 * 1. DEBLOCAGE. Un `HTMLAudioElement` ne peut demarrer que depuis un geste
 *    utilisateur. On cree donc UN SEUL element, on le debloque avec un WAV
 *    silencieux au clic sur "Demarrer la course", puis on ne fait plus que
 *    changer son `src`. Un element cree plus tard serait bloque.
 *
 * 2. SYNTHESE VOCALE. `speechSynthesis` exige aussi un geste prealable, et
 *    l'evenement `onend` n'est pas fiable sur iOS. On double donc chaque
 *    annonce d'un garde-fou temporel, sinon la file se bloque definitivement.
 *
 * 3. SEQUENCEMENT. TTS et audio se coupent mutuellement s'ils se chevauchent.
 *    Une file d'attente strictement sequentielle garantit un seul son a la
 *    fois : si deux messages se declenchent au meme carrefour, le second
 *    attend son tour.
 */

export interface QueuedMessage {
  id: string;
  authorName: string;
  blob: Blob;
}

export type PlaybackPhase = 'idle' | 'announcing' | 'playing';

export interface ChainedPlayerEvents {
  onPhase?: (phase: PlaybackPhase, message: QueuedMessage | null) => void;
  onFinished?: (message: QueuedMessage) => void;
  onQueueChange?: (length: number) => void;
  onError?: (message: QueuedMessage, error: unknown) => void;
}

/** WAV mono 8 kHz de 60 ms de silence : sert uniquement au deblocage. */
function silentWavDataUri(): string {
  const sampleRate = 8000;
  const samples = 480;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, 'data');
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128); // 8 bits non signe : 128 = silence

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (const b of bytes) binary += String.fromCharCode(b);
  return 'data:audio/wav;base64,' + btoa(binary);
}

export class ChainedAudioPlayer {
  private element: HTMLAudioElement | null = null;
  private unlocked = false;
  private ttsAvailable = false;
  private readonly queue: QueuedMessage[] = [];
  private draining = false;
  private stopped = false;
  private currentUrl: string | null = null;

  constructor(private readonly events: ChainedPlayerEvents = {}) {}

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  /**
   * DOIT etre appele de facon synchrone depuis un handler de clic.
   * Sans ca, rien ne sortira des haut-parleurs pendant la course.
   */
  async unlock(): Promise<boolean> {
    if (this.unlocked) return true;

    const el = new Audio();
    el.preload = 'auto';
    // `playsinline` n'est pas type sur HTMLAudioElement mais Safari iOS le lit :
    // sans lui, la lecture peut passer en plein ecran et interrompre la course.
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    this.element = el;

    try {
      el.src = silentWavDataUri();
      el.volume = 0.01;
      await el.play();
      el.pause();
      el.currentTime = 0;
      el.volume = 1;
      this.unlocked = true;
    } catch {
      this.unlocked = false;
    }

    this.primeSpeech();
    return this.unlocked;
  }

  /** Chauffe le moteur TTS dans le meme geste et pre-charge les voix. */
  private primeSpeech(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.ttsAvailable = false;
      return;
    }
    this.ttsAvailable = true;
    try {
      window.speechSynthesis.getVoices();
      const warmup = new SpeechSynthesisUtterance(' ');
      warmup.volume = 0;
      warmup.lang = 'fr-FR';
      window.speechSynthesis.speak(warmup);
    } catch {
      this.ttsAvailable = false;
    }
  }

  enqueue(message: QueuedMessage): void {
    if (this.stopped) return;
    if (this.queue.some((m) => m.id === message.id)) return;
    this.queue.push(message);
    this.events.onQueueChange?.(this.queue.length);
    void this.drain();
  }

  /** Coupe le message en cours et passe au suivant. */
  skip(): void {
    if (this.element) {
      this.element.pause();
      this.element.dispatchEvent(new Event('ended'));
    }
    this.cancelSpeech();
  }

  stop(): void {
    this.stopped = true;
    this.queue.length = 0;
    this.cancelSpeech();
    if (this.element) {
      this.element.pause();
      this.element.removeAttribute('src');
    }
    this.revokeCurrentUrl();
    this.events.onQueueChange?.(0);
    this.events.onPhase?.('idle', null);
  }

  // ------------------------------------------------------------- internals --

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;

    try {
      while (this.queue.length > 0 && !this.stopped) {
        const message = this.queue[0];
        if (!message) break;

        try {
          this.events.onPhase?.('announcing', message);
          await this.announce(message.authorName);

          // Respiration : sans cette pause, Safari tronque le debut du vocal.
          await sleep(180);

          this.events.onPhase?.('playing', message);
          await this.playBlob(message.blob);

          this.events.onFinished?.(message);
        } catch (error) {
          this.events.onError?.(message, error);
        } finally {
          this.queue.shift();
          this.events.onQueueChange?.(this.queue.length);
        }
      }
    } finally {
      this.draining = false;
      if (!this.stopped) this.events.onPhase?.('idle', null);
    }
  }

  /** "Message de Camille" — resout meme si `onend` ne vient jamais. */
  private announce(authorName: string): Promise<void> {
    const text = 'Message de ' + authorName;
    if (!this.ttsAvailable) return Promise.resolve();

    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        resolve();
      };

      // Garde-fou : ~95 ms par caractere + marge, borne a 6 s.
      const estimatedMs = Math.min(1800 + text.length * 95, 6000);
      const guard = setTimeout(done, estimatedMs);

      try {
        this.cancelSpeech();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.02;
        utterance.pitch = 1;
        const voice = this.pickFrenchVoice();
        if (voice) utterance.voice = voice;
        utterance.onend = done;
        utterance.onerror = done;
        window.speechSynthesis.speak(utterance);
      } catch {
        done();
      }
    });
  }

  private pickFrenchVoice(): SpeechSynthesisVoice | null {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return null;
      // Une voix locale evite toute latence reseau au milieu d'une course.
      return (
        voices.find((v) => v.lang === 'fr-FR' && v.localService) ??
        voices.find((v) => v.lang.startsWith('fr')) ??
        null
      );
    } catch {
      return null;
    }
  }

  private cancelSpeech(): void {
    try {
      if (this.ttsAvailable) window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }

  private playBlob(blob: Blob): Promise<void> {
    const el = this.element;
    if (!el) return Promise.reject(new Error('Lecteur audio non initialise.'));

    return new Promise<void>((resolve, reject) => {
      this.revokeCurrentUrl();
      const url = URL.createObjectURL(blob);
      this.currentUrl = url;

      let settled = false;
      const cleanup = () => {
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('error', onError);
        clearTimeout(guard);
      };
      const onEnded = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Lecture du vocal impossible.'));
      };

      // Filet de securite : un blob corrompu ne doit pas figer la file.
      const guard = setTimeout(onEnded, 65_000);

      el.addEventListener('ended', onEnded);
      el.addEventListener('error', onError);

      el.src = url;
      el.currentTime = 0;
      el.play().catch(onError);
    });
  }

  private revokeCurrentUrl(): void {
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
  }
}
