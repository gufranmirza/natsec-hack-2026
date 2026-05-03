'use client';

import { useEffect, useRef, useState } from 'react';

import {
  type AnyObject,
  type Entity,
  type LatLon,
  MAP_BOUNDS,
  type Unit,
} from '@/types/ontology';

const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl/dist/maplibre-gl.css';
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

type MapLibreGlobal = {
  Map: new (options: Record<string, unknown>) => MapLibreMap;
  Marker: new (options?: Record<string, unknown>) => MapLibreMarker;
  NavigationControl: new (options?: Record<string, unknown>) => unknown;
};

type MapLibreMap = {
  on: (event: string, handler: () => void) => void;
  addControl: (control: unknown, position?: string) => void;
  addSource: (id: string, source: unknown) => void;
  addLayer: (layer: unknown) => void;
  remove: () => void;
};

type MapLibreMarker = {
  setLngLat: (lngLat: [number, number]) => MapLibreMarker;
  addTo: (map: MapLibreMap) => MapLibreMarker;
};

declare global {
  interface Window {
    maplibregl?: MapLibreGlobal;
    __missionMapLibre?: Promise<MapLibreGlobal>;
  }
}

interface ColMapProps {
  entities: Entity[];
  units: Unit[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}

export function ColMap({ entities, units, selectedId, onSelect }: ColMapProps) {
  const mapNode = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>(
    'loading'
  );

  useEffect(() => {
    let disposed = false;
    let map: MapLibreMap | null = null;

    setLoadState('loading');

    void loadMapLibre()
      .then((maplibregl) => {
        if (disposed || !mapNode.current) return;

        map = new maplibregl.Map({
          container: mapNode.current,
          style: OPENFREEMAP_STYLE,
          center: [23.5, 38.71],
          zoom: 8.8,
          pitch: 0,
          bearing: -8,
          attributionControl: true,
          interactive: true,
        });

        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: false,
            visualizePitch: false,
          }),
          'bottom-right'
        );

        map.on('load', () => {
          if (!map || disposed) return;
          addOperationalLayers(map, entities, units);
          addMarkers(maplibregl, map, entities, units, selectedId, onSelect);
          setLoadState('ready');
        });
      })
      .catch(() => {
        if (!disposed) setLoadState('failed');
      });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [entities, onSelect, selectedId, units]);

  return (
    <section className="relative h-full overflow-hidden bg-[hsl(220_12%_88%)]">
      <div ref={mapNode} className="absolute inset-0" />
      <RasterTileMosaic />
      <MissionOverlayVectors />
      <MissionOverlayMarkers
        entities={entities}
        units={units}
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0,transparent_23px,hsl(220_20%_10%/0.055)_24px),linear-gradient(90deg,transparent_0,transparent_23px,hsl(220_20%_10%/0.045)_24px)] bg-[length:24px_24px]" />

      <div className="border-border bg-card/95 absolute left-3 top-3 z-10 w-[244px] border px-3 py-2 backdrop-blur">
        <div className="label-cap-sm text-muted-foreground">Open map layer</div>
        <div className="text-foreground mt-0.5 font-mono text-[11px] font-semibold">
          OpenStreetMap / MapLibre
        </div>
        <div className="border-border mt-2 grid grid-cols-3 border-t pt-2">
          <MapMetric label="Zoom" value="8.8" />
          <MapMetric label="Grid" value="UTM 35S" />
          <MapMetric label="Mode" value="ISR" />
        </div>
      </div>

      <div className="border-border bg-card/95 absolute right-3 top-3 z-10 w-[228px] border px-3 py-2 backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="label-cap-sm text-muted-foreground">Layers</span>
          <span
            className={[
              'font-mono text-[10px]',
              loadState === 'ready'
                ? 'text-success'
                : loadState === 'failed'
                  ? 'text-threat'
                  : 'text-warning',
            ].join(' ')}
          >
            {loadState}
          </span>
        </div>
        <div className="grid gap-1 font-mono text-[10px]">
          <LayerRow label="OSM raster basemap" tone="muted" />
          <LayerRow label="Friendly telemetry" tone="friendly" />
          <LayerRow label="Contact tracks" tone="threat" />
          <LayerRow label="RF search area" tone="warning" />
        </div>
      </div>

      <div className="border-border bg-card/95 absolute bottom-3 left-3 z-10 border px-3 py-2 backdrop-blur">
        <div className="label-cap-sm text-muted-foreground">Attribution</div>
        <div className="text-muted-foreground mt-0.5 max-w-[330px] font-mono text-[9px]">
          OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap
        </div>
      </div>
    </section>
  );
}

function RasterTileMosaic() {
  const tiles = [
    [288, 195],
    [289, 195],
    [290, 195],
    [288, 196],
    [289, 196],
    [290, 196],
    [288, 197],
    [289, 197],
    [290, 197],
  ];

  return (
    <div className="absolute inset-0 z-[1] grid grid-cols-3 grid-rows-3 opacity-90 grayscale">
      {tiles.map(([x, y]) => (
        <div
          key={`${x}-${y}`}
          className="size-full bg-cover bg-center brightness-[0.98] contrast-[0.92]"
          style={{
            backgroundImage: `url(https://tile.openstreetmap.org/9/${x}/${y}.png)`,
          }}
        />
      ))}
    </div>
  );
}

function MissionOverlayVectors() {
  const route = [
    positionToPercent([38.55, 23.2]),
    positionToPercent([38.6, 23.33]),
    positionToPercent([38.68, 23.45]),
    positionToPercent([38.78, 23.55]),
    positionToPercent([38.85, 23.62]),
  ];
  const points = route.map((p) => `${p.x},${p.y}`).join(' ');
  const rf = positionToPercent([38.85, 23.62]);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-[2] size-full"
    >
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--foreground) / 0.72)"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="0.55"
        strokeDasharray="1.2 1.2"
      />
      <ellipse
        cx={rf.x}
        cy={rf.y}
        rx="11"
        ry="8"
        fill="hsl(var(--warning) / 0.16)"
        stroke="hsl(var(--warning) / 0.86)"
        strokeWidth="0.35"
        strokeDasharray="1 1"
      />
    </svg>
  );
}

function MissionOverlayMarkers({
  entities,
  units,
  selectedId,
  onSelect,
}: {
  entities: Entity[];
  units: Unit[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}) {
  return (
    <div className="absolute inset-0 z-[4]">
      {units.map((unit) => {
        const point = positionToPercent(unit.position);
        return (
          <OverlayMarker
            key={unit._id}
            x={point.x}
            y={point.y}
            label={unit.callsign}
            meta={`${unit.status.toUpperCase()} · BAT ${unit.battery_pct ?? '--'}%`}
            tone="friendly"
            selected={unit._id === selectedId}
            onClick={() => onSelect(unit)}
          />
        );
      })}
      {entities.map((entity) => {
        const point = positionToPercent(entity.position);
        return (
          <OverlayMarker
            key={entity._id}
            x={point.x}
            y={point.y}
            label={entity.name ?? entity._id}
            meta={`${entity._subtype.toUpperCase()} · ${Math.round(
              entity.confidence * 100
            )}%`}
            tone={entity.affiliation === 'hostile' ? 'threat' : 'warning'}
            selected={entity._id === selectedId}
            onClick={() => onSelect(entity)}
          />
        );
      })}
    </div>
  );
}

function OverlayMarker({
  x,
  y,
  label,
  meta,
  tone,
  selected,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  meta: string;
  tone: 'friendly' | 'threat' | 'warning';
  selected: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === 'friendly'
      ? 'border-friendly text-friendly'
      : tone === 'threat'
        ? 'border-threat text-threat'
        : 'border-warning text-warning';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'absolute flex -translate-y-1/2 translate-x-2 items-center gap-1.5 border bg-[hsl(220_18%_8%/0.92)] px-1.5 py-1 text-left backdrop-blur',
        toneClass,
        selected ? 'ring-primary ring-1' : '',
      ].join(' ')}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="block size-1.5 shrink-0 bg-current" />
      <span className="min-w-0">
        <span className="block max-w-[86px] truncate font-mono text-[10px] font-bold leading-none">
          {label}
        </span>
        <span className="text-muted-foreground mt-0.5 block max-w-[86px] truncate font-mono text-[9px] leading-none">
          {meta}
        </span>
      </span>
    </button>
  );
}

function addOperationalLayers(
  map: MapLibreMap,
  entities: Entity[],
  units: Unit[]
) {
  map.addSource('mission-route', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [23.2, 38.55],
              [23.33, 38.6],
              [23.45, 38.68],
              [23.55, 38.78],
              [23.62, 38.85],
            ],
          },
        },
      ],
    },
  });

  map.addLayer({
    id: 'mission-route-casing',
    type: 'line',
    source: 'mission-route',
    paint: {
      'line-color': '#0b111a',
      'line-width': 8,
      'line-opacity': 0.82,
    },
  });

  map.addLayer({
    id: 'mission-route',
    type: 'line',
    source: 'mission-route',
    paint: {
      'line-color': '#d6a645',
      'line-width': 3,
      'line-dasharray': [2, 2],
    },
  });

  map.addSource('rf-search-area', {
    type: 'geojson',
    data: circlePolygon([23.62, 38.85], 0.055),
  });

  map.addLayer({
    id: 'rf-search-fill',
    type: 'fill',
    source: 'rf-search-area',
    paint: {
      'fill-color': '#d37b2d',
      'fill-opacity': 0.14,
    },
  });

  map.addLayer({
    id: 'rf-search-outline',
    type: 'line',
    source: 'rf-search-area',
    paint: {
      'line-color': '#d37b2d',
      'line-width': 1.5,
      'line-dasharray': [2, 2],
    },
  });

  const contactTracks = entities
    .filter((entity) => entity.heading_deg)
    .map((entity) => {
      const [lat, lon] = entity.position;
      return {
        type: 'Feature',
        properties: { affiliation: entity.affiliation },
        geometry: {
          type: 'LineString',
          coordinates: [
            [lon - 0.05, lat + 0.05],
            [lon - 0.025, lat + 0.025],
            [lon, lat],
          ],
        },
      };
    });

  const unitTracks = units.map((unit) => {
    const [lat, lon] = unit.position;
    return {
      type: 'Feature',
      properties: { affiliation: 'friendly' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [lon - 0.045, lat - 0.025],
          [lon - 0.02, lat - 0.012],
          [lon, lat],
        ],
      },
    };
  });

  map.addSource('mission-tracks', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [...contactTracks, ...unitTracks],
    },
  });

  map.addLayer({
    id: 'mission-tracks',
    type: 'line',
    source: 'mission-tracks',
    paint: {
      'line-color': [
        'match',
        ['get', 'affiliation'],
        'friendly',
        '#6eb3da',
        '#e26d5a',
      ],
      'line-width': 2,
      'line-opacity': 0.76,
      'line-dasharray': [1.5, 1.5],
    },
  });
}

function addMarkers(
  maplibregl: MapLibreGlobal,
  map: MapLibreMap,
  entities: Entity[],
  units: Unit[],
  selectedId: string | undefined,
  onSelect: (o: AnyObject) => void
) {
  units.forEach((unit) => {
    const element = createMarkerElement({
      label: unit.callsign,
      meta: `${unit.status.toUpperCase()} · BAT ${unit.battery_pct ?? '--'}%`,
      tone: 'friendly',
      selected: unit._id === selectedId,
    });
    element.addEventListener('click', () => onSelect(unit));
    new maplibregl.Marker({ element })
      .setLngLat(toLngLat(unit.position))
      .addTo(map);
  });

  entities.forEach((entity) => {
    const element = createMarkerElement({
      label: entity.name ?? entity._id,
      meta: `${entity._subtype.toUpperCase()} · ${Math.round(
        entity.confidence * 100
      )}%`,
      tone: entity.affiliation === 'hostile' ? 'threat' : 'warning',
      selected: entity._id === selectedId,
    });
    element.addEventListener('click', () => onSelect(entity));
    new maplibregl.Marker({ element })
      .setLngLat(toLngLat(entity.position))
      .addTo(map);
  });
}

function createMarkerElement({
  label,
  meta,
  tone,
  selected,
}: {
  label: string;
  meta: string;
  tone: 'friendly' | 'threat' | 'warning';
  selected: boolean;
}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = [
    'group flex translate-x-3 translate-y-[-12px] items-center gap-2 border bg-[hsl(220_18%_8%/0.92)] px-2 py-1 text-left shadow-none backdrop-blur',
    selected ? 'ring-1 ring-[hsl(var(--primary))]' : '',
    tone === 'friendly'
      ? 'border-[hsl(var(--friendly))] text-[hsl(var(--friendly))]'
      : tone === 'threat'
        ? 'border-[hsl(var(--threat))] text-[hsl(var(--threat))]'
        : 'border-[hsl(var(--warning))] text-[hsl(var(--warning))]',
  ].join(' ');
  button.innerHTML = `
    <span class="block size-2 shrink-0 bg-current"></span>
    <span class="min-w-0">
      <span class="block truncate font-mono text-[10px] font-bold leading-none">${label}</span>
      <span class="mt-0.5 block truncate font-mono text-[9px] leading-none text-[hsl(var(--muted-foreground))]">${meta}</span>
    </span>
  `;
  return button;
}

function toLngLat(position: LatLon): [number, number] {
  const [lat, lon] = position;
  return [lon, lat];
}

function positionToPercent(position: LatLon): { x: number; y: number } {
  const [lat, lon] = position;
  return {
    x:
      ((lon - MAP_BOUNDS.lon_min) / (MAP_BOUNDS.lon_max - MAP_BOUNDS.lon_min)) *
      100,
    y:
      ((MAP_BOUNDS.lat_max - lat) / (MAP_BOUNDS.lat_max - MAP_BOUNDS.lat_min)) *
      100,
  };
}

function circlePolygon(center: [number, number], radius: number) {
  const steps = 72;
  const coordinates = Array.from({ length: steps + 1 }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    return [
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius * 0.72,
    ];
  });

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      },
    ],
  };
}

function MapMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-cap-sm text-muted-foreground">{label}</div>
      <div className="text-foreground mt-0.5 truncate font-mono text-[10px]">
        {value}
      </div>
    </div>
  );
}

function LayerRow({
  label,
  tone,
}: {
  label: string;
  tone: 'friendly' | 'threat' | 'warning' | 'muted';
}) {
  const dot =
    tone === 'friendly'
      ? 'bg-friendly'
      : tone === 'threat'
        ? 'bg-threat'
        : tone === 'warning'
          ? 'bg-warning'
          : 'bg-muted-foreground';
  return (
    <div className="flex items-center gap-2">
      <span className={`size-1.5 ${dot}`} />
      <span className="text-muted-foreground truncate">{label}</span>
    </div>
  );
}

function loadMapLibre() {
  if (window.maplibregl) {
    return Promise.resolve(window.maplibregl);
  }

  if (window.__missionMapLibre) {
    return window.__missionMapLibre;
  }

  window.__missionMapLibre = new Promise<MapLibreGlobal>((resolve, reject) => {
    if (!document.getElementById('maplibre-css')) {
      const link = document.createElement('link');
      link.id = 'maplibre-css';
      link.rel = 'stylesheet';
      link.href = MAPLIBRE_CSS;
      document.head.appendChild(link);
    }

    const existing = document.getElementById(
      'maplibre-js'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () => {
        if (window.maplibregl) resolve(window.maplibregl);
      });
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'maplibre-js';
    script.src = MAPLIBRE_JS;
    script.async = true;
    script.onload = () => {
      if (window.maplibregl) {
        resolve(window.maplibregl);
      } else {
        reject(new Error('MapLibre did not initialize'));
      }
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return window.__missionMapLibre;
}
