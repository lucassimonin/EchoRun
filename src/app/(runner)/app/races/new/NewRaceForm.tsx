'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';
import { cx, formatClock } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import type { RaceMode } from '@/types';
import type { DrawnRoute } from '@/components/map/RouteDrawMap';

// Leaflet touche `window` : jamais rendu côté serveur.
const RouteDrawMap = dynamic(
  () => import('@/components/map/RouteDrawMap').then((m) => m.RouteDrawMap),
  { ssr: false, loading: () => <div className="h-[360px] animate-pulse rounded-lg border-[3px] border-black bg-off sm:h-[440px]" /> },
);

/** Méthode d'entrée du parcours, distincte du mode de course côté API. */
type InputMode = 'file' | 'draw' | 'time';

interface CreatedStats {
  mode: RaceMode;
  points?: number;
  rawPoints?: number;
  distanceM?: number;
  durationS?: number;
}

/** Detail technique renvoye par l'API en developpement uniquement. */
interface ApiDebug {
  context: string;
  code: string;
  message: string | null;
  details: string | null;
  hint: string | null;
}

/** Durées proposées en un clic, en minutes. */
const DURATION_PRESETS = [
  { label: '45 min', minutes: 45 },
  { label: '1 h', minutes: 60 },
  { label: '1 h 30', minutes: 90 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
  { label: '4 h', minutes: 240 },
];

export function NewRaceForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [drawn, setDrawn] = useState<DrawnRoute | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<ApiDebug | null>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (next: File | null) => {
    setError(null);
    setDebug(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!/\.gpx$/i.test(next.name)) {
      setError('Il faut un fichier .gpx.');
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux (10 Mo maximum).');
      return;
    }
    setFile(next);
    if (!name) setName(next.name.replace(/\.gpx$/i, '').replace(/[_-]+/g, ' ').slice(0, 120));
  };

  const canSubmit =
    inputMode === 'file'
      ? !!file
      : inputMode === 'draw'
        ? drawn !== null && drawn.points.length >= 2
        : durationMin !== null && durationMin >= 5;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setDebug(null);

    const form = new FormData();
    // Le dessin reste une course « gpx » côté API (même structure de tracé),
    // signalée par source=draw.
    form.set('mode', inputMode === 'time' ? 'time' : 'gpx');
    if (name.trim()) form.set('name', name.trim());
    if (raceDate) form.set('race_date', raceDate);

    if (inputMode === 'file' && file) {
      form.set('gpx', file);
    } else if (inputMode === 'draw' && drawn) {
      form.set('source', 'draw');
      form.set('points', JSON.stringify(drawn.points));
    } else if (inputMode === 'time' && durationMin !== null) {
      form.set('duration_s', String(durationMin * 60));
    }

    try {
      const res = await fetch('/api/races', { method: 'POST', body: form });
      const json = (await res.json()) as
        | { race: { id: string }; stats: CreatedStats }
        | { error: string; debug?: ApiDebug };

      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error : 'Création impossible.');
        if ('debug' in json && json.debug) setDebug(json.debug);
        return;
      }
      trackEvent('race_created', { race_mode: inputMode });
      router.push('/app/races/' + json.race.id + '?created=1');
    } catch {
      setError('Création interrompue. Vérifie ta connexion.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Surface>
      {/* --------------------------------------------------- choix du mode */}
      <div className="grid grid-cols-3 gap-2 rounded-lg border-[3px] border-black bg-off p-2">
        {(
          [
            { value: 'file', label: 'Fichier GPX', hint: 'J’ai le tracé' },
            { value: 'draw', label: 'Dessiner', hint: 'Sur la carte' },
            { value: 'time', label: 'Durée', hint: 'Au chrono' },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setInputMode(option.value);
              setError(null);
              setDebug(null);
            }}
            className={cx(
              'rounded-md border-2 border-black px-3 py-2.5 text-left transition-colors',
              inputMode === option.value
                ? 'bg-yellow shadow-[2px_2px_0_0_#000]'
                : 'bg-white text-black/60 hover:bg-neon hover:text-black',
            )}
          >
            <span className="block text-[13px] font-bold uppercase tracking-[0.02em] text-black">{option.label}</span>
            <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.06em] text-black/55">{option.hint}</span>
          </button>
        ))}
      </div>

      {/* --------------------------------------------------- corps par mode */}
      {inputMode === 'file' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files[0] ?? null);
          }}
          className={cx(
            'mt-5 rounded-lg border-[3px] border-dashed border-black p-8 text-center transition-colors',
            dragging ? 'bg-neon' : 'bg-off',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <p className="text-[14px] font-bold text-charcoal">{file.name}</p>
              <p className="mt-1 font-mono text-[12px] text-black/60">
                {(file.size / 1024).toFixed(0)} ko
              </p>
              <button
                type="button"
                onClick={() => pick(null)}
                className="mt-4 text-[13px] font-bold uppercase tracking-[0.02em] text-black underline decoration-orange decoration-2 underline-offset-2 hover:decoration-black"
              >
                Choisir un autre fichier
              </button>
            </>
          ) : (
            <>
              <p className="text-[14px] text-charcoal-muted">Glisse ton fichier .gpx ici</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => inputRef.current?.click()}
              >
                Parcourir
              </Button>
            </>
          )}
        </div>
      ) : inputMode === 'draw' ? (
        <div className="mt-5">
          <p className="mb-3 text-[13px] leading-relaxed text-charcoal-muted">
            Touche la carte pour poser le départ, puis chaque point de passage. Le chemin suit
            automatiquement les routes.
          </p>
          <RouteDrawMap
            onChange={(route) => {
              setDrawn(route);
              setError(null);
            }}
          />
        </div>
      ) : (
        <div className="mt-5">
          <Field
            label="Durée prévue de la course"
            htmlFor="race-duration"
            hint="Le temps que tu penses mettre. Tes proches placeront leurs messages sur cette durée."
          >
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => setDurationMin(preset.minutes)}
                  className={cx(
                    'rounded-md border-2 border-black px-4 py-2 text-[13px] font-bold uppercase tracking-[0.02em] transition-colors',
                    durationMin === preset.minutes
                      ? 'bg-orange text-black shadow-[2px_2px_0_0_#000]'
                      : 'bg-white text-black/70 hover:bg-neon hover:text-black',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-[12.5px] text-charcoal-faint">ou précise :</span>
            <TextInput
              id="race-duration"
              type="number"
              min={5}
              max={1440}
              inputMode="numeric"
              value={durationMin ?? ''}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDurationMin(Number.isFinite(v) && v > 0 ? Math.round(v) : null);
              }}
              placeholder="120"
              className="max-w-[120px]"
            />
            <span className="text-[13px] text-charcoal-muted">minutes</span>
          </div>

          {durationMin !== null && durationMin >= 5 ? (
            <p className="mt-3 text-[13px] font-bold text-black">
              Course de {formatClock(durationMin * 60)}.
            </p>
          ) : null}
        </div>
      )}

      {/* ----------------------------------------------------- champs communs */}
      <div className="mt-6 space-y-5">
        <Field label="Nom de la course" htmlFor="race-name">
          <TextInput
            id="race-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={inputMode === 'time' ? 'Mon marathon' : inputMode === 'draw' ? 'Ma boucle du dimanche' : 'Marathon de Paris'}
            maxLength={120}
          />
        </Field>

        <Field
          label="Date de la course"
          htmlFor="race-date"
          hint="Optionnel. Sert à afficher la date à tes proches et à archiver la course."
        >
          <TextInput
            id="race-date"
            type="date"
            value={raceDate}
            onChange={(e) => setRaceDate(e.target.value)}
          />
        </Field>
      </div>

      {error ? (
        <div className="mt-5 space-y-2">
          <p className="text-[13px] leading-relaxed text-clay">{error}</p>
          {debug ? (
            <details className="rounded-md border-2 border-black/20 bg-black/[0.03] px-3 py-2">
              <summary className="cursor-pointer text-[11.5px] text-charcoal-faint">
                Détail technique (visible en développement uniquement)
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-charcoal-muted">
                {debug.context}
                {'\n'}code : {debug.code}
                {debug.message ? '\n' + debug.message : ''}
                {debug.details ? '\ndetails : ' + debug.details : ''}
                {debug.hint ? '\nhint : ' + debug.hint : ''}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <Button
        className="mt-6"
        fullWidth
        size="lg"
        onClick={() => void submit()}
        disabled={!canSubmit || busy}
      >
        {busy ? (inputMode === 'file' ? 'Analyse du tracé…' : 'Création…') : 'Créer la course'}
      </Button>
    </Surface>
  );
}
