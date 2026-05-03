'use client';

// Column 1 (50%) — the operational picture.
// Dark, sealed off via .invert-surface. Hand-drawn topographic SVG
// with MIL-STD-2525 simplified glyphs. Crosshair cursor. Scanlines.
// Click any entity or unit to open the Object Drawer.

import { affiliationToken } from '@/components/_ontology/affiliation';
import { EntityGlyph } from '@/components/_ontology/entity-glyph';
import {
  type AnyObject,
  type Entity,
  latLonToSvg,
  MAP_BOUNDS,
  MAP_VIEWBOX,
  type Unit,
} from '@/types/ontology';

interface ColMapProps {
  entities: Entity[];
  units: Unit[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}

export function ColMap({ entities, units, selectedId, onSelect }: ColMapProps) {
  return (
    <section className="invert-surface relative h-full overflow-hidden">
      <div className="topo cursor-target relative size-full overflow-hidden">
        <TacticalMap
          entities={entities}
          units={units}
          selectedId={selectedId}
          onSelect={onSelect}
        />

        {/* Scanline overlay — sits above the SVG, below the chrome */}
        <div className="scanline pointer-events-none absolute inset-0 z-[1]" />

        {/* Top-left: layer chips */}
        <div className="absolute left-5 top-5 z-10 flex flex-col gap-1">
          <LayerChip label="Friendly tracks" tone="friendly" active />
          <LayerChip label="Hostile contacts" tone="threat" active />
          <LayerChip label="Unknown / OSINT" tone="warning" active />
          <LayerChip label="RF / SIGINT" tone="muted" />
          <LayerChip label="Terrain shading" tone="muted" />
        </div>

        {/* Top-right: projection card */}
        <div className="border-border bg-card absolute right-5 top-5 z-10 border px-3 py-2">
          <div className="text-muted-foreground label-cap-sm">Projection</div>
          <div className="text-foreground/95 font-mono text-[11px]">
            WGS-84 · UTM 35S
          </div>
          <div className="bg-border my-1.5 h-px" />
          <div className="flex items-center gap-2">
            <div className="bg-foreground/70 h-px w-12" />
            <span className="text-muted-foreground font-mono text-[10px]">
              5&nbsp;NM
            </span>
          </div>
        </div>

        {/* Bottom-left: compass rose (sharp, no rounded) */}
        <div className="absolute bottom-5 left-5 z-10">
          <CompassRose />
        </div>

        {/* Bottom-right: MIL-STD legend */}
        <div className="border-border bg-card absolute bottom-5 right-5 z-10 border px-3 py-2">
          <div className="text-muted-foreground label-cap-sm mb-1.5">
            MIL-STD
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px]">
            <LegendRow tone="friendly" label="FRIEND" />
            <LegendRow tone="hostile" label="HOSTILE" />
            <LegendRow tone="unknown" label="UNKNOWN" />
            <LegendRow tone="neutral" label="NEUTRAL" />
          </div>
        </div>
      </div>
    </section>
  );
}

function LayerChip({
  label,
  tone,
  active = false,
}: {
  label: string;
  tone: 'friendly' | 'threat' | 'warning' | 'muted';
  active?: boolean;
}) {
  const dotClass =
    tone === 'friendly'
      ? 'bg-friendly'
      : tone === 'threat'
        ? 'bg-threat'
        : tone === 'warning'
          ? 'bg-warning'
          : 'bg-muted-foreground/50';
  return (
    <div
      className={[
        'border-border flex w-fit items-center gap-2 border px-2.5 py-1 transition-colors',
        active ? 'bg-card text-foreground' : 'bg-card/50 text-muted-foreground',
      ].join(' ')}
    >
      <span aria-hidden className={`size-1.5 ${dotClass}`} />
      <span className="label-cap-sm">{label}</span>
    </div>
  );
}

function LegendRow({
  tone,
  label,
}: {
  tone: 'friendly' | 'hostile' | 'unknown' | 'neutral';
  label: string;
}) {
  const t = affiliationToken(tone);
  return (
    <div className="flex items-center gap-1.5">
      <svg width="12" height="12">
        {tone === 'friendly' && (
          <rect
            x={1}
            y={3}
            width={10}
            height={6}
            fill="none"
            stroke={t.hsl}
            strokeWidth={1.4}
          />
        )}
        {tone === 'hostile' && (
          <polygon
            points="6,1 11,6 6,11 1,6"
            fill="none"
            stroke={t.hsl}
            strokeWidth={1.4}
          />
        )}
        {tone === 'unknown' && (
          <path
            d="M6 1 C8 1, 11 4, 11 6 C11 8, 8 11, 6 11 C4 11, 1 8, 1 6 C1 4, 4 1, 6 1 Z"
            fill="none"
            stroke={t.hsl}
            strokeWidth={1.4}
          />
        )}
        {tone === 'neutral' && (
          <circle
            cx={6}
            cy={6}
            r={5}
            fill="none"
            stroke={t.hsl}
            strokeWidth={1.4}
          />
        )}
      </svg>
      <span className="text-foreground/85">{label}</span>
    </div>
  );
}

function CompassRose() {
  return (
    <div className="border-border bg-card grid size-16 place-items-center border">
      <svg viewBox="0 0 100 100" className="size-12">
        <g
          transform="translate(50,50)"
          stroke="hsl(38 25% 75% / 0.6)"
          fill="none"
          strokeWidth="0.6"
        >
          <circle r="32" />
          <circle r="22" strokeDasharray="1.5 3" opacity="0.5" />
          {[0, 90, 180, 270].map((a) => (
            <line
              key={a}
              x1="0"
              y1="-32"
              x2="0"
              y2="-29"
              transform={`rotate(${a})`}
              strokeWidth={1.4}
            />
          ))}
        </g>
        <g
          transform="translate(50,50)"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--primary))"
        >
          <polygon points="0,-26 5,0 0,4 -5,0" />
        </g>
        <text
          x="50"
          y="14"
          textAnchor="middle"
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill="hsl(var(--foreground))"
        >
          N
        </text>
      </svg>
    </div>
  );
}

interface TacticalMapProps {
  entities: Entity[];
  units: Unit[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}

function TacticalMap({
  entities,
  units,
  selectedId,
  onSelect,
}: TacticalMapProps) {
  return (
    <svg
      viewBox={`0 0 ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      {/* Hairline grid (10 NM cells) */}
      <g stroke="hsl(38 20% 70% / 0.06)" strokeWidth="0.6">
        {Array.from({ length: 21 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="700" />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 50} x2="1000" y2={i * 50} />
        ))}
      </g>
      {/* Heavier grid every 100 px */}
      <g stroke="hsl(38 20% 70% / 0.12)" strokeWidth="0.7">
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`V${i}`} x1={i * 100} y1="0" x2={i * 100} y2="700" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`H${i}`} x1="0" y1={i * 100} x2="1000" y2={i * 100} />
        ))}
      </g>

      {/* Lat/Lon tick labels (mono, faint) — only inside columns 2..9 to
          avoid corner collisions with chrome */}
      <g
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="hsl(38 18% 60% / 0.6)"
      >
        {[200, 300, 400, 500, 600, 700, 800].map((x) => {
          const lon =
            MAP_BOUNDS.lon_min +
            (x / MAP_VIEWBOX.w) * (MAP_BOUNDS.lon_max - MAP_BOUNDS.lon_min);
          return (
            <text key={`tx${x}`} x={x + 4} y={11}>
              {lon.toFixed(2)}°E
            </text>
          );
        })}
        {[200, 300, 400, 500].map((y) => {
          const lat =
            MAP_BOUNDS.lat_max -
            (y / MAP_VIEWBOX.h) * (MAP_BOUNDS.lat_max - MAP_BOUNDS.lat_min);
          return (
            <text key={`ty${y}`} x={4} y={y + 12}>
              {lat.toFixed(2)}°N
            </text>
          );
        })}
      </g>

      {/* Topographic contour curves */}
      <g fill="none" stroke="hsl(28 40% 65% / 0.18)" strokeWidth="1.1">
        <path d="M -20 220 Q 180 160, 360 240 T 760 200 T 1020 260" />
        <path
          d="M -20 280 Q 180 230, 360 310 T 760 270 T 1020 330"
          strokeWidth="0.9"
          opacity="0.65"
        />
        <path
          d="M -20 340 Q 180 310, 360 380 T 760 350 T 1020 410"
          strokeWidth="0.7"
          opacity="0.5"
        />
      </g>

      {/* Coastline */}
      <path
        d="M -20 460 C 80 420, 220 480, 320 440 S 540 470, 660 430 S 880 450, 1020 410"
        fill="none"
        stroke="hsl(38 25% 78% / 0.55)"
        strokeWidth="1.4"
      />
      <path
        d="M -20 460 C 80 420, 220 480, 320 440 S 540 470, 660 430 S 880 450, 1020 410 L 1020 720 L -20 720 Z"
        fill="hsl(210 50% 28% / 0.08)"
      />

      {/* Place labels — italic serif, only used very sparingly */}
      <g
        fontFamily="var(--font-serif)"
        fontStyle="italic"
        fill="hsl(38 25% 75% / 0.55)"
      >
        <text x="190" y="180" fontSize="14">
          Limnos
        </text>
        <text x="640" y="170" fontSize="14">
          Imbros
        </text>
        <text x="380" y="600" fontSize="13">
          Aegean Sea
        </text>
      </g>

      {/* Tracks: friendly + threat (dashed gradients). Hand-authored
          to match the fixture entity positions. */}
      <defs>
        <linearGradient id="trackFriendly" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="hsl(var(--friendly))" stopOpacity="0" />
          <stop
            offset="100%"
            stopColor="hsl(var(--friendly))"
            stopOpacity="0.85"
          />
        </linearGradient>
        <linearGradient id="trackThreat" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="hsl(var(--threat))" stopOpacity="0" />
          <stop
            offset="100%"
            stopColor="hsl(var(--threat))"
            stopOpacity="0.9"
          />
        </linearGradient>
      </defs>

      {/* Threat track approaching from NE */}
      <path
        d="M 800 80 Q 720 130, 660 170 T 580 210"
        fill="none"
        stroke="url(#trackThreat)"
        strokeWidth="1.6"
        strokeDasharray="2 3"
      />

      {/* Render units (friendly) */}
      {units.map((u) => {
        const { x, y } = latLonToSvg(u.position);
        const isSelected = selectedId === u._id;
        return (
          <g
            key={u._id}
            onClick={() => onSelect(u)}
            style={{ cursor: 'pointer' }}
          >
            <EntityGlyph
              affiliation="friendly"
              shape={
                u._subtype === 'drone'
                  ? 'air'
                  : u._subtype === 'boat'
                    ? 'sea'
                    : u._subtype === 'infantry'
                      ? 'person'
                      : 'ground'
              }
              cx={x}
              cy={y}
              heading_deg={u.heading_deg}
              size={14}
            />
            <text
              x={x + 12}
              y={y - 4}
              fontFamily="var(--font-mono)"
              fontSize="10"
              fontWeight="700"
              fill="hsl(var(--friendly))"
            >
              {u.callsign}
            </text>
            <text
              x={x + 12}
              y={y + 8}
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="hsl(var(--muted-foreground))"
            >
              {u.heading_deg ?? 0}° · {u.speed_mps ?? 0}m/s
            </text>
            {isSelected && <SelectionBracket cx={x} cy={y} size={28} />}
          </g>
        );
      })}

      {/* Render entities (hostile / unknown) */}
      {entities.map((e) => {
        const { x, y } = latLonToSvg(e.position);
        const isSelected = selectedId === e._id;
        const shape: 'air' | 'ground' | 'sea' | 'person' =
          e._subtype === 'Aircraft'
            ? 'air'
            : e._subtype === 'Vessel'
              ? 'sea'
              : e._subtype === 'Person'
                ? 'person'
                : 'ground';
        return (
          <g
            key={e._id}
            onClick={() => onSelect(e)}
            style={{ cursor: 'pointer' }}
          >
            {/* Pulse-ring on hostile selected */}
            {isSelected && e.affiliation === 'hostile' && (
              <circle
                cx={x}
                cy={y}
                r="22"
                className="pulse-ring"
                fill="hsl(var(--threat) / 0.22)"
                stroke="hsl(var(--threat) / 0.6)"
                strokeWidth="1"
              />
            )}
            <EntityGlyph
              affiliation={e.affiliation}
              shape={shape}
              cx={x}
              cy={y}
              heading_deg={e.heading_deg}
              size={14}
            />
            <text
              x={x + 12}
              y={y - 4}
              fontFamily="var(--font-mono)"
              fontSize="10"
              fontWeight="700"
              fill={
                e.affiliation === 'hostile'
                  ? 'hsl(var(--threat))'
                  : 'hsl(var(--warning))'
              }
            >
              {e.name ?? e._id}
            </text>
            {(e.altitude_m || e.speed_mps) && (
              <text
                x={x + 12}
                y={y + 8}
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                {e.altitude_m ? `${e.altitude_m}m · ` : ''}
                {e.speed_mps ? `${e.speed_mps}m/s` : ''}
              </text>
            )}
            {isSelected && <SelectionBracket cx={x} cy={y} size={28} />}
          </g>
        );
      })}
    </svg>
  );
}

// 4-corner SVG bracket reticle around a selected entity glyph.
function SelectionBracket({
  cx,
  cy,
  size = 24,
}: {
  cx: number;
  cy: number;
  size?: number;
}) {
  const r = size / 2;
  const arm = 5;
  const stroke = 'hsl(var(--primary))';
  return (
    <g stroke={stroke} strokeWidth="1.5" fill="none">
      {/* TL */}
      <line x1={cx - r} y1={cy - r} x2={cx - r + arm} y2={cy - r} />
      <line x1={cx - r} y1={cy - r} x2={cx - r} y2={cy - r + arm} />
      {/* TR */}
      <line x1={cx + r} y1={cy - r} x2={cx + r - arm} y2={cy - r} />
      <line x1={cx + r} y1={cy - r} x2={cx + r} y2={cy - r + arm} />
      {/* BL */}
      <line x1={cx - r} y1={cy + r} x2={cx - r + arm} y2={cy + r} />
      <line x1={cx - r} y1={cy + r} x2={cx - r} y2={cy + r - arm} />
      {/* BR */}
      <line x1={cx + r} y1={cy + r} x2={cx + r - arm} y2={cy + r} />
      <line x1={cx + r} y1={cy + r} x2={cx + r} y2={cy + r - arm} />
    </g>
  );
}
