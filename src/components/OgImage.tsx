import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

/**
 * Visuel Open Graph, partagé par /opengraph-image et /twitter-image.
 *
 * Rendu par `next/og` (Satori), qui convertit le texte en tracés : le résultat
 * ne dépend d'aucune police installée sur la machine qui rend l'image. C'est
 * la raison de ne pas générer ce PNG avec sharp comme les icônes.
 *
 * Contraintes de Satori à connaître : pas de `gap`, pas de pseudo-éléments,
 * flexbox uniquement, et `display: flex` explicite sur tout conteneur à
 * plusieurs enfants.
 */
export function OgImage() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#FAF8F5',
        padding: '72px 80px',
        // Halo matcha discret, comme le hero de la landing.
        backgroundImage:
          'radial-gradient(circle at 78% 12%, rgba(62,90,71,0.14) 0%, rgba(62,90,71,0) 55%)',
      }}
    >
      {/* Marque */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg width="44" height="44" viewBox="0 0 512 512">
          <rect width="512" height="512" rx="112" fill="#3E5A47" />
          <circle cx="140" cy="256" r="52" fill="#FAF8F5" />
          <path
            d="M 232.4 137.8 A 150 150 0 0 1 232.4 374.2"
            fill="none"
            stroke="#FAF8F5"
            strokeWidth="44"
            strokeLinecap="round"
            opacity="0.95"
          />
          <path
            d="M 287.8 66.9 A 240 240 0 0 1 287.8 445.1"
            fill="none"
            stroke="#FAF8F5"
            strokeWidth="44"
            strokeLinecap="round"
            opacity="0.62"
          />
        </svg>
        <span
          style={{
            marginLeft: 18,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#111812',
          }}
        >
          {SITE_NAME}
        </span>
      </div>

      {/* Accroche */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: 78,
            fontWeight: 600,
            lineHeight: 1.04,
            letterSpacing: '-0.035em',
            color: '#111812',
            maxWidth: 900,
          }}
        >
          Les voix de tes proches,
        </div>
        <div
          style={{
            fontSize: 78,
            fontWeight: 600,
            lineHeight: 1.04,
            letterSpacing: '-0.035em',
            color: '#3E5A47',
            maxWidth: 900,
          }}
        >
          au bon kilomètre.
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 27,
            lineHeight: 1.45,
            color: '#4B544D',
            maxWidth: 780,
          }}
        >
          Un message vocal déposé sur ton parcours, déclenché par le GPS pendant ta course.
        </div>
      </div>

      {/* Pied : les trois arguments, sans icônes pour rester lisible en vignette */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {['Sans application', 'Sans réseau', '2 messages offerts'].map((label, index) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            {index > 0 ? (
              <span style={{ color: '#9DB3A3', margin: '0 18px', fontSize: 22 }}>·</span>
            ) : null}
            <span style={{ fontSize: 23, color: '#4B544D' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Texte alternatif, réutilisé par les deux routes d'image. */
export const OG_ALT = SITE_NAME + ' — ' + SITE_TAGLINE;
