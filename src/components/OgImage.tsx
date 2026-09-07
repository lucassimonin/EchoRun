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
 * plusieurs enfants. `boxShadow`, `border` et `borderRadius` sont supportés :
 * on s'en sert pour l'esthétique brutaliste (bords noirs, ombres dures).
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
        backgroundColor: '#FFE600',
        padding: '64px 72px',
        border: '14px solid #000000',
      }}
    >
      {/* Marque : icône orange encadrée + nom */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            width: 68,
            height: 68,
            border: '4px solid #000000',
            borderRadius: 15,
            backgroundColor: '#FF5500',
            boxShadow: '6px 6px 0 0 #000000',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="42" height="42" viewBox="0 0 32 32">
            <circle cx="11" cy="16" r="2.6" fill="#ffffff" />
            <path
              d="M15.5 12a5.5 5.5 0 0 1 0 8"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M19.5 9.5a9.5 9.5 0 0 1 0 13"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.85"
            />
          </svg>
        </div>
        <span
          style={{
            marginLeft: 22,
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: '#000000',
          }}
        >
          EchoRun
        </span>
      </div>

      {/* Accroche : deux lignes noires + une ligne surlignée orange */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: 74,
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: '-0.02em',
            color: '#000000',
          }}
        >
          LES VOIX DE
        </div>
        <div
          style={{
            fontSize: 74,
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: '-0.02em',
            color: '#000000',
            marginTop: 2,
          }}
        >
          TES PROCHES,
        </div>
        <div style={{ display: 'flex', marginTop: 14 }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: '#FF5500',
              border: '4px solid #000000',
              boxShadow: '6px 6px 0 0 #000000',
              padding: '4px 20px',
            }}
          >
            <span
              style={{
                fontSize: 74,
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: '-0.02em',
                color: '#ffffff',
              }}
            >
              AU BON KM.
            </span>
          </div>
        </div>
      </div>

      {/* Sous-titre */}
      <div style={{ display: 'flex' }}>
        <div
          style={{
            fontSize: 26,
            lineHeight: 1.45,
            color: '#111111',
            maxWidth: 840,
          }}
        >
          Un message vocal déposé sur ton parcours, déclenché par le GPS pendant ta course.
        </div>
      </div>

      {/* Pied : arguments en badges bordés */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {['SANS APPLICATION', 'SANS RÉSEAU', '15 MESSAGES OFFERTS'].map((label) => (
          <div
            key={label}
            style={{
              display: 'flex',
              border: '3px solid #000000',
              backgroundColor: '#F4F4F0',
              padding: '7px 16px',
              marginRight: 14,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: '#000000',
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Texte alternatif, réutilisé par les deux routes d'image. */
export const OG_ALT = SITE_NAME + ' • ' + SITE_TAGLINE;
