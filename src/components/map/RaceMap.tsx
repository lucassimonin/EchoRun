'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import type { RaceBounds, TrackPoint } from '@/types';
import { getTileConfig } from '@/lib/map-tiles';
import { cx } from '@/lib/utils';

export interface TakenPoint {
  lat: number;
  lng: number;
  author_name: string;
}

export interface RunnerPosition {
  lat: number;
  lng: number;
  accuracyM: number;
}

export interface RaceMapProps {
  track: readonly TrackPoint[];
  bounds?: RaceBounds | null;
  takenPoints?: readonly TakenPoint[];
  selected?: { lat: number; lng: number } | null;
  /** Rayon de declenchement du point selectionne, en metres. */
  selectedRadiusM?: number;
  onPick?: (lat: number, lng: number) => void;
  runner?: RunnerPosition | null;
  /** Recadre sur le coureur au lieu du trace complet (mode course). */
  followRunner?: boolean;
  className?: string;
}

/**
 * Carte Leaflet pilotee a la main, sans react-leaflet.
 *
 * Pourquoi : react-leaflet impose son cycle de vie React sur une lib qui gere
 * deja le sien, et sa compatibilite suit les majeures de React. Ici on a
 * besoin de trois choses (un trace, des pastilles, un clic) • 150 lignes
 * d'imperatif sont plus lisibles et ne bougeront pas.
 *
 * A charger via `next/dynamic` avec `ssr: false` (Leaflet touche `window`).
 */
export function RaceMap({
  track,
  bounds,
  takenPoints = [],
  selected,
  selectedRadiusM = 70,
  onPick,
  runner,
  followRunner = false,
  className,
}: RaceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    taken: L.LayerGroup | null;
    selected: L.LayerGroup | null;
    runner: L.LayerGroup | null;
  }>({ taken: null, selected: null, runner: null });
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const latlngs = useMemo(
    () => track.map((p) => [p[0], p[1]] as L.LatLngTuple),
    [track],
  );

  // ---------------------------------------------------------- init & trace --
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current || latlngs.length === 0) return;

    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
      // Sur mobile, le scroll de la page doit rester prioritaire.
      scrollWheelZoom: false,
      // Renderer SVG (défaut). Le renderer canvas plantait en `clearRect`
      // quand le conteneur avait une taille nulle à l'init (cf. invalidateSize).
    });
    mapRef.current = map;

    // Fond de carte configurable (cf. src/lib/map-tiles.ts). Défaut sans clé.
    const tiles = getTileConfig();
    L.tileLayer(tiles.url, {
      subdomains: tiles.subdomains ?? 'abc',
      maxZoom: tiles.maxZoom,
      detectRetina: true,
      attribution: tiles.attribution,
    }).addTo(map);

    // Double trace : un halo large tres clair + la ligne nette par-dessus.
    L.polyline(latlngs, {
      color: '#3E5A47',
      weight: 11,
      opacity: 0.12,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    L.polyline(latlngs, {
      color: '#3E5A47',
      weight: 3.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    const start = latlngs[0];
    const finish = latlngs[latlngs.length - 1];
    if (start) L.marker(start, { icon: pin('start'), interactive: false }).addTo(map);
    if (finish) L.marker(finish, { icon: pin('finish'), interactive: false }).addTo(map);

    layersRef.current.taken = L.layerGroup().addTo(map);
    layersRef.current.selected = L.layerGroup().addTo(map);
    layersRef.current.runner = L.layerGroup().addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      onPickRef.current?.(event.latlng.lat, event.latlng.lng);
    });

    // Le zoom molette ne s'active qu'apres un clic : evite de "piéger" le scroll.
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());

    const fitBounds = bounds
      ? L.latLngBounds([bounds.sw[0], bounds.sw[1]], [bounds.ne[0], bounds.ne[1]])
      : L.latLngBounds(latlngs);
    map.fitBounds(fitBounds, { padding: [36, 36] });

    // La carte est souvent montée dans un conteneur flex dont la hauteur
    // n'est appliquée qu'APRÈS l'init de Leaflet : sans ça, la carte croit sa
    // taille nulle et n'affiche aucune tuile (carte blanche). On recalcule dès
    // que le conteneur a ses dimensions, puis à chaque redimensionnement.
    const refit = () => {
      map.invalidateSize({ animate: false });
      map.fitBounds(fitBounds, { padding: [36, 36] });
    };
    const raf = requestAnimationFrame(refit);
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = { taken: null, selected: null, runner: null };
    };
  }, [latlngs, bounds]);

  // -------------------------------------------------------- points existants --
  useEffect(() => {
    const layer = layersRef.current.taken;
    if (!layer) return;
    layer.clearLayers();

    for (const point of takenPoints) {
      L.marker([point.lat, point.lng], { icon: pin('existing'), riseOnHover: true })
        .bindTooltip(point.author_name, {
          direction: 'top',
          offset: [0, -10],
          className: 'echo-tooltip',
        })
        .addTo(layer);
    }
  }, [takenPoints]);

  // ------------------------------------------------------- point selectionne --
  useEffect(() => {
    const layer = layersRef.current.selected;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!selected) return;

    L.circle([selected.lat, selected.lng], {
      radius: selectedRadiusM,
      color: '#111812',
      weight: 1,
      opacity: 0.25,
      fillColor: '#111812',
      fillOpacity: 0.06,
    }).addTo(layer);

    L.marker([selected.lat, selected.lng], { icon: pin('selected'), zIndexOffset: 500 }).addTo(
      layer,
    );

    if (!map.getBounds().contains([selected.lat, selected.lng])) {
      map.panTo([selected.lat, selected.lng], { animate: true });
    }
  }, [selected, selectedRadiusM]);

  // ------------------------------------------------------------- le coureur --
  useEffect(() => {
    const layer = layersRef.current.runner;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!runner) return;

    L.circle([runner.lat, runner.lng], {
      radius: Math.max(runner.accuracyM, 12),
      color: '#3E5A47',
      weight: 0,
      fillColor: '#3E5A47',
      fillOpacity: 0.12,
    }).addTo(layer);

    L.circleMarker([runner.lat, runner.lng], {
      radius: 7,
      color: '#FAF8F5',
      weight: 3,
      fillColor: '#111812',
      fillOpacity: 1,
    }).addTo(layer);

    if (followRunner) map.setView([runner.lat, runner.lng], Math.max(map.getZoom(), 15));
  }, [runner, followRunner]);

  return (
    <div
      ref={containerRef}
      className={cx('echo-map h-full w-full', className)}
      role="application"
      aria-label="Carte du parcours"
    />
  );
}

type PinKind = 'existing' | 'selected' | 'start' | 'finish';

const PIN_SIZES: Record<PinKind, number> = {
  existing: 14,
  selected: 22,
  start: 16,
  finish: 16,
};

function pin(kind: PinKind): L.DivIcon {
  const size = PIN_SIZES[kind];
  return L.divIcon({
    className: '',
    html: '<span class="echo-pin echo-pin--' + kind + '"></span>',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
