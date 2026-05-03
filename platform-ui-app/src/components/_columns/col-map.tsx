'use client';

import { useEffect, useMemo, useState } from 'react';

import deepStateOccupied from '@/lib/fixtures/deepstate-occupied-20260502.json';
import type {
  AnyObject,
  Entity,
  Event,
  LatLon,
  Recommendation,
  Unit,
} from '@/types/ontology';
import { MAP_VIEWBOX } from '@/types/ontology';

interface ColMapProps {
  entities: Entity[];
  units: Unit[];
  events: Event[];
  recommendations: Recommendation[];
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
const MAX_ZOOM = 8;
const DEFAULT_ZOOM = 7;
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

const ROUTE: LatLon[] = [
  [48.67, 37.35],
  [48.7, 37.52],
  [48.72, 37.62],
  [48.75, 37.78],
  [48.78, 37.9],
];

const MARKER_OFFSETS: Record<string, { x: number; y: number }> = {
  'ROOK-1': { x: -154, y: -42 },
  'ROOK-2': { x: 28, y: 26 },
  'BRAVO-3': { x: -150, y: 22 },
  'BOGEY-7': { x: 34, y: -58 },
  'V-117': { x: 42, y: 68 },
  'P-04': { x: -16, y: 2 },
};

export function ColMap({
  entities,
  units,
  events,
  recommendations,
  selectedId,
  onSelect,
}: ColMapProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
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

  return (
    <section className="relative h-full overflow-hidden bg-[hsl(220_12%_84%)]">
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(1.08)`,
          transformOrigin: 'center',
        }}
      >
        <TileMosaic tiles={tiles} />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0,transparent_23px,hsl(220_20%_10%/0.065)_24px),linear-gradient(90deg,transparent_0,transparent_23px,hsl(220_20%_10%/0.055)_24px)] bg-[length:24px_24px]" />

        <DeepStateLayer paths={occupiedPaths} />
        <MissionVectors entities={entities} units={units} />
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
          <LayerRow label="Kepler.gl processor" tone="friendly" />
          <LayerRow label="DeepState GeoJSON" tone="threat" />
          <LayerRow label="CARTO English tiles" tone="muted" />
          <LayerRow label="OSINT geotag cue" tone="warning" />
          <LayerRow label="Friendly telemetry" tone="friendly" />
          <LayerRow label="RF search area" tone="warning" />
        </div>
      </div>

      <UnifiedFeedsPanel entities={entities} units={units} events={events} />

      <AlertsPriorityPanel
        entities={entities}
        units={units}
        events={events}
        recommendations={recommendations}
        onSelect={onSelect}
      />

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

      <RealTimeMapFeed events={events} onSelect={onSelect} />
      <SupervisedWorkflowPanel recommendations={recommendations} />

      <div className="border-border bg-card/95 absolute bottom-3 right-3 z-30 grid border backdrop-blur">
        <button
          type="button"
          onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current + 1))}
          className="border-border hover:bg-secondary grid size-8 place-items-center border-b font-mono text-[15px] font-bold"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current - 1))}
          className="hover:bg-secondary grid size-8 place-items-center font-mono text-[15px] font-bold"
          aria-label="Zoom out"
        >
          -
        </button>
      </div>

      <div className="border-border bg-card/95 absolute bottom-3 right-14 z-30 grid grid-cols-3 border backdrop-blur">
        <span className="size-8" />
        <button
          type="button"
          onClick={() =>
            setPan((current) => ({ ...current, y: current.y + 72 }))
          }
          className="border-border hover:bg-secondary grid size-8 place-items-center border-b border-l font-mono text-[12px] font-bold"
          aria-label="Pan map up"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => setPan({ x: 0, y: 0 })}
          className="border-border hover:bg-secondary grid size-8 place-items-center border-b border-l font-mono text-[10px] font-bold"
          aria-label="Reset map pan"
        >
          C
        </button>
        <button
          type="button"
          onClick={() =>
            setPan((current) => ({ ...current, x: current.x + 72 }))
          }
          className="border-border hover:bg-secondary grid size-8 place-items-center border-t font-mono text-[12px] font-bold"
          aria-label="Pan map left"
        >
          L
        </button>
        <button
          type="button"
          onClick={() =>
            setPan((current) => ({ ...current, y: current.y - 72 }))
          }
          className="border-border hover:bg-secondary grid size-8 place-items-center border-l border-t font-mono text-[12px] font-bold"
          aria-label="Pan map down"
        >
          D
        </button>
        <button
          type="button"
          onClick={() =>
            setPan((current) => ({ ...current, x: current.x - 72 }))
          }
          className="border-border hover:bg-secondary grid size-8 place-items-center border-l border-t font-mono text-[12px] font-bold"
          aria-label="Pan map right"
        >
          R
        </button>
      </div>
    </section>
  );
}

function TileMosaic({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="absolute inset-0 opacity-80">
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

function MissionVectors({
  entities,
  units,
}: {
  entities: Entity[];
  units: Unit[];
}) {
  const routePath = toPath(ROUTE);
  const rf = projectToSvg([48.78, 37.9]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 size-full"
      viewBox={`0 0 ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={routePath}
        fill="none"
        stroke="hsl(var(--background))"
        strokeWidth="16"
        strokeLinecap="square"
        opacity="0.88"
      />
      <path
        d={routePath}
        fill="none"
        stroke="hsl(var(--warning))"
        strokeWidth="5"
        strokeDasharray="18 14"
        strokeLinecap="square"
      />
      <ellipse
        cx={rf.x}
        cy={rf.y}
        rx="78"
        ry="56"
        fill="hsl(var(--warning) / 0.15)"
        stroke="hsl(var(--warning))"
        strokeWidth="3"
        strokeDasharray="10 10"
      />
      {[...entities, ...units].map((object) => (
        <TrackLine key={`track-${object._id}`} object={object} />
      ))}
    </svg>
  );
}

function TrackLine({ object }: { object: Entity | Unit }) {
  const point = projectToSvg(object.position);
  const isFriendly =
    object._type === 'Unit' || object.affiliation === 'friendly';
  const dx = isFriendly ? -56 : -72;
  const dy = isFriendly ? 32 : -42;

  return (
    <path
      d={`M ${point.x + dx} ${point.y + dy} L ${point.x - dx * 0.18} ${point.y - dy * 0.18} L ${point.x} ${point.y}`}
      fill="none"
      stroke={isFriendly ? 'hsl(var(--friendly))' : 'hsl(var(--threat))'}
      strokeWidth="4"
      strokeDasharray="9 8"
      opacity="0.78"
    />
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

function MissionMarkers({
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
    <div className="absolute inset-0 z-20">
      {units.map((unit) => (
        <MarkerButton
          key={unit._id}
          label={unit.callsign}
          meta={`${unit.status.toUpperCase()} · BAT ${unit.battery_pct ?? '--'}%`}
          tone="friendly"
          position={unit.position}
          selected={unit._id === selectedId}
          onClick={() => onSelect(unit)}
        />
      ))}
      {entities.map((entity) => (
        <MarkerButton
          key={entity._id}
          label={entity.name ?? entity._id}
          meta={`${entity._subtype.toUpperCase()} · ${Math.round(
            entity.confidence * 100
          )}%`}
          tone={entity.affiliation === 'hostile' ? 'threat' : 'warning'}
          position={entity.position}
          selected={entity._id === selectedId}
          onClick={() => onSelect(entity)}
        />
      ))}
    </div>
  );
}

function UnifiedFeedsPanel({
  entities,
  units,
  events,
}: {
  entities: Entity[];
  units: Unit[];
  events: Event[];
}) {
  const sourceRows = [
    {
      label: 'Sensor tracks',
      value: entities.length,
      meta: `${events.filter((event) => event._subtype === 'detection').length} detections`,
      tone: 'friendly' as const,
    },
    {
      label: 'Unit positions',
      value: units.length,
      meta: `${units.filter((unit) => unit.status !== 'offline').length} online`,
      tone: 'friendly' as const,
    },
    {
      label: 'Vehicles',
      value: entities.filter((entity) => entity._subtype === 'Vehicle').length,
      meta: 'track + route relation',
      tone: 'warning' as const,
    },
    {
      label: 'Comms',
      value: events.filter((event) => event._source.includes('voice')).length,
      meta: 'radio-linked',
      tone: 'muted' as const,
    },
    {
      label: 'Intel reports',
      value: events.filter((event) => event._source === 'mission-ai').length,
      meta: 'parsed to graph',
      tone: 'muted' as const,
    },
    {
      label: 'RF / OSINT',
      value: events.filter(
        (event) => event._source === 'radio' || event._source === 'social'
      ).length,
      meta: 'cross-cued',
      tone: 'warning' as const,
    },
  ];

  return (
    <div className="border-border bg-card/95 absolute right-3 top-[178px] z-30 hidden w-[236px] border backdrop-blur xl:block">
      <div className="border-border border-b px-3 py-2">
        <div className="label-cap-sm text-muted-foreground">Unified feeds</div>
        <div className="text-foreground font-mono text-[11px] font-bold">
          Live source fusion
        </div>
      </div>
      <div className="bg-border grid gap-px">
        {sourceRows.map((row) => (
          <div
            key={row.label}
            className="bg-card grid grid-cols-[1fr_auto] gap-2 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`size-1.5 shrink-0 ${sourceDot(row.tone)}`} />
                <span className="text-foreground truncate font-mono text-[10px] font-bold">
                  {row.label}
                </span>
              </div>
              <div className="text-muted-foreground mt-0.5 truncate font-mono text-[9px]">
                {row.meta}
              </div>
            </div>
            <span className="text-primary font-mono text-[13px] font-bold">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPriorityPanel({
  entities,
  units,
  events,
  recommendations,
  onSelect,
}: {
  entities: Entity[];
  units: Unit[];
  events: Event[];
  recommendations: Recommendation[];
  onSelect: (o: AnyObject) => void;
}) {
  const criticalEvents = events.filter(
    (event) => event.severity === 'critical'
  );
  const warningEvents = events.filter((event) => event.severity === 'warn');
  const pendingRecommendations = recommendations.filter(
    (recommendation) => recommendation.status === 'pending'
  );
  const lowBattery = units.filter(
    (unit) => unit._subtype === 'drone' && (unit.battery_pct ?? 100) < 45
  );
  const highThreat = entities.filter(
    (entity) =>
      entity.affiliation === 'hostile' || entity.threat_level === 'high'
  );
  const priorityRows = [
    ...criticalEvents.slice(0, 2).map((event) => ({
      key: event._id,
      tone: 'critical' as const,
      label: event.verb ?? event._subtype,
      body: event.description,
      meta: _time(event._observed_at),
      object: event as AnyObject,
    })),
    ...pendingRecommendations.slice(0, 2).map((recommendation) => ({
      key: recommendation._id,
      tone: 'decision' as const,
      label: `${recommendation.verb} ${recommendation.asset_callsign ?? 'asset'}`,
      body: recommendation.short,
      meta: `${Math.round(recommendation.confidence * 100)}% · approval`,
      object: recommendation as AnyObject,
    })),
    ...warningEvents.slice(0, 2).map((event) => ({
      key: event._id,
      tone: 'warning' as const,
      label: event.verb ?? event._subtype,
      body: event.description,
      meta: _time(event._observed_at),
      object: event as AnyObject,
    })),
  ].slice(0, 4);

  return (
    <div className="border-border bg-card/95 absolute left-[280px] right-[260px] top-3 z-30 hidden border backdrop-blur xl:block">
      <div className="border-border flex items-center justify-between gap-4 border-b px-3 py-2">
        <div>
          <div className="label-cap-sm text-muted-foreground">
            Alerts & priorities
          </div>
          <div className="text-foreground font-mono text-[11px] font-bold">
            Commander attention queue
          </div>
        </div>
        <div className="border-border bg-border grid min-w-[360px] grid-cols-4 gap-px overflow-hidden border">
          <PriorityMetric
            label="Critical"
            value={criticalEvents.length}
            tone="critical"
          />
          <PriorityMetric
            label="Decisions"
            value={pendingRecommendations.length}
            tone="decision"
          />
          <PriorityMetric
            label="Battery"
            value={lowBattery.length}
            tone="warning"
          />
          <PriorityMetric
            label="Threats"
            value={highThreat.length}
            tone="critical"
          />
        </div>
      </div>
      <div className="divide-border grid grid-cols-4 divide-x">
        {priorityRows.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={() => onSelect(row.object)}
            className="hover:bg-secondary min-w-0 px-3 py-2 text-left"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className={`size-1.5 shrink-0 ${priorityDot(row.tone)}`} />
              <span className="text-foreground truncate font-mono text-[10px] font-bold">
                {row.label}
              </span>
              <span className="text-muted-foreground ml-auto font-mono text-[9px]">
                {row.meta}
              </span>
            </div>
            <p className="text-muted-foreground line-clamp-2 text-[10px] leading-snug">
              {row.body}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function SupervisedWorkflowPanel({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  const pending = recommendations.filter(
    (recommendation) => recommendation.status === 'pending'
  ).length;
  const accepted = recommendations.filter(
    (recommendation) => recommendation.status === 'accepted'
  ).length;
  const steps = [
    ['Detect', 'RF/EO cue'],
    ['Identify', 'graph link'],
    ['Recommend', `${pending} pending`],
    ['Approve', 'human gate'],
    ['Task', 'ISR only'],
    ['Audit', `${accepted} accepted`],
  ];

  return (
    <div className="border-border bg-card/95 absolute bottom-3 right-[104px] z-30 hidden w-[430px] border backdrop-blur xl:block">
      <div className="border-border flex items-baseline justify-between border-b px-3 py-2">
        <div>
          <div className="label-cap-sm text-muted-foreground">
            Supervised decision chain
          </div>
          <div className="text-foreground font-mono text-[11px] font-bold">
            Detect to tasking with approval gate
          </div>
        </div>
        <span className="text-warning font-mono text-[9px] font-bold uppercase">
          HITL
        </span>
      </div>
      <div className="divide-border grid grid-cols-6 divide-x">
        {steps.map(([label, meta], index) => (
          <div key={label} className="p-2 text-center">
            <div
              className={[
                'mx-auto mb-1 grid size-5 place-items-center font-mono text-[10px] font-bold',
                index < 3
                  ? 'bg-primary text-primary-foreground'
                  : index === 3
                    ? 'bg-warning text-background'
                    : 'bg-secondary text-foreground',
              ].join(' ')}
            >
              {index + 1}
            </div>
            <div className="text-foreground truncate font-mono text-[9px] font-bold">
              {label}
            </div>
            <div className="text-muted-foreground mt-0.5 truncate font-mono text-[8px]">
              {meta}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriorityMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'critical' | 'decision' | 'warning';
}) {
  return (
    <div className="bg-card px-2 py-1.5">
      <div className="text-muted-foreground font-mono text-[8px] uppercase">
        {label}
      </div>
      <div
        className={[
          'mt-0.5 font-mono text-[14px] font-bold',
          tone === 'critical'
            ? 'text-threat'
            : tone === 'decision'
              ? 'text-primary'
              : 'text-warning',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  );
}

function priorityDot(tone: 'critical' | 'decision' | 'warning') {
  if (tone === 'critical') return 'bg-threat';
  if (tone === 'decision') return 'bg-primary';
  return 'bg-warning';
}

function sourceDot(tone: 'friendly' | 'warning' | 'muted') {
  if (tone === 'friendly') return 'bg-friendly';
  if (tone === 'warning') return 'bg-warning';
  return 'bg-muted-foreground';
}

function RealTimeMapFeed({
  events,
  onSelect,
}: {
  events: Event[];
  onSelect: (o: AnyObject) => void;
}) {
  return (
    <div className="border-border bg-card/95 absolute bottom-3 left-[304px] z-30 hidden w-[360px] border backdrop-blur xl:block">
      <div className="border-border flex items-baseline justify-between border-b px-3 py-2">
        <div>
          <div className="label-cap-sm text-muted-foreground">
            Real-time feed
          </div>
          <div className="text-foreground font-mono text-[11px] font-bold">
            Latest mission deltas
          </div>
        </div>
        <span className="text-primary font-mono text-[10px]">
          {events.length} events
        </span>
      </div>
      <div className="max-h-[236px] overflow-y-auto">
        {events.slice(0, 8).map((event) => (
          <button
            key={event._id}
            type="button"
            onClick={() => onSelect(event)}
            className="border-border hover:bg-secondary grid w-full grid-cols-[58px_1fr] gap-2 border-b px-3 py-2 text-left last:border-b-0"
          >
            <span className="text-muted-foreground font-mono text-[9px]">
              {_time(event._observed_at)}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span
                  className={[
                    'size-1.5 shrink-0',
                    event.severity === 'critical'
                      ? 'bg-threat'
                      : event.severity === 'warn'
                        ? 'bg-warning'
                        : 'bg-primary',
                  ].join(' ')}
                />
                <span className="text-foreground truncate font-mono text-[10px] font-bold">
                  {event.verb ?? event._subtype}
                </span>
              </span>
              <span className="text-muted-foreground mt-1 line-clamp-2 text-[10px] leading-snug">
                {event.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MarkerButton({
  label,
  meta,
  tone,
  position,
  selected,
  onClick,
}: {
  label: string;
  meta: string;
  tone: 'friendly' | 'threat' | 'warning';
  position: LatLon;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'absolute flex max-w-[148px] items-center gap-2 border bg-[hsl(220_18%_8%/0.92)] px-2 py-1 text-left shadow-none backdrop-blur transition-transform hover:scale-[1.02]',
        selected ? 'ring-primary ring-1' : '',
        tone === 'friendly'
          ? 'border-friendly text-friendly'
          : tone === 'threat'
            ? 'border-threat text-threat'
            : 'border-warning text-warning',
      ].join(' ')}
      style={{
        ...positionStyle(position),
        marginLeft: `${MARKER_OFFSETS[label]?.x ?? 8}px`,
        marginTop: `${MARKER_OFFSETS[label]?.y ?? -12}px`,
      }}
      aria-label={label}
    >
      <span className="block size-2 shrink-0 bg-current" />
      <span className="min-w-0">
        <span className="block truncate font-mono text-[10px] font-bold leading-none">
          {label}
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate font-mono text-[9px] leading-none">
          {meta}
        </span>
      </span>
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

function toPath(points: LatLon[]) {
  return points
    .map((point, index) => {
      const { x, y } = projectToSvg(point);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function _time(iso: string) {
  return iso.split('T')[1]?.slice(0, 8) ?? iso;
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
