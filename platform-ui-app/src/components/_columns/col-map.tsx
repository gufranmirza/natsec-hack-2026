'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Eye,
  Heart,
  HelpCircle,
  type LucideIcon,
  Minus,
  Plane,
  PlaneTakeoff,
  Plus,
  Rocket,
  Ship,
  Truck,
  User,
  Users,
  Zap,
} from 'lucide-react';

import { DronePovPanel } from '@/components/_columns/drone-pov-panel';
import deepStateOccupied from '@/lib/fixtures/deepstate-occupied-20260502.json';
import type { AnyObject, Entity, LatLon, Unit } from '@/types/ontology';
import { MAP_VIEWBOX } from '@/types/ontology';

const PAN_STEP = 72;

interface ColMapProps {
  entities: Entity[];
  units: Unit[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}

type Tile = {
  key: string;
  src: string;
  style: {
    left: string;
    top: string;
    width: string;
    height: string;
  };
};

type GeoJsonPosition = [number, number];
type GeoJsonRing = GeoJsonPosition[];
type GeoJsonPolygon = GeoJsonRing[];
type GeoJsonMultiPolygon = GeoJsonPolygon[];
type DeepStateGeometry =
  | { type: 'Polygon'; coordinates: GeoJsonPolygon }
  | { type: 'MultiPolygon'; coordinates: GeoJsonMultiPolygon };
type DeepStateFeatureCollection = {
  name?: string;
  features: Array<{ geometry: DeepStateGeometry }>;
};

const TILE_HOSTS = ['a', 'b', 'c', 'd'] as const;
const MIN_ZOOM = 6;
const MAX_ZOOM = 10;
const DEFAULT_ZOOM = 7;
const ZOOM_SCALE_BASE = 1.4;
const TILE_SIZE = 256;

const MAP_BOUNDS = {
  latMin: 44.25,
  latMax: 52.12,
  lonMin: 31.1,
  lonMax: 40.65,
} as const;

const DEEPSTATE_DATE = '2026-05-02';
const DEEPSTATE_NAME =
  (deepStateOccupied as unknown as DeepStateFeatureCollection).name ??
  'deepstatemap_data_20260502';

const ENGLISH_LABELS = [
  { label: 'Kharkiv', position: [49.99, 36.23] as LatLon, kind: 'city' },
  { label: 'Sloviansk', position: [48.86, 37.61] as LatLon, kind: 'city' },
  { label: 'Kramatorsk', position: [48.74, 37.58] as LatLon, kind: 'city' },
  { label: 'Bakhmut', position: [48.59, 38.0] as LatLon, kind: 'city' },
  { label: 'Donetsk', position: [48.0, 37.8] as LatLon, kind: 'city' },
  { label: 'Mariupol', position: [47.1, 37.55] as LatLon, kind: 'city' },
  { label: 'Dnipro', position: [48.46, 35.05] as LatLon, kind: 'city' },
  {
    label: 'Zaporizhzhia',
    position: [47.84, 35.14] as LatLon,
    kind: 'city',
  },
  { label: 'Crimea', position: [45.25, 34.2] as LatLon, kind: 'region' },
  {
    label: 'Sea of Azov',
    position: [46.4, 37.05] as LatLon,
    kind: 'water',
  },
];

// Unit (blue team) icons — mirrors UNIT_SUBTYPE_META in col-status.tsx so
// the map and Assets/Registry views agree on what each unit subtype looks
// like. Adding a new UnitSubtype means updating both maps in lockstep.
const UNIT_ICON: Record<Unit['_subtype'], LucideIcon> = {
  command_post: Crosshair,
  drone_isr: Plane,
  drone_strike: PlaneTakeoff,
  infantry_team: Users,
  infantry_recon: Eye,
  infantry_kinetic: Zap,
  vehicle_mech: Truck,
  vehicle_recon: Eye,
  vehicle_himars: Rocket,
  vehicle_mortar: Rocket,
  vehicle_medical: Heart,
  vehicle_logistic: Truck,
  drone: Plane,
  vehicle: Truck,
  infantry: Users,
  boat: Ship,
};

function markerIcon(object: Unit | Entity): LucideIcon {
  if (object._type === 'Unit') {
    return UNIT_ICON[object._subtype] ?? HelpCircle;
  }
  switch (object._subtype) {
    case 'Aircraft':
      return Plane;
    case 'Vehicle':
      return Truck;
    case 'Vessel':
      return Ship;
    case 'Person':
      return User;
    case 'Threat':
      return AlertTriangle;
    case 'Unknown':
      return HelpCircle;
  }
  return HelpCircle;
}

const ORIENTABLE_ICONS = new Set<LucideIcon>([
  Plane,
  PlaneTakeoff,
  Ship,
  Truck,
  Rocket,
]);

export function ColMap({ entities, units, selectedId, onSelect }: ColMapProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [povOpen, setPovOpen] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const selectedDrone = useMemo(() => {
    if (!selectedId) return null;
    const unit = units.find((u) => u._id === selectedId);
    if (!unit) return null;
    const hasCamera = unit.capabilities.some((c) =>
      ['optical', 'eo', 'ir'].includes(c)
    );
    return hasCamera ? unit : null;
  }, [selectedId, units]);

  useEffect(() => {
    setPovOpen(Boolean(selectedDrone));
    // re-fire only on drone identity change, not on position-only updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDrone?._id]);

  const showPov = povOpen && selectedDrone;
  const [keplerStats, setKeplerStats] = useState({
    rows: 0,
    fields: 0,
    status: 'loading' as 'loading' | 'ready' | 'failed',
  });
  const tiles = useMemo(() => buildTiles(zoom), [zoom]);
  const occupiedPaths = useMemo(() => buildDeepStatePaths(), []);

  useEffect(() => {
    let active = true;

    void import('@kepler.gl/processors/dist/data-processor')
      .then(({ processGeojson }) => {
        const dataset = processGeojson(deepStateOccupied);
        if (!active) return;
        setKeplerStats({
          rows: dataset?.rows.length ?? 0,
          fields: dataset?.fields.length ?? 0,
          status: 'ready',
        });
      })
      .catch(() => {
        if (active) {
          setKeplerStats((current) => ({ ...current, status: 'failed' }));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      setPan({
        x: dragRef.current.panX + (event.clientX - dragRef.current.x),
        y: dragRef.current.panY + (event.clientY - dragRef.current.y),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging]);

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button, a, input')) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setDragging(true);
  };

  return (
    <section
      className={[
        'relative h-full touch-none overflow-hidden bg-[hsl(220_12%_84%)] select-none',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      ].join(' ')}
      onPointerDown={handlePointerDown}
    >
      <div
        className={[
          'absolute inset-0',
          dragging ? '' : 'transition-transform duration-200 ease-out',
        ].join(' ')}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${Math.max(1.08, 1.08 * ZOOM_SCALE_BASE ** (zoom - DEFAULT_ZOOM))})`,
          transformOrigin: 'center',
        }}
      >
        <TileMosaic tiles={tiles} />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0,transparent_23px,hsl(220_20%_10%/0.065)_24px),linear-gradient(90deg,transparent_0,transparent_23px,hsl(220_20%_10%/0.055)_24px)] bg-[length:24px_24px]" />

        <DeepStateLayer paths={occupiedPaths} />
        <EnglishLabels />
        <MissionMarkers
          entities={entities}
          units={units}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>

      <div className="border-border bg-card/95 absolute left-3 top-3 z-30 w-[256px] border px-3 py-2 backdrop-blur">
        <div className="label-cap-sm text-muted-foreground">
          Operational map
        </div>
        <div className="text-foreground mt-0.5 font-mono text-[11px] font-semibold">
          DeepState occupied terrain
        </div>
        <div className="border-border mt-2 grid grid-cols-3 border-t pt-2">
          <MapMetric label="Source" value="DeepState" />
          <MapMetric label="Date" value={DEEPSTATE_DATE} />
          <MapMetric label="View" value={`Z${zoom} · ${pan.x},${pan.y}`} />
        </div>
      </div>

      <div className="border-border bg-card/95 absolute right-3 top-3 z-30 w-[236px] border px-3 py-2 backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="label-cap-sm text-muted-foreground">Layers</span>
          <span className="text-success font-mono text-[10px]">local</span>
        </div>
        <div className="grid gap-1 font-mono text-[10px]">
          <LayerRow label="DeepState GeoJSON" tone="threat" />
          <LayerRow label="CARTO English tiles" tone="muted" />
          <LayerRow label="Friendly telemetry" tone="friendly" />
          <LayerRow label="OSINT geotag cue" tone="warning" />
        </div>
      </div>

      <div className="border-border bg-card/95 absolute bottom-3 left-3 z-30 max-w-[275px] border px-3 py-2 backdrop-blur">
        <div className="label-cap-sm text-muted-foreground">Dataset</div>
        <div className="text-muted-foreground mt-0.5 truncate font-mono text-[9px]">
          {DEEPSTATE_NAME} · latest daily fixture
        </div>
        <div className="border-border text-muted-foreground mt-1.5 flex gap-3 border-t pt-1.5 font-mono text-[9px]">
          <span>kepler {keplerStats.status}</span>
          <span>rows {keplerStats.rows}</span>
          <span>fields {keplerStats.fields}</span>
        </div>
      </div>

      <MapNavControls
        zoom={zoom}
        onZoomIn={() => setZoom((c) => Math.min(MAX_ZOOM, c + 1))}
        onZoomOut={() => setZoom((c) => Math.max(MIN_ZOOM, c - 1))}
        onPan={(dx, dy) => setPan((c) => ({ x: c.x + dx, y: c.y + dy }))}
        onReset={() => setPan({ x: 0, y: 0 })}
      />

      {showPov && selectedDrone ? (
        <DronePovPanel unit={selectedDrone} onClose={() => setPovOpen(false)} />
      ) : null}
    </section>
  );
}

function TileMosaic({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="absolute inset-0">
      {tiles.map((tile) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={tile.key}
          src={tile.src}
          alt=""
          className="absolute object-cover"
          style={tile.style}
          draggable={false}
        />
      ))}
    </div>
  );
}

function DeepStateLayer({ paths }: { paths: string[] }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 size-full"
      viewBox={`0 0 ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern
          id="deepstate-hatch"
          patternUnits="userSpaceOnUse"
          width="14"
          height="14"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="14"
            stroke="hsl(var(--threat) / 0.34)"
            strokeWidth="4"
          />
        </pattern>
      </defs>
      {paths.map((path, index) => (
        <path
          key={`occupied-${index}`}
          d={path}
          fill="url(#deepstate-hatch)"
          fillRule="evenodd"
          stroke="hsl(var(--threat))"
          strokeLinejoin="round"
          strokeWidth="2.4"
          opacity="0.82"
        />
      ))}
      {paths.map((path, index) => (
        <path
          key={`occupied-fill-${index}`}
          d={path}
          fill="hsl(var(--threat) / 0.13)"
          fillRule="evenodd"
        />
      ))}
    </svg>
  );
}

function EnglishLabels() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {ENGLISH_LABELS.map((label) => {
        const style = positionStyle(label.position);
        return (
          <div
            key={label.label}
            className={[
              'absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-mono drop-shadow-[0_1px_0_hsl(var(--background))]',
              label.kind === 'water'
                ? 'text-[10px] uppercase tracking-[0.12em] text-[hsl(211_20%_38%)]'
                : label.kind === 'region'
                  ? 'text-[12px] font-semibold uppercase tracking-[0.08em] text-[hsl(220_15%_20%)]'
                  : 'text-[10px] font-semibold text-[hsl(220_12%_18%)]',
            ].join(' ')}
            style={style}
          >
            {label.label}
          </div>
        );
      })}
    </div>
  );
}

function hasValidPosition<T extends { position?: unknown }>(o: T): boolean {
  return (
    Array.isArray(o.position) &&
    o.position.length === 2 &&
    typeof o.position[0] === 'number' &&
    typeof o.position[1] === 'number' &&
    Number.isFinite(o.position[0]) &&
    Number.isFinite(o.position[1])
  );
}

function MissionMarkers({
  entities: entitiesIn,
  units: unitsIn,
  selectedId,
  onSelect,
}: {
  entities: Entity[];
  units: Unit[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}) {
  const units = useMemo(() => unitsIn.filter(hasValidPosition), [unitsIn]);
  const entities = useMemo(
    () => entitiesIn.filter(hasValidPosition),
    [entitiesIn]
  );

  const initialPositions = useRef(new Map<string, LatLon>());
  for (const u of units) {
    if (!initialPositions.current.has(u._id)) {
      initialPositions.current.set(u._id, u.position);
    }
  }
  for (const e of entities) {
    if (!initialPositions.current.has(e._id)) {
      initialPositions.current.set(e._id, e.position);
    }
  }
  const idKey = useMemo(
    () =>
      [...units.map((u) => u._id), ...entities.map((e) => e._id)]
        .sort()
        .join('|'),
    [units, entities]
  );
  const offsets = useMemo(() => {
    const items: {
      id: string;
      x: number;
      y: number;
      ox: number;
      oy: number;
    }[] = [];
    for (const u of units) {
      const seed = initialPositions.current.get(u._id) ?? u.position;
      const p = projectToSvg(seed);
      items.push({ id: u._id, x: p.x, y: p.y, ox: p.x, oy: p.y });
    }
    for (const e of entities) {
      const seed = initialPositions.current.get(e._id) ?? e.position;
      const p = projectToSvg(seed);
      items.push({ id: e._id, x: p.x, y: p.y, ox: p.x, oy: p.y });
    }
    for (let iter = 0; iter < MARKER_LAYOUT_ITERS; iter += 1) {
      let moved = false;
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          const a = items[i];
          const b = items[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.001;
          if (d < MARKER_MIN_DIST) {
            const push = (MARKER_MIN_DIST - d) / 2;
            const nx = dx / d;
            const ny = dy / d;
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    const map = new Map<string, { dx: number; dy: number }>();
    for (const it of items)
      map.set(it.id, { dx: it.x - it.ox, dy: it.y - it.oy });
    return map;
    // re-run only when the set of ids changes, not on per-tick position updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey]);

  return (
    <div className="absolute inset-0 z-20">
      {units.map((unit) => {
        const truePoint = projectToSvg(unit.position);
        const off = offsets.get(unit._id) ?? { dx: 0, dy: 0 };
        return (
          <MarkerButton
            key={unit._id}
            point={{ x: truePoint.x + off.dx, y: truePoint.y + off.dy }}
            label={unit.callsign}
            meta={`${unit.status.toUpperCase()} · BAT ${unit.battery_pct ?? '--'}%`}
            tone="friendly"
            icon={markerIcon(unit)}
            heading={unit.heading_deg}
            selected={unit._id === selectedId}
            onClick={() => onSelect(unit)}
          />
        );
      })}
      {entities.map((entity) => {
        const truePoint = projectToSvg(entity.position);
        const off = offsets.get(entity._id) ?? { dx: 0, dy: 0 };
        return (
          <MarkerButton
            key={entity._id}
            point={{ x: truePoint.x + off.dx, y: truePoint.y + off.dy }}
            label={entity.name ?? entity._id}
            meta={`${entity._subtype.toUpperCase()} · ${Math.round(
              entity.confidence * 100
            )}%`}
            tone={entity.affiliation === 'hostile' ? 'threat' : 'warning'}
            icon={markerIcon(entity)}
            heading={entity.heading_deg}
            selected={entity._id === selectedId}
            onClick={() => onSelect(entity)}
          />
        );
      })}
    </div>
  );
}

const MARKER_MIN_DIST = 38;
const MARKER_LAYOUT_ITERS = 50;

function MarkerButton({
  point,
  label,
  meta,
  tone,
  icon: Icon,
  heading,
  selected,
  onClick,
}: {
  point: { x: number; y: number };
  label: string;
  meta: string;
  tone: 'friendly' | 'threat' | 'warning';
  icon: LucideIcon;
  heading?: number;
  selected: boolean;
  onClick: () => void;
}) {
  const toneText =
    tone === 'friendly'
      ? 'text-friendly'
      : tone === 'threat'
        ? 'text-threat'
        : 'text-warning';
  const toneRing =
    tone === 'friendly'
      ? 'ring-friendly'
      : tone === 'threat'
        ? 'ring-threat'
        : 'ring-warning';
  const iconStyle =
    heading !== undefined && ORIENTABLE_ICONS.has(Icon)
      ? { transform: `rotate(${heading}deg)` }
      : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group absolute -translate-x-1/2 -translate-y-1/2',
        selected ? 'z-30' : 'z-20',
      ].join(' ')}
      style={{
        // Quantize to 4dp — full float precision differs between
        // Next's SSR string output and the client's render and trips
        // a hydration mismatch on every marker. 4dp is well below
        // sub-pixel granularity so visually identical.
        left: `${((point.x / MAP_VIEWBOX.w) * 100).toFixed(4)}%`,
        top: `${((point.y / MAP_VIEWBOX.h) * 100).toFixed(4)}%`,
      }}
      aria-label={label}
    >
      <Icon
        className={[
          'size-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] transition-transform group-hover:scale-125',
          selected
            ? `${toneText} ${toneRing} rounded-full ring-2 ring-offset-1 ring-offset-[hsl(220_12%_84%)]`
            : toneText,
        ].join(' ')}
        strokeWidth={2.6}
        style={iconStyle}
      />
      {selected ? (
        <span
          className={[
            'pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-bold leading-none [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]',
            toneText,
          ].join(' ')}
        >
          {label}
          <span className="text-muted-foreground ml-1.5">{meta}</span>
        </span>
      ) : (
        <span
          className={[
            'pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-bold leading-none opacity-0 transition-opacity [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] group-hover:opacity-100',
            toneText,
          ].join(' ')}
        >
          {label}
        </span>
      )}
    </button>
  );
}

function buildTiles(zoom: number): Tile[] {
  const topLeft = webMercator([MAP_BOUNDS.latMax, MAP_BOUNDS.lonMin], zoom);
  const bottomRight = webMercator([MAP_BOUNDS.latMin, MAP_BOUNDS.lonMax], zoom);
  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
  const xMin = Math.floor(topLeft.x / TILE_SIZE);
  const xMax = Math.floor(bottomRight.x / TILE_SIZE);
  const yMin = Math.floor(topLeft.y / TILE_SIZE);
  const yMax = Math.floor(bottomRight.y / TILE_SIZE);
  const tiles: Tile[] = [];

  for (let y = yMin; y <= yMax; y += 1) {
    for (let x = xMin; x <= xMax; x += 1) {
      const host = TILE_HOSTS[Math.abs(x + y) % TILE_HOSTS.length];
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        src: `https://${host}.basemaps.cartocdn.com/light_nolabels/${zoom}/${x}/${y}@2x.png`,
        style: {
          left: `${((x * TILE_SIZE - topLeft.x) / width) * 100}%`,
          top: `${((y * TILE_SIZE - topLeft.y) / height) * 100}%`,
          width: `${(TILE_SIZE / width) * 100}%`,
          height: `${(TILE_SIZE / height) * 100}%`,
        },
      });
    }
  }

  return tiles;
}

function buildDeepStatePaths() {
  const collection = deepStateOccupied as unknown as DeepStateFeatureCollection;

  return collection.features.flatMap((feature) => {
    if (feature.geometry.type === 'Polygon') {
      return [polygonToPath(feature.geometry.coordinates)];
    }

    return feature.geometry.coordinates.map(polygonToPath);
  });
}

function polygonToPath(polygon: GeoJsonPolygon) {
  return polygon
    .map((ring) =>
      ring
        .map(([lon, lat], index) => {
          const point = projectToSvg([lat, lon]);
          return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
        })
        .join(' ')
        .concat(' Z')
    )
    .join(' ');
}

function webMercator([lat, lon]: LatLon, zoom: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;

  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function projectToSvg(position: LatLon) {
  const topLeft = webMercator([MAP_BOUNDS.latMax, MAP_BOUNDS.lonMin], 8);
  const bottomRight = webMercator([MAP_BOUNDS.latMin, MAP_BOUNDS.lonMax], 8);
  const point = webMercator(position, 8);

  return {
    x: ((point.x - topLeft.x) / (bottomRight.x - topLeft.x)) * MAP_VIEWBOX.w,
    y: ((point.y - topLeft.y) / (bottomRight.y - topLeft.y)) * MAP_VIEWBOX.h,
  };
}

function positionStyle(position: LatLon) {
  const point = projectToSvg(position);
  return {
    left: `${(point.x / MAP_VIEWBOX.w) * 100}%`,
    top: `${(point.y / MAP_VIEWBOX.h) * 100}%`,
  };
}

function MapNavControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onPan,
  onReset,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPan: (dx: number, dy: number) => void;
  onReset: () => void;
}) {
  const padBtn =
    'border-border bg-card hover:bg-secondary text-foreground grid size-8 place-items-center border';
  const zoomBtn =
    'border-border bg-card hover:bg-secondary text-foreground grid size-9 place-items-center border';
  return (
    <div className="absolute bottom-3 right-3 z-30 flex items-end gap-2">
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        <span />
        <button
          type="button"
          aria-label="Pan north"
          onClick={() => onPan(0, PAN_STEP)}
          className={padBtn}
        >
          <ChevronUp className="size-4" />
        </button>
        <span />
        <button
          type="button"
          aria-label="Pan west"
          onClick={() => onPan(PAN_STEP, 0)}
          className={padBtn}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Recenter map"
          onClick={onReset}
          className={padBtn}
        >
          <Crosshair className="text-muted-foreground size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Pan east"
          onClick={() => onPan(-PAN_STEP, 0)}
          className={padBtn}
        >
          <ChevronRight className="size-4" />
        </button>
        <span />
        <button
          type="button"
          aria-label="Pan south"
          onClick={() => onPan(0, -PAN_STEP)}
          className={padBtn}
        >
          <ChevronDown className="size-4" />
        </button>
        <span />
      </div>
      <div className="bg-card border-border flex flex-col border backdrop-blur">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={onZoomIn}
          className={`${zoomBtn} border-0 border-b`}
        >
          <Plus className="size-4" />
        </button>
        <span className="text-muted-foreground border-border grid size-9 place-items-center border-b font-mono text-[10px]">
          Z{zoom}
        </span>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={onZoomOut}
          className={`${zoomBtn} border-0`}
        >
          <Minus className="size-4" />
        </button>
      </div>
    </div>
  );
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
