/**
 * Enregistreur micro pour la page proche.
 *
 * Format : Opus/WebM partout, MP4/AAC sur Safari (qui n'encode pas WebM).
 * On ne transcode pas cote client • le format est stocke tel quel et lu par le
 * meme type de navigateur ou par le coureur, qui supporte les deux.
 */

export const MAX_RECORDING_MS = 30_000;
const MIN_RECORDING_MS = 700;

const CANDIDATE_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export class RecorderError extends Error {
  constructor(
    message: string,
    readonly kind: 'unsupported' | 'denied' | 'no-device' | 'busy' | 'too-short' | 'failed',
  ) {
    super(message);
    this.name = 'RecorderError';
  }
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** Traduit l'échec de getUserMedia en cause exploitable par l'UI. */
function toRecorderError(err: unknown): RecorderError {
  const name = (err as { name?: string } | null)?.name;
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return new RecorderError('no-device', 'no-device');
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return new RecorderError('busy', 'busy');
  }
  return new RecorderError('denied', 'denied');
}

/**
 * Demande l'accès micro sans démarrer d'enregistrement : sert au bouton
 * « Autoriser le micro », qui déclenche la demande de permission du navigateur
 * puis relâche aussitôt le flux.
 */
export async function requestMicrophoneAccess(): Promise<void> {
  if (!isRecordingSupported()) {
    throw new RecorderError('unsupported', 'unsupported');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    throw toRecorderError(err);
  }
  stream.getTracks().forEach((t) => t.stop());
}

function pickMimeType(): string {
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

/** Retire les parametres de codec : la colonne `mime_type` reste propre. */
export function baseMimeType(full: string): string {
  return (full.split(';')[0] ?? 'audio/webm').trim();
}

export class VoiceRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private analyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private levelFrame: number | null = null;

  constructor(
    private readonly callbacks: {
      onLevel?: (level: number) => void;
      onTick?: (elapsedMs: number) => void;
      onAutoStop?: () => void;
    } = {},
  ) {}

  get isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }

  async start(): Promise<void> {
    if (!isRecordingSupported()) {
      throw new RecorderError(
        "Ce navigateur ne permet pas d'enregistrer un vocal. Essaie Chrome ou Safari a jour.",
        'unsupported',
      );
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      throw toRecorderError(err);
    }

    const mimeType = pickMimeType();
    this.chunks = [];
    this.recorder = new MediaRecorder(
      this.stream,
      mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : { audioBitsPerSecond: 48_000 },
    );

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };

    this.startedAt = Date.now();
    this.recorder.start(250);

    this.startLevelMeter();
    this.autoStopTimer = setTimeout(() => {
      this.callbacks.onAutoStop?.();
    }, MAX_RECORDING_MS);
  }

  stop(): Promise<RecordingResult> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === 'inactive') {
      return Promise.reject(new RecorderError('Aucun enregistrement en cours.', 'failed'));
    }

    return new Promise<RecordingResult>((resolve, reject) => {
      recorder.onstop = () => {
        const durationMs = Date.now() - this.startedAt;
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type: mimeType });
        this.teardown();

        if (durationMs < MIN_RECORDING_MS || blob.size < 1024) {
          reject(new RecorderError('Message trop court, reessaie.', 'too-short'));
          return;
        }
        resolve({
          blob,
          mimeType: baseMimeType(mimeType),
          durationMs: Math.min(durationMs, MAX_RECORDING_MS),
        });
      };

      recorder.onerror = () => {
        this.teardown();
        reject(new RecorderError("L'enregistrement a echoue.", 'failed'));
      };

      recorder.stop();
    });
  }

  cancel(): void {
    try {
      if (this.recorder?.state === 'recording') {
        this.recorder.onstop = null;
        this.recorder.stop();
      }
    } catch {
      /* ignore */
    }
    this.teardown();
  }

  /** Niveau RMS lisse, pour l'anneau anime autour du bouton. */
  private startLevelMeter(): void {
    if (!this.stream || !this.callbacks.onLevel) return;
    try {
      const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.75;
      source.connect(this.analyser);

      const data = new Uint8Array(this.analyser.frequencyBinCount);
      const loop = () => {
        if (!this.analyser) return;
        this.analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) {
          const centred = (v - 128) / 128;
          sum += centred * centred;
        }
        const rms = Math.sqrt(sum / data.length);
        this.callbacks.onLevel?.(Math.min(1, rms * 3.2));
        this.callbacks.onTick?.(Date.now() - this.startedAt);
        this.levelFrame = requestAnimationFrame(loop);
      };
      this.levelFrame = requestAnimationFrame(loop);
    } catch {
      /* le VU-metre est un bonus, jamais bloquant */
    }
  }

  private teardown(): void {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
    if (this.levelFrame !== null) {
      cancelAnimationFrame(this.levelFrame);
      this.levelFrame = null;
    }
    this.analyser = null;
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
  }
}
