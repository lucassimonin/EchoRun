'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { cx, formatClock } from '@/lib/utils';

export interface TakenTime {
  trigger_at_s: number;
  author_name: string;
}

interface TimelineProps {
  /** Durée totale de la course, en secondes. */
  durationS: number;
  /** Instant sélectionné en secondes, ou null si rien n'est choisi. */
  selectedS: number | null;
  onSelect: (seconds: number) => void;
  /** Repères déjà pris par d'autres proches. */
  taken?: readonly TakenTime[];
}

/**
 * ============================================================================
 * Frise • choix d'un instant sur la durée de course (mode « temps »)
 * ============================================================================
 *
 * Équivalent de la carte Leaflet pour le mode GPX : le proche fait glisser un
 * curseur de 0 à la durée totale et lit « à 45 min ». On cale sur la minute.
 *
 * Volontairement bâti sur un `<input type="range">` natif plutôt qu'un curseur
 * maison : accessibilité clavier gratuite (flèches, Début/Fin), gestion tactile
 * correcte sur mobile, et focus visible. On l'habille pour coller à la charte
 * sans réécrire son comportement.
 */
export function Timeline({ durationS, selectedS, onSelect, taken = [] }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const stepS = 60; // pas d'une minute
  const minS = 0;
  const maxS = durationS;

  const pct = useCallback(
    (s: number) => (durationS > 0 ? (s / durationS) * 100 : 0),
    [durationS],
  );

  // Jalons réguliers : départ, quarts, arrivée. Repères de lecture, pas des cibles.
  const marks = useMemo(
    () => [0, 0.25, 0.5, 0.75, 1].map((q) => Math.round(durationS * q)),
    [durationS],
  );

  const commit = useCallback(
    (raw: number) => {
      const snapped = Math.round(raw / stepS) * stepS;
      onSelect(Math.min(maxS, Math.max(minS, snapped)));
    },
    [maxS, minS, onSelect],
  );

  return (
    <div className="select-none">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-charcoal-faint">
            Ton message se déclenche à
          </p>
          <p className="mt-1 font-mono text-[1.75rem] leading-none tracking-[-0.02em] text-charcoal">
            {selectedS === null ? '•' : formatClock(selectedS)}
          </p>
        </div>
        {selectedS !== null ? (
          <p className="text-[12px] text-charcoal-faint">
            {Math.round((selectedS / durationS) * 100)} % de la course
          </p>
        ) : null}
      </div>

      <div ref={trackRef} className="relative py-4">
        <div className="relative h-1.5 rounded-full bg-charcoal/[0.09]">
          {selectedS !== null ? (
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-matcha-400"
              style={{ width: pct(selectedS) + '%' }}
            />
          ) : null}

          {taken.map((t, i) => (
            <span
              key={i}
              className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-paper bg-matcha-300"
              style={{ left: pct(t.trigger_at_s) + '%' }}
              title={t.author_name + ' · ' + formatClock(t.trigger_at_s)}
            />
          ))}

          {selectedS !== null ? (
            <span
              className={cx(
                'absolute top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-paper bg-charcoal shadow-lift transition-[width,height]',
                dragging ? 'size-6' : 'size-5',
              )}
              style={{ left: pct(selectedS) + '%' }}
            >
              <span className="size-1.5 rounded-full bg-bone" />
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex justify-between text-[10.5px] text-charcoal-faint">
          {marks.map((atS, i) => (
            <span key={i} className="shrink-0 whitespace-nowrap">
              {formatClock(atS)}
            </span>
          ))}
        </div>

        <input
          type="range"
          min={minS}
          max={maxS}
          step={stepS}
          value={selectedS ?? Math.round(durationS / 2)}
          onChange={(e) => commit(Number(e.target.value))}
          onPointerDown={() => {
            setDragging(true);
            if (selectedS === null) commit(Math.round(durationS / 2));
          }}
          onPointerUp={() => setDragging(false)}
          aria-label="Instant du message dans la course"
          aria-valuetext={selectedS === null ? 'non défini' : formatClock(selectedS)}
          className="absolute inset-x-0 top-2 h-8 w-full cursor-pointer opacity-0"
        />
      </div>

      {selectedS === null ? (
        <p className="mt-1 text-center text-[12.5px] text-charcoal-faint">
          Fais glisser pour choisir un moment
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: 'Mi-course', atS: Math.round(durationS / 2) },
            { label: 'Dernier quart', atS: Math.round(durationS * 0.75) },
            { label: 'Fin de course', atS: Math.max(0, durationS - 300) },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => commit(preset.atS)}
              className="rounded-full border border-charcoal/10 bg-paper px-3 py-1.5 text-[12px] text-charcoal-muted transition-colors hover:border-charcoal/20 hover:text-charcoal"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
