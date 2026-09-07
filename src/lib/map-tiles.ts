/**
 * ============================================================================
 * Fond de carte • configuration des tuiles
 * ============================================================================
 *
 * CARTO (l'ancien fond « Positron » clair) exige désormais une clé API : ses
 * tuiles renvoient « API KEY REQUIRED » sans elle. On part donc sur un fond
 * SANS clé, clair et sobre, qui colle à la charte : Esri « World Light Gray
 * Base ». Gratuit, pas d'inscription, largement utilisé.
 *
 * Tout est surchargeable par variables d'environnement, pour brancher un
 * fournisseur payant plus élégant en production (CARTO, MapTiler, Stadia…) sans
 * toucher au code • il suffit de coller l'URL de tuiles fournie avec la clé.
 *
 *   NEXT_PUBLIC_MAP_TILE_URL      URL des tuiles ({z}/{x}/{y} ou {z}/{y}/{x})
 *   NEXT_PUBLIC_MAP_ATTRIBUTION   mention d'attribution affichée en bas
 *   NEXT_PUBLIC_MAP_SUBDOMAINS    sous-domaines si l'URL contient {s}
 *   NEXT_PUBLIC_MAP_MAX_ZOOM      zoom maximum
 */

interface TileConfig {
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom: number;
}

/** Défaut sans clé : Esri World Light Gray. Ordre d'URL {z}/{y}/{x}. */
const DEFAULT_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

const DEFAULT_ATTRIBUTION = 'Esri, HERE, Garmin, © OpenStreetMap';

export function getTileConfig(): TileConfig {
  const url = process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() || DEFAULT_TILE_URL;
  const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION?.trim() || DEFAULT_ATTRIBUTION;
  const subdomains = process.env.NEXT_PUBLIC_MAP_SUBDOMAINS?.trim() || undefined;
  const maxZoom = Number(process.env.NEXT_PUBLIC_MAP_MAX_ZOOM) || 19;
  return { url, attribution, subdomains, maxZoom };
}
