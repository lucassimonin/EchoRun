'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge, Divider, Surface } from '@/components/ui/Surface';
import {
  ChainedAudioPlayer,
  type PlaybackPhase,
  type QueuedMessage,
} from '@/lib/audio/chained-player';
import { TimeEngine, type TimeFence, type TimeSnapshot } from '@/lib/time/time-engine';
import {
  getAudioBlob,
  getPlayedIds,
  getRaceMessages,
  getRaceSnapshot,
  getUnsyncedPlayback,
  markPlaybackSynced,
  markPlayedLocally,
} from '@/lib/offline/db';
import { prefetchRace, type PrefetchProgress } from '@/lib/offline/prefetch';
import type { OfflineMessage } from '@/types';
import { isNativeApp } from '@/lib/native/platform';
import { startAudioKeepAlive, stopAudioKeepAlive } from '@/lib/native/audio-keepalive';
import { routing } from '@/i18n/routing';
import { formatClock, formatStopwatch } from '@/lib/utils';

type Stage = 'loading' | 'needs-prepare' | 'ready' | 'running';

interface TimeLiveClientProps {
  raceId: string;
  raceName: string;
  durationS: number;
  serverMessageCount: number;
}

/**
 * ============================================================================
 * Écran de course • mode « temps » (chronomètre)
 * ============================================================================
 *
 * Jumeau de LiveClient pour les courses sans GPX. Même socle exactement •
 * déblocage audio, préparation hors-ligne, file de lecture, synchro des
 * lectures • mais piloté par un TimeEngine plutôt qu'un GeoEngine, et une UI
 * de chronomètre au lieu d'une carte.
 *
 * On duplique volontairement plutôt que de brancher un composant unique de
 * 500 lignes sur chaque affichage : les deux moteurs partagent leurs
 * bibliothèques (le vrai code réutilisé), pas leur mise en page.
 */
export function TimeLiveClient({
  raceId,
  raceName,
  durationS,
  serverMessageCount,
}: TimeLiveClientProps) {
  const t = useTranslations('TimeLiveClient');
  const locale = useLocale();
  const [stage, setStage] = useState<Stage>('loading');
  const [messages, setMessages] = useState<OfflineMessage[]>([]);
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<PrefetchProgress | null>(null);
  const [elapsedS, setElapsedS] = useState(0);
  const [phase, setPhase] = useState<PlaybackPhase>('idle');
  const [nowPlaying, setNowPlaying] = useState<QueuedMessage | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [wakeLockHeld, setWakeLockHeld] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const playerRef = useRef<ChainedAudioPlayer | null>(null);
  const engineRef = useRef<TimeEngine | null>(null);

  // -------------------------------------------------- lecture du cache local --
  const loadFromCache = useCallback(async () => {
    const snapshot = await getRaceSnapshot(raceId);
    if (!snapshot) {
      setStage('needs-prepare');
      return;
    }
    const [cachedMessages, played] = await Promise.all([
      getRaceMessages(raceId),
      getPlayedIds(raceId),
    ]);
    setMessages(cachedMessages);
    setPlayedIds(new Set(played));
    setStage('ready');
  }, [raceId]);

  useEffect(() => {
    void loadFromCache();
  }, [loadFromCache]);

  // Resynchronise les lectures dès le retour du réseau.
  useEffect(() => {
    const sync = async () => {
      const pending = await getUnsyncedPlayback(raceId);
      if (pending.length === 0) return;
      try {
        const res = await fetch('/api/races/' + raceId + '/played', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ entries: pending }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { synced: string[] };
        await markPlaybackSynced(json.synced);
      } catch {
        /* on retentera */
      }
    };
    void sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [raceId]);

  useEffect(
    () => () => {
      engineRef.current?.stop();
      playerRef.current?.stop();
    },
    [],
  );

  // ------------------------------------------------------------- préparation --
  const prepare = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/races/' + raceId + '/prefetch', { cache: 'no-store' });
      if (!res.ok) throw new Error('prefetch');
      const payload = (await res.json()) as Parameters<typeof prefetchRace>[0];
      const result = await prefetchRace(payload, setProgress);
      if (result.failed.length > 0) {
        setError(t('downloadFailed', { count: result.failed.length }));
      }
      await loadFromCache();
    } catch {
      setError(t('prepareFailed'));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [loadFromCache, raceId, t]);

  // -------------------------------------------------------- démarrage course --
  const startRace = useCallback(async () => {
    setError(null);

    const player = new ChainedAudioPlayer({
      onPhase: (nextPhase, message) => {
        setPhase(nextPhase);
        setNowPlaying(message);
      },
      onQueueChange: setQueueLength,
      onFinished: (message) => {
        setPlayedIds((prev) => new Set(prev).add(message.id));
        void markPlayedLocally(message.id, raceId);
        void fetch('/api/races/' + raceId + '/played', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ entries: [{ id: message.id, playedAt: Date.now() }] }),
        }).catch(() => undefined);
      },
      onError: () => setError(t('errorPlayback')),
    });
    playerRef.current = player;

    // Doit partir dans le geste utilisateur, avant tout autre await.
    const unlocked = await player.unlock();
    if (!unlocked) {
      setError(t('errorAudioBlocked'));
      return;
    }

    // App native : session audio maintenue pour que le chrono continue à
    // déclencher les vocaux écran verrouillé. Sans effet sur le web.
    if (isNativeApp()) startAudioKeepAlive();

    const fences: TimeFence[] = messages
      .filter((m) => m.trigger_at_s !== null)
      .map((m) => ({ id: m.id, triggerAtS: m.trigger_at_s as number }));

    const engine = new TimeEngine({
      fences,
      durationS,
      onTick: (snapshot: TimeSnapshot) => setElapsedS(snapshot.elapsedS),
      onWakeLock: setWakeLockHeld,
      onTrigger: async (fence) => {
        const message = messages.find((m) => m.id === fence.id);
        if (!message) return;
        const blob = await getAudioBlob(fence.id);
        if (!blob) {
          setError(t('errorMissingVoice'));
          return;
        }
        player.enqueue({ id: fence.id, authorName: message.author_name, blob });
      },
    });

    engine.seedConsumed([...playedIds]);
    engineRef.current = engine;
    await engine.start();

    setStage('running');

    void fetch('/api/races/' + raceId, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'live' }),
    }).catch(() => undefined);
  }, [durationS, messages, playedIds, raceId, t]);

  const pauseRace = useCallback(() => {
    engineRef.current?.pause();
    playerRef.current?.stop();
    stopAudioKeepAlive();
    engineRef.current = null;
    playerRef.current = null;
    setStage('ready');
  }, []);

  const remaining = useMemo(
    () => messages.filter((m) => !playedIds.has(m.id)),
    [messages, playedIds],
  );

  const nextMessage = useMemo(() => {
    return (
      remaining.find((m) => (m.trigger_at_s ?? 0) >= elapsedS) ??
      remaining[remaining.length - 1] ??
      null
    );
  }, [elapsedS, remaining]);

  // ============================================================== rendu ======

  if (stage === 'loading') {
    return <CenteredNote>{t('loadingCache')}</CenteredNote>;
  }

  if (stage === 'needs-prepare') {
    return (
      <main className="mx-auto max-w-lg px-5 py-12 sm:px-8">
        <BackLink raceId={raceId} />
        <Surface className="mt-6">
          <h1 className="text-[20px] font-bold uppercase tracking-[-0.01em] text-charcoal">
            {t('prepareTitle', { raceName })}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-charcoal-muted">
            {t('prepareIntro', { count: serverMessageCount })}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-charcoal-faint">
            {t('prepareWhen')}
          </p>

          {progress ? (
            <div className="mt-6">
              <div className="h-3 overflow-hidden rounded-md border-2 border-black bg-white">
                <div
                  className="h-full bg-orange transition-[width] duration-300"
                  style={{
                    width: progress.total ? (progress.done / progress.total) * 100 + '%' : '0%',
                  }}
                />
              </div>
              <p className="mt-2.5 font-mono text-[12px] uppercase tracking-[0.04em] text-black/60">
                {progress.done} / {progress.total}
                {progress.currentAuthor ? ' · ' + progress.currentAuthor : ''}
              </p>
            </div>
          ) : null}

          {error ? <p className="mt-5 text-[13px] text-clay">{error}</p> : null}

          <Button className="mt-6" fullWidth size="lg" onClick={() => void prepare()} disabled={busy}>
            {busy ? t('downloading') : t('prepareRace')}
          </Button>
        </Surface>
      </main>
    );
  }

  if (stage === 'ready') {
    return (
      <main className="mx-auto max-w-lg px-5 py-12 sm:px-8">
        <BackLink raceId={raceId} />
        <Surface className="mt-6">
          <Badge tone="matcha">{t('readyToRun')}</Badge>
          <h1 className="mt-4 text-[22px] font-bold uppercase tracking-[-0.01em] text-charcoal">
            {raceName}
          </h1>
          <p className="mt-2 text-[14px] text-charcoal-muted">
            {t('readyStats', { clock: formatClock(durationS, locale), count: remaining.length })}
          </p>

          <Divider className="my-6" />

          <ul className="space-y-3 text-[13.5px] leading-relaxed text-charcoal-muted">
            <li className="flex gap-2.5">
              <Dot />
              <span>{t('tipHeadphones')}</span>
            </li>
            <li className="flex gap-2.5">
              <Dot />
              <span>
                {t('tipForeground')}
              </span>
            </li>
            <li className="flex gap-2.5">
              <Dot />
              <span>{t('tipMessages')}</span>
            </li>
          </ul>

          {error ? <p className="mt-5 text-[13px] text-clay">{error}</p> : null}

          <Button className="mt-7" fullWidth size="lg" onClick={() => void startRace()}>
            {t('startTimer')}
          </Button>
          <button
            type="button"
            onClick={() => void prepare()}
            className="mt-4 w-full text-center font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-black/60 underline decoration-orange decoration-2 underline-offset-2 hover:text-black"
          >
            {t('redownload')}
          </button>
        </Surface>
      </main>
    );
  }

  // ------------------------------------------------------------- en course ----
  const progressPct = durationS > 0 ? Math.min(100, (elapsedS / durationS) * 100) : 0;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col px-5 py-6 sm:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-orange">
            {t('running')}
          </p>
          <p className="mt-1.5 font-mono text-[2.75rem] leading-none tabular-nums tracking-[-0.02em] text-charcoal">
            {formatStopwatch(elapsedS)}
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-black/55">{t('objective', { clock: formatClock(durationS, locale) })}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-black/55">{t('messagesRemaining')}</p>
          <p className="mt-1 font-mono text-[1.75rem] leading-none tabular-nums text-charcoal">
            {remaining.length}
          </p>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-md border-2 border-black bg-white">
        <div
          className="h-full bg-orange transition-[width] duration-500"
          style={{ width: progressPct + '%' }}
        />
      </div>

      <div className="mt-5 min-h-[76px]">
        {phase !== 'idle' && nowPlaying ? (
          <div className="flex items-center gap-4 rounded-lg border-[3px] border-black bg-black p-4 text-yellow shadow-[4px_4px_0_0_#000] animate-rise">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-yellow/20">
              <span className="absolute inset-0 rounded-full bg-yellow/25 animate-pulse-ring" />
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold">
                {phase === 'announcing' ? t('announcingName', { name: nowPlaying.authorName }) : nowPlaying.authorName}
              </p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.04em] text-yellow/70">
                {phase === 'announcing' ? t('announcing') : t('playingVoice')}
                {queueLength > 1 ? ' · ' + t('queued', { count: queueLength - 1 }) : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => playerRef.current?.skip()}
              className="ml-auto shrink-0 rounded-md border-2 border-yellow/40 px-3 py-1.5 font-mono text-[11px] font-bold uppercase text-yellow/80 transition-colors hover:bg-yellow hover:text-black"
            >
              {t('skip')}
            </button>
          </div>
        ) : nextMessage ? (
          <div className="rounded-lg border-[3px] border-black bg-paper p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-black/55">{t('nextMessage')}</p>
            <p className="mt-1 text-[14.5px] text-charcoal">
              {t.rich('nextMessageAt', {
                strong: (c) => <strong className="font-bold">{c}</strong>,
                name: nextMessage.author_name,
                clock: formatClock(nextMessage.trigger_at_s ?? 0, locale),
              })}
              {(nextMessage.trigger_at_s ?? 0) > elapsedS ? (
                <span className="text-charcoal-faint">
                  {' · '}
                  {t('nextMessageIn', { time: formatStopwatch((nextMessage.trigger_at_s ?? 0) - elapsedS) })}
                </span>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border-[3px] border-black bg-paper p-4">
            <p className="text-[14px] text-charcoal">{t('allPlayed')}</p>
            <p className="mt-1 text-[12.5px] text-charcoal-faint">{t('justFinish')}</p>
          </div>
        )}
      </div>

      {/* Frise de progression : les repères des messages restants sur la durée */}
      <div className="mt-6 flex-1">
        <div className="relative h-3 rounded-md border-2 border-black bg-white">
          <div
            className="absolute inset-y-0 left-0 bg-orange"
            style={{ width: progressPct + '%' }}
          />
          {remaining.map((m) => (
            <span
              key={m.id}
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-neon"
              style={{ left: ((m.trigger_at_s ?? 0) / durationS) * 100 + '%' }}
              title={t('markerTitle', { name: m.author_name, clock: formatClock(m.trigger_at_s ?? 0, locale) })}
            />
          ))}
          {/* Position du coureur */}
          <span
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-black shadow-[2px_2px_0_0_#000]"
            style={{ left: progressPct + '%' }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.06em] text-black/50">
          <span>{t('start')}</span>
          <span>{formatClock(durationS, locale)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-black/50">
        <span className="text-orange">{t('timerActive')}</span>
        <span>{wakeLockHeld ? t('screenOn') : t('screenRequired')}</span>
        <span>{t('offlineOk')}</span>
      </div>

      {error ? <p className="mt-2 text-[12.5px] text-clay">{error}</p> : null}

      <div className="mt-4 flex gap-2.5">
        <Button variant="secondary" size="md" fullWidth onClick={pauseRace}>
          {t('pause')}
        </Button>
        <ButtonLink
          href={(locale === routing.defaultLocale ? '' : '/' + locale) + '/app/races/' + raceId + '/finish'}
          variant="dark"
          size="md"
          className="flex-1"
        >
          {t('finished')}
        </ButtonLink>
      </div>
    </main>
  );
}

function BackLink({ raceId }: { raceId: string }) {
  const t = useTranslations('TimeLiveClient');
  return (
    <Link
      href={'/app/races/' + raceId}
      className="font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-black/60 transition-colors hover:text-black"
    >
      {t('back')}
    </Link>
  );
}

function CenteredNote({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-5">
      <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-black/55">{children}</p>
    </main>
  );
}

function Dot() {
  return <span className="mt-[6px] size-2 shrink-0 border-2 border-black bg-orange" />;
}
