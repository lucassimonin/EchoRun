'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  MAX_RECORDING_MS,
  RecorderError,
  VoiceRecorder,
  isRecordingSupported,
  requestMicrophoneAccess,
  type RecordingResult,
} from '@/lib/audio/recorder';
import { Button } from '@/components/ui/Button';
import { cx, formatDuration } from '@/lib/utils';

type ErrorKind = RecorderError['kind'];

interface RecorderPanelProps {
  disabled?: boolean;
  onRecorded: (result: RecordingResult | null) => void;
  recording: RecordingResult | null;
}

/**
 * Bloc micro : un seul gros bouton, un anneau qui réagit à la voix, et une
 * relecture avant envoi. Rien d'autre • c'est la partie que des gens de
 * 70 ans utilisent depuis un lien reçu par SMS.
 */
export function RecorderPanel({ disabled, onRecorded, recording }: RecorderPanelProps) {
  const t = useTranslations('Recorder');
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [hintKey, setHintKey] = useState<
    'allowHintSafariIos' | 'allowHintIosOther' | 'allowHintChromium' | 'allowHintGeneric'
  >('allowHintGeneric');

  const messageFor = useCallback(
    (kind: ErrorKind): string => {
      switch (kind) {
        case 'unsupported':
          return t('errUnsupported');
        case 'no-device':
          return t('errNoDevice');
        case 'busy':
          return t('errBusy');
        case 'too-short':
          return t('errTooShort');
        case 'failed':
          return t('errFailed');
        case 'denied':
          return t('errDenied');
        default:
          return t('errGeneric');
      }
    },
    [t],
  );

  useEffect(() => {
    setSupported(isRecordingSupported());

    // La marche à suivre pour réautoriser le micro dépend du navigateur : on
    // choisit le bon texte d'aide. Sur iPhone, seul Safari enregistre de façon
    // fiable ; les autres navigateurs iOS (Chrome/Firefox/Edge) sont limités.
    const ua = navigator.userAgent;
    const isIOS =
      /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const isIOSOther = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
    const isIOSSafari = isIOS && !isIOSOther;
    const isChromium = !isIOS && /Chrome|Chromium|Edg\//.test(ua);
    setHintKey(
      isIOSSafari
        ? 'allowHintSafariIos'
        : isIOSOther
          ? 'allowHintIosOther'
          : isChromium
            ? 'allowHintChromium'
            : 'allowHintGeneric',
    );

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
      const kind: ErrorKind = err instanceof RecorderError ? err.kind : 'failed';
      setErrorKind(kind);
      setError(messageFor(kind));
    } finally {
      recorderRef.current = null;
      setIsRecording(false);
      setLevel(0);
      setElapsed(0);
    }
  }, [onRecorded, messageFor]);

  const start = useCallback(async () => {
    setError(null);
    setErrorKind(null);
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
      const kind: ErrorKind = err instanceof RecorderError ? err.kind : 'denied';
      setErrorKind(kind);
      setError(messageFor(kind));
    }
  }, [onRecorded, stop, messageFor]);

  // Bouton « Autoriser le micro » : déclenche la demande de permission, puis
  // enchaîne directement sur l'enregistrement si elle est accordée.
  const authorize = useCallback(async () => {
    setAuthorizing(true);
    setError(null);
    setErrorKind(null);
    try {
      await requestMicrophoneAccess();
      await start();
    } catch (err) {
      const kind: ErrorKind = err instanceof RecorderError ? err.kind : 'denied';
      setErrorKind(kind);
      setError(messageFor(kind));
    } finally {
      setAuthorizing(false);
    }
  }, [start, messageFor]);

  if (!supported) {
    return (
      <p className="rounded-lg border-[3px] border-black bg-danger/10 p-4 text-[13px] font-medium leading-relaxed text-danger">
        {t('errUnsupported')}
      </p>
    );
  }

  const remaining = Math.max(0, MAX_RECORDING_MS - elapsed);
  const nearLimit = remaining < 6000;

  return (
    <div className="space-y-5">
      {/* iPhone hors Safari : la capture micro est bridée par iOS. On prévient
          en amont plutôt que de laisser le contributeur buter sur un refus. */}
      {hintKey === 'allowHintIosOther' && !recording ? (
        <p className="rounded-lg border-[3px] border-black bg-yellow px-4 py-3 text-[13px] font-medium leading-relaxed text-black shadow-[3px_3px_0_0_#000]">
          {t('iosSafariNotice')}
        </p>
      ) : null}

      {!recording ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative grid place-items-center">
            {isRecording && (
              <span
                aria-hidden
                className="absolute rounded-full bg-orange/25 transition-transform duration-100"
                style={{
                  width: 96,
                  height: 96,
                  transform: `scale(${1 + level * 0.55})`,
                }}
              />
            )}
            <button
              type="button"
              disabled={disabled || authorizing}
              onClick={() => (isRecording ? void stop() : void start())}
              aria-label={isRecording ? t('stopAria') : t('startAria')}
              className={cx(
                'relative grid size-24 place-items-center rounded-full border-[3px] border-black transition-[transform,background-color] duration-200',
                'active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
                isRecording ? 'bg-danger text-white' : 'bg-orange text-black shadow-[4px_4px_0_0_#000]',
              )}
            >
              {isRecording ? (
                <span className="size-7 rounded-sm bg-white" />
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
                    'tnum text-[15px]',
                    nearLimit ? 'text-danger' : 'text-charcoal',
                  )}
                >
                  {formatDuration(elapsed)}{' '}
                  <span className="text-charcoal-faint">/ {formatDuration(MAX_RECORDING_MS)}</span>
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.04em] text-black/55">
                  {nearLimit ? t('nearLimit') : t('pressToStop')}
                </p>
              </>
            ) : (
              <p className="font-mono text-[12px] uppercase tracking-[0.04em] text-black/55">
                {t('pressToSpeak')}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border-[3px] border-black bg-off p-3">
            {previewUrl ? (
              <audio
                src={previewUrl}
                controls
                preload="metadata"
                className="h-9 w-full"
                aria-label={t('replayAria')}
              />
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-black/55">
              {t('recorded', { duration: formatDuration(recording.durationMs) })}
            </p>
            <Button variant="ghost" size="sm" onClick={() => onRecorded(null)}>
              {t('redo')}
            </Button>
          </div>
        </div>
      )}

      {error ? <p className="text-[13px] font-bold text-danger">{error}</p> : null}

      {/* Accès refusé : on propose explicitement de (re)demander l'autorisation,
          plus la marche à suivre si le navigateur l'a bloqué pour de bon. */}
      {errorKind === 'denied' && !recording ? (
        <div className="space-y-2.5">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            disabled={disabled || authorizing}
            onClick={() => void authorize()}
          >
            {t('allowMic')}
          </Button>
          <p className="text-[12px] leading-relaxed text-charcoal-muted">{t(hintKey)}</p>
        </div>
      ) : null}
    </div>
  );
}
