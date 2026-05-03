'use client';

import { useMemo, useState } from 'react';

import type { AnyObject, Entity, LatLon, Unit } from '@/types/ontology';
import { latLonToSvg, MAP_VIEWBOX } from '@/types/ontology';

interface ColMapProps {
  entities: Entity[];
  units: Unit[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}

const MAP_CENTER: LatLon = [38.71, 23.5];
const TILE_HOSTS = ['a', 'b', 'c', 'd'] as const;
const MIN_ZOOM = 8;
const MAX_ZOOM = 11;

const ENGLISH_LABELS = [
  { label: 'Euboea', position: [38.74, 23.48] as LatLon, kind: 'region' },
  { label: 'Chalcis', position: [38.46, 23.59] as LatLon, kind: 'town' },
  { label: 'Aliveri', position: [38.42, 23.72] as LatLon, kind: 'town' },
  {
    label: 'Skyros Strait',
    position: [38.78, 23.78] as LatLon,
    kind: 'water',
  },
  {
    label: 'Aegean Sea',
    position: [38.9, 23.34] as LatLon,
    kind: 'water',
  },
];

const ROUTE: LatLon[] = [
  [38.55, 23.2],
  [38.6, 23.33],
  [38.68, 23.45],
  [38.78, 23.55],
  [38.85, 23.62],
];

export function ColMap({ entities, units, selectedId, onSelect }: ColMapProps) {
  const [zoom, setZoom] = useState(9);
  const tiles = useMemo(() => buildTiles(zoom), [zoom]);

  return (
    <section className="relative h-full overflow-hidden bg-[hsl(220_12%_84%)]">
      <TileMosaic tiles={tiles} />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0,transparent_23px,hsl(220_20%_10%/0.06)_24px),linear-gradient(90deg,transparent_0,transparent_23px,hsl(220_20%_10%/0.05)_24px)] bg-[length:24px_24px]" />

      <MissionVectors entities={entities} units={units} />
      <EnglishLabels />
      <MissionMarkers
        entities={entities}
        units={units}
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <div className="border-border bg-card/95 absolute left-3 top-3 z-30 w-[244px] border px-3 py-2 backdrop-blur">
        <div className="label-cap-sm text-muted-foreground">Open map layer</div>
        <div className="text-foreground mt-0.5 font-mono text-[11px] font-semibold">
          CARTO raster / English overlay
        </div>
        <div className="border-border mt-2 grid grid-cols-3 border-t pt-2">
          <MapMetric label="Labels" value="EN" />
          <MapMetric label="Grid" value="UTM 35S" />
          <MapMetric label="Zoom" value={`Z${zoom}`} />
        </div>
      </div>

      <div className="border-border bg-card/95 absolute right-3 top-3 z-30 w-[228px] border px-3 py-2 backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="label-cap-sm text-muted-foreground">Layers</span>
          <span className="text-success font-mono text-[10px]">local</span>
        </div>
        <div className="grid gap-1 font-mono text-[10px]">
          <LayerRow label="English basemap tiles" tone="muted" />
          <LayerRow label="OSINT geotag cue" tone="warning" />
          <LayerRow label="Friendly telemetry" tone="friendly" />
          <LayerRow label="Contact tracks" tone="threat" />
          <LayerRow label="RF search area" tone="warning" />
        </div>
      </div>

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
    </section>
  );
}

function TileMosaic({
  tiles,
}: {
  tiles: Array<{ key: string; src: string; alt: string }>;
}) {
  return (
    <div className="contrast-110 absolute inset-[-22%] grid grid-cols-5 opacity-85 saturate-50">
      {tiles.map((tile) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={tile.key}
          src={tile.src}
          alt={tile.alt}
          className="size-full object-cover"
          draggable={false}
        />
      ))}
    </div>
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
  const rf = latLonToSvg([38.85, 23.62]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 size-full"
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
        opacity="0.85"
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
        rx="92"
        ry="70"
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
  const point = latLonToSvg(object.position);
  const isFriendly =
    object._type === 'Unit' || object.affiliation === 'friendly';
  const dx = isFriendly ? -62 : -78;
  const dy = isFriendly ? 36 : -46;

  return (
    <path
      d={`M ${point.x + dx} ${point.y + dy} L ${point.x - dx * 0.18} ${point.y - dy * 0.18} L ${point.x} ${point.y}`}
      fill="none"
      stroke={isFriendly ? 'hsl(var(--friendly))' : 'hsl(var(--threat))'}
      strokeWidth="4"
      strokeDasharray="9 8"
      opacity="0.7"
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
                  ? 'text-[12px] font-semibold text-[hsl(220_15%_20%)]'
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
        'absolute flex max-w-[148px] translate-x-2 translate-y-[-12px] items-center gap-2 border bg-[hsl(220_18%_8%/0.92)] px-2 py-1 text-left shadow-none backdrop-blur transition-transform hover:scale-[1.02]',
        selected ? 'ring-primary ring-1' : '',
        tone === 'friendly'
          ? 'border-friendly text-friendly'
          : tone === 'threat'
            ? 'border-threat text-threat'
            : 'border-warning text-warning',
      ].join(' ')}
      style={positionStyle(position)}
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

function buildTiles(zoom: number) {
  const center = latLonToTile(MAP_CENTER, zoom);
  const offsets = [-2, -1, 0, 1, 2];

  return offsets.flatMap((dy) =>
    offsets.map((dx) => {
      const x = center.x + dx;
      const y = center.y + dy;
      const host = TILE_HOSTS[Math.abs(x + y) % TILE_HOSTS.length];
      return {
        key: `${zoom}-${x}-${y}`,
        src: `https://${host}.basemaps.cartocdn.com/light_nolabels/${zoom}/${x}/${y}@2x.png`,
        alt: '',
      };
    })
  );
}

function latLonToTile([lat, lon]: LatLon, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const scale = 2 ** zoom;
  const x = Math.floor(((lon + 180) / 360) * scale);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      scale
  );

  return { x, y };
}

function positionStyle(position: LatLon) {
  const point = latLonToSvg(position);
  return {
    left: `${(point.x / MAP_VIEWBOX.w) * 100}%`,
    top: `${(point.y / MAP_VIEWBOX.h) * 100}%`,
  };
}

function toPath(points: LatLon[]) {
  return points
    .map((point, index) => {
      const { x, y } = latLonToSvg(point);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
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
