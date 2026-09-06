'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_RECORDING_MS,
  RecorderError,
  VoiceRecorder,
  isRecordingSupported,
  type RecordingResult,
} from '@/lib/audio/recorder';
import { Button } from '@/components/ui/Button';
import { cx, formatDuration } from '@/lib/utils';

interface RecorderPanelProps {
  disabled?: boolean;
  onRecorded: (result: RecordingResult | null) => void;
  recording: RecordingResult | null;
}

/**
 * Bloc micro : un seul gros bouton, un anneau qui réagit à la voix, et une
 * relecture avant envoi. Rien d'autre — c'est la partie que des gens de
 * 70 ans utilisent depuis un lien reçu par SMS.
 */
export function RecorderPanel({ disabled, onRecorded, recording }: RecorderPanelProps) {
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isRecordingSupported());
    return () => {
      recorderRef.current?.cancel();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // L'URL de relecture suit toujours le blob courant.
  useEffect(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (!recording) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(recording.blob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }, [recording]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    try {
      const result = await recorder.stop();
      onRecorded(result);
    } catch (err) {
      onRecorded(null);
      setError(err instanceof RecorderError ? err.message : 'Enregistrement impossible.');
    } finally {
      recorderRef.current = null;
      setIsRecording(false);
      setLevel(0);
      setElapsed(0);
    }
  }, [onRecorded]);

  const start = useCallback(async () => {
    setError(null);
    onRecorded(null);

    const recorder = new VoiceRecorder({
      onLevel: setLevel,
      onTick: setElapsed,
      onAutoStop: () => void stop(),
    });
    recorderRef.current = recorder;

    try {
      await recorder.start();
      setIsRecording(true);
    } catch (err) {
      recorderRef.current = null;
      setError(err instanceof RecorderError ? err.message : 'Micro indisponible.');
    }
  }, [onRecorded, stop]);

  if (!supported) {
    return (
      <p className="rounded-2xl bg-clay/8 p-4 text-[13px] leading-relaxed text-clay">
        Ce navigateur ne permet pas d’enregistrer un vocal. Ouvre ce lien dans Safari (iPhone) ou
        Chrome (Android) plutôt que dans le navigateur intégré de ta messagerie.
      </p>
    );
  }

  const remaining = Math.max(0, MAX_RECORDING_MS - elapsed);
  const nearLimit = remaining < 6000;

  return (
    <div className="space-y-5">
      {!recording ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative grid place-items-center">
            {isRecording && (
              <span
                aria-hidden
                className="absolute rounded-full bg-matcha-500/25 transition-transform duration-100"
                style={{
                  width: 96,
                  height: 96,
                  transform: `scale(${1 + level * 0.55})`,
                }}
              />
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => (isRecording ? void stop() : void start())}
              aria-label={isRecording ? 'Arrêter l’enregistrement' : 'Démarrer l’enregistrement'}
              className={cx(
                'relative grid size-24 place-items-center rounded-full transition-[transform,background-color] duration-200',
                'active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
                isRecording ? 'bg-charcoal text-bone' : 'bg-matcha-500 text-bone shadow-lift',
              )}
            >
              {isRecording ? (
                <span className="size-7 rounded-md bg-bone" />
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3Z"
                    fill="currentColor"
                  />
                  <path
                    d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="text-center">
            {isRecording ? (
              <>
                <p
                  className={cx(
                    'font-mono text-[15px] tabular-nums',
                    nearLimit ? 'text-clay' : 'text-charcoal',
                  )}
                >
                  {formatDuration(elapsed)}{' '}
                  <span className="text-charcoal-faint">/ {formatDuration(MAX_RECORDING_MS)}</span>
                </p>
                <p className="mt-1 text-[12.5px] text-charcoal-faint">
                  {nearLimit ? 'Bientôt la fin, conclus !' : 'Appuie pour arrêter'}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-charcoal-faint">
                Appuie et parle · 30 secondes maximum
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-charcoal/[0.07] bg-bone-100/60 p-3">
            {previewUrl ? (
              <audio
                src={previewUrl}
                controls
                preload="metadata"
                className="h-9 w-full"
                aria-label="Réécouter mon message"
              />
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] text-charcoal-faint">
              {formatDuration(recording.durationMs)} enregistré
            </p>
            <Button variant="ghost" size="sm" onClick={() => onRecorded(null)}>
              Refaire
            </Button>
          </div>
        </div>
      )}

      {error ? <p className="text-[13px] text-clay">{error}</p> : null}
    </div>
  );
}
