'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdSenseUnit } from '@/components/ads/AdSenseUnit';
import { RecorderPanel } from '@/components/recorder/RecorderPanel';
import { Button } from '@/components/ui/Button';
import { Badge, Divider, Surface } from '@/components/ui/Surface';
import { Field, TextInput } from '@/components/ui/Field';
import { Timeline } from '@/components/timeline/Timeline';
import { snapToTrack, type SnapResult } from '@/lib/geo/geometry';
import type { RecordingResult } from '@/lib/audio/recorder';
import { cx, formatClock, formatDistance, formatRaceDate, sanitizeName } from '@/lib/utils';
import type { ContributorIdentity, ContributorPostState, PublicRace } from '@/types';

// Leaflet touche `window` : jamais rendu côté serveur.
const RaceMap = dynamic(() => import('@/components/map/RaceMap').then((m) => m.RaceMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-bone-100" />,
});

const TRIGGER_RADIUS_M = 70;

interface ContributorFlowProps {
  race: PublicRace;
  closed: boolean;
  adClientId: string | null;
  adSlotId: string | null;
}

function storageKey(slug: string) {
  return 'echorun:contributor:' + slug;
}

function readIdentity(slug: string): ContributorIdentity | null {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContributorIdentity;
    return parsed?.id && parsed?.claimToken ? parsed : null;
  } catch {
    return null;
  }
}

export function ContributorFlow({ race, closed, adClientId, adSlotId }: ContributorFlowProps) {
  const [identity, setIdentity] = useState<ContributorIdentity | null>(null);
  const [postState, setPostState] = useState<ContributorPostState | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [identifying, setIdentifying] = useState(false);
  // Mode GPX : un point du tracé. Mode temps : un instant en secondes.
  const [selected, setSelected] = useState<SnapResult | null>(null);
  const [selectedTimeS, setSelectedTimeS] = useState<number | null>(null);
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [takenPoints, setTakenPoints] = useState(race.taken_points);
  const [takenTimes, setTakenTimes] = useState(race.taken_times);

  const isTimeMode = race.mode === 'time';

  const refreshState = useCallback(async (claimToken: string) => {
    try {
      const res = await fetch(
        '/api/public/contributor?claim_token=' + encodeURIComponent(claimToken),
        { cache: 'no-store' },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { state: ContributorPostState };
      setPostState(json.state);
    } catch {
      /* l'état est revalidé côté serveur à l'envoi : non bloquant */
    }
  }, []);

  // ----------------------------------------------------- reprise de session --
  useEffect(() => {
    const stored = readIdentity(race.share_slug);
    if (!stored) return;
    setIdentity(stored);
    void refreshState(stored.claimToken);
  }, [race.share_slug, refreshState]);

  // ------------------------------------------------------------- identification
  const submitName = useCallback(async () => {
    const name = sanitizeName(nameDraft);
    if (name.length < 2) {
      setError('Indique au moins deux caractères.');
      return;
    }
    setIdentifying(true);
    setError(null);

    try {
      const res = await fetch('/api/public/contributor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: race.share_slug, name }),
      });
      const json = (await res.json()) as
        | { contributor: ContributorIdentity; state: ContributorPostState }
        | { error: string };

      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error : 'Impossible de continuer.');
        return;
      }

      localStorage.setItem(storageKey(race.share_slug), JSON.stringify(json.contributor));
      setIdentity(json.contributor);
      setPostState(json.state);
    } catch {
      setError('Connexion impossible. Réessaie dans un instant.');
    } finally {
      setIdentifying(false);
    }
  }, [nameDraft, race.share_slug]);

  // ------------------------------------------------------------------- envoi --
  const send = useCallback(async () => {
    const hasSelection = isTimeMode ? selectedTimeS !== null : selected !== null;
    if (!identity || !recording || !hasSelection) return;
    setSending(true);
    setError(null);

    const form = new FormData();
    form.set('claim_token', identity.claimToken);
    form.set('duration_ms', String(recording.durationMs));
    form.set('mime_type', recording.mimeType);
    form.set('audio', recording.blob, 'message');

    if (isTimeMode) {
      form.set('trigger_at_s', String(selectedTimeS));
    } else if (selected) {
      form.set('lat', String(selected.lat));
      form.set('lng', String(selected.lng));
      form.set('distance_m', String(selected.distanceAlongM));
    }

    try {
      const res = await fetch('/api/public/message', { method: 'POST', body: form });
      const json = (await res.json()) as { state?: ContributorPostState; error?: string };

      if (!res.ok) {
        setError(json.error ?? 'Envoi impossible.');
        if (json.state) setPostState(json.state);
        return;
      }

      if (json.state) setPostState(json.state);
      if (isTimeMode && selectedTimeS !== null) {
        setTakenTimes((times) => [
          ...times,
          { trigger_at_s: selectedTimeS, author_name: identity.name },
        ]);
      } else if (selected) {
        setTakenPoints((points) => [
          ...points,
          { lat: selected.lat, lng: selected.lng, author_name: identity.name },
        ]);
      }
      setRecording(null);
      setSelected(null);
      setSelectedTimeS(null);
      setNotice('Message envoyé à ' + race.runner_name + ' 🎉');
    } catch {
      setError('Envoi interrompu. Vérifie ta connexion et réessaie.');
    } finally {
      setSending(false);
    }
  }, [identity, isTimeMode, recording, selected, selectedTimeS, race.runner_name]);

  // ------------------------------------------------------------------- dérivé --
  const handlePick = useCallback(
    (lat: number, lng: number) => {
      const snapped = snapToTrack(race.track, lat, lng);
      if (!snapped || snapped.offsetM > 2500) {
        setError('Clique plus près du tracé de la course.');
        return;
      }
      setError(null);
      setSelected(snapped);
    },
    [race.track],
  );

  const hasSelection = isTimeMode ? selectedTimeS !== null : selected !== null;
  const canSend = !!identity && hasSelection && !!recording && !sending;
  // Le proche peut-il encore poster ? (quota perso ET place course restants)
  const full = !!postState && !postState.canPost;

  const phase = useMemo<'identify' | 'compose'>(
    () => (identity ? 'compose' : 'identify'),
    [identity],
  );

  return (
    <main className="mx-auto max-w-2xl px-5 pb-4 pt-8">
      {/* ------------------------------------------------------- en-tête course */}
      <section className="animate-rise">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-matcha-400">
          Un message pour
        </p>
        <h1 className="mt-3 text-[clamp(1.75rem,6vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.033em] text-charcoal">
          {race.runner_name}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-charcoal-muted">
          {race.name} · {formatRaceDate(race.race_date)} ·{' '}
          {isTimeMode && race.duration_s
            ? 'objectif ' + formatClock(race.duration_s)
            : formatDistance(race.distance_m)}
        </p>
        <p className="mt-4 text-[14.5px] leading-relaxed text-charcoal-muted">
          {isTimeMode
            ? 'Choisis le moment de la course où ta voix se déclenchera, puis enregistre ton message. ' +
              race.runner_name +
              ' l’entendra pile à cet instant de son chrono.'
            : 'Choisis le point du parcours où ta voix se déclenchera, puis enregistre ton message. ' +
              race.runner_name +
              ' l’entendra en courant, pile à cet endroit.'}
        </p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-charcoal-faint">
          C’est gratuit et sans compte. {race.per_contributor_cap} messages maximum par personne.
        </p>
      </section>

      {closed ? (
        <Surface className="mt-8 border-clay/20 bg-clay/[0.04]">
          <p className="text-[14px] font-medium text-charcoal">Cette course est terminée</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-charcoal-muted">
            Il n’est plus possible de déposer un message. {race.runner_name} a bien reçu ceux qui
            ont été enregistrés à temps.
          </p>
        </Surface>
      ) : (
        <>
          {notice ? (
            <div className="mt-6 rounded-2xl bg-matcha-100 px-4 py-3 text-[13.5px] text-matcha-600">
              {notice}
            </div>
          ) : null}

          {/* ------------------------------------------------------ étape 1 : nom */}
          {phase === 'identify' ? (
            <Surface className="mt-8 animate-rise">
              <StepHeader index={1} title="Comment t’appelles-tu ?" />
              <p className="mb-5 text-[13.5px] leading-relaxed text-charcoal-muted">
                {race.runner_name} entendra «&nbsp;Message de{' '}
                <strong>{sanitizeName(nameDraft) || '…'}</strong>&nbsp;» juste avant ton vocal.
                Prénom ou surnom, comme il te connaît.
              </p>
              <Field label="Ton prénom" htmlFor="contributor-name" error={error}>
                <TextInput
                  id="contributor-name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void submitName()}
                  placeholder="Camille"
                  maxLength={40}
                  autoComplete="given-name"
                  enterKeyHint="go"
                />
              </Field>
              <Button
                className="mt-5"
                fullWidth
                size="lg"
                onClick={() => void submitName()}
                disabled={identifying || sanitizeName(nameDraft).length < 2}
              >
                {identifying ? 'Un instant…' : 'Continuer'}
              </Button>
            </Surface>
          ) : null}

          {/* -------------------------------------------- étapes 2 & 3 : compose */}
          {phase === 'compose' && identity ? (
            <>
              <div className="mt-8 flex items-center justify-between gap-4">
                <p className="text-[13.5px] text-charcoal-muted">
                  Bonjour <strong className="font-medium text-charcoal">{identity.name}</strong>
                </p>
                {postState ? <PersonalBadge state={postState} /> : null}
              </div>

              {full ? (
                <FullNotice state={postState} runnerName={race.runner_name} />
              ) : (
                <>
                  {isTimeMode && race.duration_s ? (
                    <Surface className="mt-4 animate-rise">
                      <StepHeader index={2} title="Choisis ton moment" />
                      <p className="mb-2 text-[13.5px] leading-relaxed text-charcoal-muted">
                        Fais glisser le curseur sur la durée prévue de la course. Ta voix partira
                        quand le chrono de {race.runner_name} atteindra cet instant.
                      </p>
                      <Timeline
                        durationS={race.duration_s}
                        selectedS={selectedTimeS}
                        onSelect={(s) => {
                          setError(null);
                          setSelectedTimeS(s);
                        }}
                        taken={takenTimes}
                      />
                    </Surface>
                  ) : (
                    <Surface className="mt-4 overflow-hidden p-0 animate-rise">
                      <div className="p-6 pb-4">
                        <StepHeader index={2} title="Choisis ton kilomètre" />
                        <p className="text-[13.5px] leading-relaxed text-charcoal-muted">
                          Touche le tracé à l’endroit voulu. Pas besoin d’être précis, on recale
                          automatiquement sur le parcours.
                        </p>
                      </div>

                      <div className="h-[320px] border-y border-charcoal/[0.07] sm:h-[380px]">
                        <RaceMap
                          track={race.track}
                          bounds={race.bounds}
                          takenPoints={takenPoints}
                          selected={selected ? { lat: selected.lat, lng: selected.lng } : null}
                          selectedRadiusM={TRIGGER_RADIUS_M}
                          onPick={handlePick}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 p-5">
                        {selected ? (
                          <>
                            <div>
                              <p className="text-[14px] font-medium text-charcoal">
                                Km {(selected.distanceAlongM / 1000).toFixed(1).replace('.', ',')}
                              </p>
                              <p className="mt-0.5 text-[12px] text-charcoal-faint">
                                Déclenchement dans un rayon de {TRIGGER_RADIUS_M} m
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                              Changer
                            </Button>
                          </>
                        ) : (
                          <p className="text-[13px] text-charcoal-faint">
                            Aucun point choisi pour l’instant
                          </p>
                        )}
                      </div>
                    </Surface>
                  )}

                  <Surface
                    className={cx(
                      'mt-4 transition-opacity duration-300',
                      !hasSelection && 'pointer-events-none opacity-45',
                    )}
                  >
                    <StepHeader index={3} title="Enregistre ton message" />
                    <p className="mb-4 text-[13.5px] leading-relaxed text-charcoal-muted">
                      Trente secondes maximum. Va droit au but&nbsp;: en course, on écoute mal les
                      longues phrases.
                    </p>
                    <RecorderPanel
                      disabled={!hasSelection}
                      recording={recording}
                      onRecorded={setRecording}
                    />

                    {recording ? (
                      <>
                        <Divider className="my-5" />
                        <Button fullWidth size="lg" onClick={() => void send()} disabled={!canSend}>
                          {sending ? 'Envoi…' : 'Envoyer à ' + race.runner_name}
                        </Button>
                      </>
                    ) : null}

                    {error ? <p className="mt-4 text-[13px] text-clay">{error}</p> : null}
                  </Surface>
                </>
              )}
            </>
          ) : null}
        </>
      )}

      {/* --------------------------------------------------------- publicité */}
      {adClientId && adSlotId ? (
        <div className="mt-10">
          <AdSenseUnit clientId={adClientId} slotId={adSlotId} format="auto" minHeight={130} />
        </div>
      ) : null}
    </main>
  );
}

function StepHeader({ index, title }: { index: number; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-matcha-100 text-[11px] font-semibold text-matcha-600">
        {index}
      </span>
      <h2 className="text-[16.5px] font-semibold tracking-[-0.018em] text-charcoal">{title}</h2>
    </div>
  );
}

function PersonalBadge({ state }: { state: ContributorPostState }) {
  const left = state.personalRemaining;
  const tone = left > 0 ? 'matcha' : 'clay';
  return (
    <Badge tone={tone}>
      {left > 0
        ? left + ' message' + (left > 1 ? 's' : '') + ' pour toi'
        : 'Tes ' + state.personalCap + ' messages envoyés'}
    </Badge>
  );
}

/**
 * Aucun blocage payant côté proche : soit il a atteint sa limite perso (5),
 * soit la course est pleine (le coureur a été prévenu pour débloquer).
 */
function FullNotice({
  state,
  runnerName,
}: {
  state: ContributorPostState | null;
  runnerName: string;
}) {
  if (!state) return null;

  const personalFull = state.personalRemaining <= 0;

  return (
    <Surface className="mt-4 animate-rise">
      {personalFull ? (
        <>
          <Badge tone="matcha">
            {state.personalUsed} message{state.personalUsed > 1 ? 's' : ''} envoyé
            {state.personalUsed > 1 ? 's' : ''}
          </Badge>
          <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-charcoal">
            Merci, tu as tout donné 💚
          </h2>
          <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-muted">
            Tu as déposé tes {state.personalCap} messages pour {runnerName}. C’est la limite par
            personne, pour laisser de la place aux autres proches. Il les entendra tous pendant sa
            course.
          </p>
        </>
      ) : (
        <>
          <Badge tone="clay">Course complète pour l’instant</Badge>
          <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-charcoal">
            La course est pleine… pour le moment
          </h2>
          <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-muted">
            {runnerName} a déjà reçu beaucoup de messages&nbsp;! On vient de le prévenir pour qu’il
            débloque plus de place. Reviens dans un petit moment&nbsp;: ta voix pourra alors se
            glisser sur le parcours.
          </p>
        </>
      )}
    </Surface>
  );
}
