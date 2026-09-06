import { cx } from '@/lib/utils';

export interface MiniBarsDatum {
  label: string;
  value: number;
  display: string;
}

interface MiniBarsProps {
  title: string;
  data: readonly MiniBarsDatum[];
  className?: string;
}

const WIDTH = 320;
const HEIGHT = 68;
const GAP = 2; // espace de surface entre barres adjacentes
const RADIUS = 4; // extremite de donnee arrondie
const BASELINE = HEIGHT - 12;

/**
 * Sparkline en barres, série unique.
 *
 * Choix assumés :
 *  - une seule mesure par graphique. Mélanger « vocaux » et « chiffre
 *    d'affaires » sur deux axes rendrait la comparaison mensongère : on fait
 *    donc deux graphiques côte à côte plutôt qu'un double axe.
 *  - série unique = pas de légende, le titre nomme la mesure.
 *  - une seule teinte (vert matcha) en dégradé d'opacité par magnitude.
 *  - étiquette directe sur le maximum uniquement, jamais sur chaque barre.
 *  - table lisible par lecteur d'écran, le SVG est purement décoratif.
 */
export function MiniBars({ title, data, className }: MiniBarsProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = data.length > 0 ? WIDTH / data.length : WIDTH;
  const barWidth = Math.max(3, slot - GAP);
  const maxIndex = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? 0) ? i : best), 0);

  return (
    <figure className={cx('rounded-card border border-charcoal/[0.07] bg-paper p-6 shadow-soft', className)}>
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] font-medium text-charcoal">{title}</span>
        <span className="text-[11.5px] text-charcoal-faint">14 derniers jours</span>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-5 h-[68px] w-full overflow-visible"
        role="presentation"
        aria-hidden="true"
      >
        {/* Ligne de base récessive : elle situe, elle ne décore pas. */}
        <line
          x1="0"
          y1={BASELINE + 0.5}
          x2={WIDTH}
          y2={BASELINE + 0.5}
          stroke="#111812"
          strokeOpacity="0.1"
          strokeWidth="1"
        />

        {data.map((datum, index) => {
          const height = datum.value === 0 ? 2 : Math.max(3, (datum.value / max) * (BASELINE - 14));
          const x = index * slot;
          const y = BASELINE - height;
          const r = Math.min(RADIUS, height / 2, barWidth / 2);

          return (
            <path
              key={datum.label}
              d={
                `M${x} ${BASELINE} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} ` +
                `L${x + barWidth - r} ${y} Q${x + barWidth} ${y} ${x + barWidth} ${y + r} ` +
                `L${x + barWidth} ${BASELINE} Z`
              }
              fill="#3E5A47"
              fillOpacity={datum.value === 0 ? 0.14 : index === maxIndex ? 1 : 0.55}
            >
              <title>
                {datum.label} · {datum.display}
              </title>
            </path>
          );
        })}

        {data[maxIndex] ? (
          <text
            x={Math.min(maxIndex * slot + barWidth / 2, WIDTH - 12)}
            y={BASELINE - Math.max(3, (data[maxIndex].value / max) * (BASELINE - 14)) - 6}
            textAnchor="middle"
            className="fill-charcoal text-[9px] font-medium"
            style={{ fontSize: 9 }}
          >
            {data[maxIndex].display}
          </text>
        ) : null}
      </svg>

      {/* Vue tabulaire : identité et valeurs jamais portées par la seule couleur. */}
      <table className="sr-only">
        <caption>{title}, 14 derniers jours</caption>
        <tbody>
          {data.map((datum) => (
            <tr key={datum.label}>
              <th scope="row">{datum.label}</th>
              <td>{datum.display}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex justify-between text-[10.5px] text-charcoal-faint">
        <span>{data[0]?.label ?? ''}</span>
        <span>{data[data.length - 1]?.label ?? ''}</span>
      </div>
    </figure>
  );
}
