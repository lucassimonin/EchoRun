'use client';

import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge, Divider, Surface } from '@/components/ui/Surface';
import {
  ChainedAudioPlayer,
  type PlaybackPhase,
  type QueuedMessage,
} from '@/lib/audio/chained-player';
import type { Geofence, PositionSnapshot } from '@/lib/geo/geo-engine';
import { createGeoEngine, type IGeoEngine } from '@/lib/geo/create-geo-engine';
import { isNativeApp } from '@/lib/native/platform';
import { startAudioKeepAlive, stopAudioKeepAlive } from '@/lib/native/audio-keepalive';
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
import type { OfflineMessage, TrackPoint } from '@/types';
import { cx, formatDistance } from '@/lib/utils';

const RaceMap = dynamicImport(() => import('@/components/map/RaceMap').then((m) => m.RaceMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-off" />,
});

type Stage = 'loading' | 'needs-prepare' | 'ready' | 'running';

interface LiveClientProps {
  raceId: string;
  raceName: string;
  distanceM: number;
  serverMessageCount: number;
}

export function LiveClient({ raceId, raceName, distanceM, serverMessageCount }: LiveClientProps) {
  const [stage, setStage] = useState<Stage>('loading');
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [messages, setMessages] = useState<OfflineMessage[]>([]);
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<PrefetchProgress | null>(null);
  const [position, setPosition] = useState<PositionSnapshot | null>(null);
  const [phase, setPhase] = useState<PlaybackPhase>('idle');
  const [nowPlaying, setNowPlaying] = useState<QueuedMessage | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [wakeLockHeld, setWakeLockHeld] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const playerRef = useRef<ChainedAudioPlayer | null>(null);
  const engineRef = useRef<IGeoEngine | null>(null);

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

    setTrack(snapshot.track);
    setMessages(cachedMessages);
    setPlayedIds(new Set(played));
    setStage('ready');
  }, [raceId]);

  useEffect(() => {
    void loadFromCache();
  }, [loadFromCache]);

  // Resynchronise les lectures des le retour du reseau.
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

  useEffect(() => () => {
    engineRef.current?.stop();
    playerRef.current?.stop();
  }, []);

  // ------------------------------------------------------------- preparation --
  const prepare = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/races/' + raceId + '/prefetch', { cache: 'no-store' });
      if (!res.ok) throw new Error('prefetch');
      const payload = (await res.json()) as Parameters<typeof prefetchRace>[0];

      const result = await prefetchRace(payload, setProgress);
      if (result.failed.length > 0) {
        setError(
          result.failed.length +
            ' message(s) n’ont pas pu être téléchargés. Relance la préparation avec une meilleure connexion.',
        );
      }
      await loadFromCache();
    } catch {
      setError('Préparation impossible. Vérifie ta connexion et réessaie.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [loadFromCache, raceId]);

  // ------------------------------------------------------- demarrage course --
  /**
   * ATTENTION : `player.unlock()` doit partir dans le geste utilisateur.
   * On l'appelle donc en premier, avant tout `await` sur autre chose.
   */
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
        // Tentative immediate, sans blocage : si on n'a pas de reseau, la
        // trace locale sera synchronisee plus tard.
        void fetch('/api/races/' + raceId + '/played', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ entries: [{ id: message.id, playedAt: Date.now() }] }),
        }).catch(() => undefined);
      },
      onError: () => setError('Un message n’a pas pu être lu. La course continue.'),
    });
    playerRef.current = player;

    const unlocked = await player.unlock();
    if (!unlocked) {
      setError(
        'Le son est bloqué par le navigateur. Touche à nouveau « Démarrer » et vérifie que le téléphone n’est pas en mode silencieux.',
      );
      return;
    }

    // App native : on maintient une session audio active pour survivre à
    // l'écran verrouillé (cf. audio-keepalive). Sans effet sur le web.
    if (isNativeApp()) startAudioKeepAlive();

    const fences: Geofence[] = messages
      .filter((m) => m.lat !== null && m.lng !== null)
      .map((m) => ({
        id: m.id,
        lat: m.lat as number,
        lng: m.lng as number,
        radiusM: m.trigger_radius_m,
        distanceAlongM: m.distance_m,
      }));

    const engine = createGeoEngine({
      track,
      fences,
      onPosition: setPosition,
      onState: (state, detail) => {
        if (state === 'error' && detail) setGeoError(detail);
        else setGeoError(null);
      },
      onWakeLock: setWakeLockHeld,
      onTrigger: async (fence) => {
        const message = messages.find((m) => m.id === fence.id);
        if (!message) return;
        const blob = await getAudioBlob(fence.id);
        if (!blob) {
          setError('Un vocal manque dans le cache. Relance la préparation après la course.');
          return;
        }
        player.enqueue({ id: fence.id, authorName: message.author_name, blob });
      },
    });

    engine.seedConsumed([...playedIds]);
    engineRef.current = engine;
    await engine.start();

    setStage('running');

    // Statut informatif pour le coureur et le back-office.
    void fetch('/api/races/' + raceId, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'live' }),
    }).catch(() => undefined);
  }, [messages, playedIds, raceId, track]);

  const stopRace = useCallback(() => {
    engineRef.current?.stop();
    playerRef.current?.stop();
    stopAudioKeepAlive();
    engineRef.current = null;
    playerRef.current = null;
    setStage('ready');
    setPosition(null);
  }, []);

  const remaining = useMemo(
    () => messages.filter((m) => !playedIds.has(m.id)),
    [messages, playedIds],
  );

  const nextMessage = useMemo(() => {
    if (!position) return remaining[0] ?? null;
    return (
      remaining.find((m) => m.distance_m >= position.progressM) ?? remaining[remaining.length - 1] ?? null
    );
  }, [position, remaining]);

  // ============================================================== rendu ======

  if (stage === 'loading') {
    return <CenteredNote>Lecture du cache local…</CenteredNote>;
  }

  if (stage === 'needs-prepare') {
    return (
      <main className="mx-auto max-w-lg px-5 py-12 sm:px-8">
        <BackLink raceId={raceId} />
        <Surface className="mt-6">
          <h1 className="text-[20px] font-bold uppercase tracking-[-0.01em] text-charcoal">
            Préparer {raceName}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-charcoal-muted">
            On télécharge le tracé et les {serverMessageCount} message
            {serverMessageCount === 1 ? '' : 's'} sur ce téléphone. Ensuite, tout fonctionne sans
            réseau&nbsp;: mode avion, tunnel, fond de vallée.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-charcoal-faint">
            À faire la veille, sur le wifi. Compte quelques secondes par message.
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
            {busy ? 'Téléchargement…' : 'Préparer la course'}
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
          <Badge tone="matcha">Prêt à courir</Badge>
          <h1 className="mt-4 text-[22px] font-bold uppercase tracking-[-0.01em] text-charcoal">
            {raceName}
          </h1>
          <p className="mt-2 text-[14px] text-charcoal-muted">
            {formatDistance(distanceM)} · {remaining.length} message
            {remaining.length === 1 ? '' : 's'} en attente
          </p>

          <Divider className="my-6" />

          <ul className="space-y-3 text-[13.5px] leading-relaxed text-charcoal-muted">
            <li className="flex gap-2.5">
              <Dot />
              <span>
                Mets tes écouteurs. Ouverts ou à conduction osseuse, pour entendre l’environnement.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Dot />
              <span>
                Garde cette page au premier plan, écran allumé. Une application web n’a pas accès
                au GPS en arrière-plan.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Dot />
              <span>Baisse la luminosité au minimum : compte environ 12&nbsp;% de batterie par heure.</span>
            </li>
          </ul>

          {error ? <p className="mt-5 text-[13px] text-clay">{error}</p> : null}

          <Button className="mt-7" fullWidth size="lg" onClick={() => void startRace()}>
            Démarrer la course
          </Button>

          <button
            type="button"
            onClick={() => void prepare()}
            className="mt-4 w-full text-center font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-black/60 underline decoration-orange decoration-2 underline-offset-2 hover:text-black"
          >
            Re-télécharger les messages
          </button>
        </Surface>
      </main>
    );
  }

  // ------------------------------------------------------------- en course ----
  const progressPct = position ? Math.min(100, (position.progressM / distanceM) * 100) : 0;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col px-5 py-6 sm:px-8">
      {/* Bandeau d'état : gros chiffres, lisibles en courant. */}
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-orange">
            En course
          </p>
          <p className="mt-1.5 font-mono text-[2.25rem] leading-none tabular-nums tracking-[-0.02em] text-charcoal">
            {position ? (position.progressM / 1000).toFixed(2).replace('.', ',') : '•'}
            <span className="ml-1.5 text-[1rem] text-charcoal-faint">km</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-black/55">Messages restants</p>
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

      {/* Lecture en cours */}
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
                {phase === 'announcing' ? 'Message de ' + nowPlaying.authorName : nowPlaying.authorName}
              </p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.04em] text-yellow/70">
                {phase === 'announcing' ? 'Annonce…' : 'Lecture du vocal'}
                {queueLength > 1 ? ' · ' + (queueLength - 1) + ' en file' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => playerRef.current?.skip()}
              className="ml-auto shrink-0 rounded-md border-2 border-yellow/40 px-3 py-1.5 font-mono text-[11px] font-bold uppercase text-yellow/80 transition-colors hover:bg-yellow hover:text-black"
            >
              Passer
            </button>
          </div>
        ) : nextMessage ? (
          <div className="rounded-lg border-[3px] border-black bg-paper p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-black/55">Prochain message</p>
            <p className="mt-1 text-[14.5px] text-charcoal">
              <strong className="font-bold">{nextMessage.author_name}</strong> · km{' '}
              {(nextMessage.distance_m / 1000).toFixed(1).replace('.', ',')}
              {position ? (
                <span className="text-charcoal-faint">
                  {' '}
                  · dans{' '}
                  {formatDistance(Math.max(0, nextMessage.distance_m - position.progressM))}
                </span>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border-[3px] border-black bg-paper p-4">
            <p className="text-[14px] text-charcoal">Tous les messages ont été lus.</p>
            <p className="mt-1 text-[12.5px] text-charcoal-faint">Il ne reste plus qu’à finir.</p>
          </div>
        )}
      </div>

      {/* Carte */}
      <div className="mt-4 flex-1 overflow-hidden rounded-lg border-[3px] border-black">
        <RaceMap
          track={track}
          takenPoints={remaining
            .filter((m) => m.lat !== null && m.lng !== null)
            .map((m) => ({
              lat: m.lat as number,
              lng: m.lng as number,
              author_name: m.author_name,
            }))}
          runner={
            position ? { lat: position.lat, lng: position.lng, accuracyM: position.accuracyM } : null
          }
          followRunner
        />
      </div>

      {/* Diagnostics discrets */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-black/50">
        <span className={cx(position ? 'text-matcha-500' : 'text-clay')}>
          {position ? 'GPS ±' + Math.round(position.accuracyM) + ' m' : 'Recherche du signal…'}
        </span>
        <span>{wakeLockHeld ? 'Écran maintenu allumé' : 'Écran non verrouillé requis'}</span>
        <span>Hors-ligne OK</span>
      </div>

      {geoError ? <p className="mt-2 text-[12.5px] text-clay">{geoError}</p> : null}
      {error ? <p className="mt-2 text-[12.5px] text-clay">{error}</p> : null}

      <div className="mt-4 flex gap-2.5">
        <Button variant="secondary" size="md" fullWidth onClick={stopRace}>
          Mettre en pause
        </Button>
        <ButtonLink
          href={'/app/races/' + raceId + '/finish'}
          variant="dark"
          size="md"
          className="flex-1"
        >
          J’ai fini
        </ButtonLink>
      </div>
    </main>
  );
}

function BackLink({ raceId }: { raceId: string }) {
  return (
    <Link
      href={'/app/races/' + raceId}
      className="font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-black/60 transition-colors hover:text-black"
    >
      ← Retour à la course
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
