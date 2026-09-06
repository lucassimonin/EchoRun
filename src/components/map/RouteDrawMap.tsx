'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getTileConfig } from '@/lib/map-tiles';
import { haversine } from '@/lib/geo/geometry';
import { cx, formatDistance } from '@/lib/utils';

export interface DrawnRoute {
  /** Tracé complet calé sur les routes : [[lat, lng], ...]. */
  points: [number, number][];
  distanceM: number;
}

interface RouteDrawMapProps {
  onChange: (route: DrawnRoute | null) => void;
  /** Centre initial de la carte (défaut : France métropolitaine). */
  center?: [number, number];
  className?: string;
}

interface Waypoint {
  latlng: [number, number];
}

interface Segment {
  /** Chemin routé depuis le waypoint précédent (inclut ses deux extrémités). */
  points: [number, number][];
  distanceM: number;
  /** Vrai si le routage a échoué et qu'on a tracé une ligne droite de secours. */
  fallback: boolean;
}

/**
 * ============================================================================
 * RouteDrawMap — dessiner un parcours calé sur les routes
 * ============================================================================
 *
 * Le coureur clique des points d'étape ; chaque nouveau clic route le segment
 * depuis le point précédent le long des rues réelles (proxy /api/route). Le
 * tracé obtenu alimente la même structure que l'import GPX.
 *
 * Routage INCRÉMENTAL : on ne recalcule que le dernier segment à chaque clic,
 * et « Annuler » retire le dernier point + son segment. C'est réactif et
 * suffisant pour construire un parcours ; l'édition d'un point au milieu est
 * volontairement hors périmètre de cette première version.
 *
 * Si un segment n'est pas routable (point hors réseau), on trace une ligne
 * droite de secours et on le signale, plutôt que de bloquer.
 */
export function RouteDrawMap({ onChange, center = [46.6, 2.4], className }: RouteDrawMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [routing, setRouting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // File de clics : on route un segment à la fois, dans l'ordre, pour éviter les
  // conditions de course si l'utilisateur clique vite.
  const busyRef = useRef(false);
  const pendingRef = useRef<[number, number][]>([]);
  // Miroir synchrone des waypoints : lire « le point précédent » depuis le state
  // n'est pas fiable dans une boucle async (le state est figé sur la valeur de
  // rendu). Ce ref donne toujours la dernière position réellement posée.
  const waypointsRef = useRef<[number, number][]>([]);

  // ------------------------------------------------------------ init carte ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    }).setView(center, 6);
    mapRef.current = map;

    const tiles = getTileConfig();
    L.tileLayer(tiles.url, {
      subdomains: tiles.subdomains ?? 'abc',
      maxZoom: tiles.maxZoom,
      detectRetina: true,
      attribution: tiles.attribution,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      enqueue([event.latlng.lat, event.latlng.lng]);
    });

    // Géolocalisation d'amorçage : on centre sur l'utilisateur si possible.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
        () => undefined,
        { enableHighAccuracy: false, timeout: 5000 },
      );
    }

    const raf = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------- traitement de la file ---
  // IMPORTANT : le routage est fait ICI, en code séquentiel pur — jamais à
  // l'intérieur d'un updater setState. Un effet de bord dans un updater est
  // ré-exécuté par React en mode dev (Strict Mode), ce qui ajoutait le segment
  // deux fois et dessinait un aller-retour fantôme.
  const drainQueue = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    while (pendingRef.current.length > 0) {
      const next = pendingRef.current.shift();
      if (!next) break;

      const previous = waypointsRef.current[waypointsRef.current.length - 1] ?? null;

      // Le point est posé tout de suite (ref + state), quel que soit le routage.
      waypointsRef.current = [...waypointsRef.current, next];
      setWaypoints((prev) => [...prev, { latlng: next }]);

      // Premier point : rien à router.
      if (previous === null) continue;

      setRouting(true);
      setNotice(null);
      try {
        const res = await fetch('/api/route', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ from: previous, to: next }),
        });
        if (res.ok) {
          const seg = (await res.json()) as { points: [number, number][]; distanceM: number };
          setSegments((s) => [...s, { points: seg.points, distanceM: seg.distanceM, fallback: false }]);
        } else {
          setSegments((s) => [
            ...s,
            {
              points: [previous, next],
              distanceM: Math.round(haversine(previous[0], previous[1], next[0], next[1])),
              fallback: true,
            },
          ]);
          setNotice('Un segment n’a pas pu être calé sur les routes : ligne droite utilisée.');
        }
      } catch {
        setSegments((s) => [
          ...s,
          {
            points: [previous, next],
            distanceM: Math.round(haversine(previous[0], previous[1], next[0], next[1])),
            fallback: true,
          },
        ]);
        setNotice('Routage indisponible : ligne droite utilisée pour ce segment.');
      } finally {
        setRouting(false);
      }
    }

    busyRef.current = false;
  }, []);

  const enqueue = useCallback(
    (latlng: [number, number]) => {
      pendingRef.current.push(latlng);
      void drainQueue();
    },
    [drainQueue],
  );

  const undo = useCallback(() => {
    waypointsRef.current = waypointsRef.current.slice(0, -1);
    setWaypoints((prev) => prev.slice(0, -1));
    setSegments((prev) => prev.slice(0, -1));
    setNotice(null);
  }, []);

  const clear = useCallback(() => {
    waypointsRef.current = [];
    setWaypoints([]);
    setSegments([]);
    setNotice(null);
  }, []);

  // ------------------------------------------ rendu des couches + remontée ---
  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    // Tracé complet = concaténation des segments (on évite de dupliquer les
    // jonctions entre segments consécutifs).
    const full: [number, number][] = [];
    for (const seg of segments) {
      for (let i = 0; i < seg.points.length; i++) {
        const p = seg.points[i];
        if (!p) continue;
        if (i === 0 && full.length > 0) continue;
        full.push(p);
      }
    }

    if (full.length >= 2) {
      L.polyline(full, {
        color: '#3E5A47',
        weight: 11,
        opacity: 0.12,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer);
      L.polyline(full, {
        color: '#3E5A47',
        weight: 3.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer);
    }

    // Marqueurs des points d'étape : départ, étapes, arrivée.
    waypoints.forEach((wp, index) => {
      const kind = index === 0 ? 'start' : index === waypoints.length - 1 ? 'finish' : 'existing';
      L.marker(wp.latlng, { icon: waypointIcon(kind), interactive: false }).addTo(layer);
    });

    // Remontée au parent : le tracé n'est valable qu'à partir de 2 points.
    const distanceM = segments.reduce((sum, s) => sum + s.distanceM, 0);
    if (full.length >= 2) {
      onChangeRef.current({ points: full, distanceM });
    } else {
      onChangeRef.current(null);
    }
  }, [segments, waypoints]);

  const distanceM = segments.reduce((sum, s) => sum + s.distanceM, 0);

  return (
    <div className={cx('space-y-3', className)}>
      <div className="relative">
        <div
          ref={containerRef}
          className="echo-map h-[360px] w-full overflow-hidden rounded-card border border-charcoal/[0.07] sm:h-[440px]"
          role="application"
          aria-label="Carte de dessin du parcours"
        />
        {/* Compteur de distance, en surimpression */}
        <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-full bg-paper/95 px-3.5 py-2 text-[13px] font-medium text-charcoal shadow-soft backdrop-blur">
          {waypoints.length === 0
            ? 'Touche la carte pour poser le départ'
            : formatDistance(distanceM) + (routing ? ' · calcul…' : '')}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-charcoal-faint">
          {waypoints.length < 2
            ? 'Ajoute au moins deux points pour tracer un parcours.'
            : waypoints.length + ' points · le chemin suit les routes'}
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={waypoints.length === 0}
            className="rounded-full border border-charcoal/10 bg-paper px-3.5 py-1.5 text-[12.5px] text-charcoal-muted transition-colors hover:border-charcoal/20 hover:text-charcoal disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={waypoints.length === 0}
            className="rounded-full border border-charcoal/10 bg-paper px-3.5 py-1.5 text-[12.5px] text-charcoal-muted transition-colors hover:border-charcoal/20 hover:text-charcoal disabled:opacity-40"
          >
            Effacer
          </button>
        </div>
      </div>

      {notice ? <p className="text-[12.5px] text-clay">{notice}</p> : null}
    </div>
  );
}

type WaypointKind = 'start' | 'finish' | 'existing';

function waypointIcon(kind: WaypointKind): L.DivIcon {
  const size = kind === 'existing' ? 12 : 16;
  return L.divIcon({
    className: '',
    html: '<span class="echo-pin echo-pin--' + kind + '"></span>',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
