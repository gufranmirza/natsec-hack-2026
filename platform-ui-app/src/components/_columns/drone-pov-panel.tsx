'use client';

import { useEffect, useMemo, useState } from 'react';
import { Crosshair, X } from 'lucide-react';

import type { Unit } from '@/types/ontology';

const POV_ZOOM = 16;
const TILE_SIZE = 256;
const TILE_HOST =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';

const CAMERA_CAPABILITIES = new Set(['optical', 'eo', 'ir']);

export function hasCameraCapability(unit: Unit): boolean {
  return unit.capabilities.some((c) => CAMERA_CAPABILITIES.has(c));
}

const DRONE_SUBTYPES = new Set<Unit['_subtype']>([
  'drone',
  'drone_isr',
  'drone_strike',
]);

export function isDroneUnit(unit: Unit): boolean {
  return DRONE_SUBTYPES.has(unit._subtype);
}

function tileFromLatLon(lat: number, lon: number, zoom: number) {
  const n = 2 ** zoom;
  const xCont = ((lon + 180) / 360) * n;
  const sin = Math.sin((lat * Math.PI) / 180);
  const yCont = ((1 - Math.log((1 + sin) / (1 - sin)) / (2 * Math.PI)) / 2) * n;
  const tileX = Math.floor(xCont);
  const tileY = Math.floor(yCont);
  const fracX = (xCont - tileX) * TILE_SIZE;
  const fracY = (yCont - tileY) * TILE_SIZE;
  return { tileX, tileY, fracX, fracY };
}

// DroneCameraView — the inline satellite-tile EO/IR camera viewport.
// Renders a real-world basemap projected through a perspective transform
// (looking forward from the drone), with crosshair, vignette, scanline
// noise, and HUD overlays for lat/lon/alt/heading. No chrome — the
// caller controls header / footer / sizing.
export function DroneCameraView({
  unit,
  className,
}: {
  unit: Unit;
  className?: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 120);
    return () => window.clearInterval(id);
  }, []);

  const tiles = useMemo(() => {
    const { tileX, tileY, fracX, fracY } = tileFromLatLon(
      unit.position[0],
      unit.position[1],
      POV_ZOOM
    );
    const grid: { key: string; src: string; left: number; top: number }[] = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        grid.push({
          key: `${dx}_${dy}`,
          src: `${TILE_HOST}/${POV_ZOOM}/${tileY + dy}/${tileX + dx}`,
          left: dx * TILE_SIZE - fracX,
          top: dy * TILE_SIZE - fracY,
        });
      }
    }
    return grid;
  }, [unit.position]);

  const heading = unit.heading_deg ?? 0;
  const altitude = unit.altitude_m ?? 0;
  const speed = unit.speed_mps ?? 0;
  const isMoving = speed > 0.5;
  const driftPx = isMoving ? ((tick * speed) / 12) % 64 : 0;
  const lat = unit.position[0];
  const lon = unit.position[1];

  return (
    <div
      className={[
        'relative overflow-hidden bg-[hsl(220_25%_8%)]',
        className ?? '',
      ].join(' ')}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, hsl(210 60% 30%) 0%, hsl(210 25% 22%) 38%, hsl(120 18% 26%) 42%, hsl(40 24% 24%) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ perspective: '700px', perspectiveOrigin: '50% 70%' }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `rotateX(55deg) rotate(${-heading}deg) translateY(${driftPx}px)`,
            transformOrigin: '50% 50%',
            transformStyle: 'preserve-3d',
          }}
        >
          {tiles.map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={tile.key}
              src={tile.src}
              alt=""
              draggable={false}
              className="absolute"
              style={{
                left: `calc(50% + ${tile.left}px)`,
                top: `calc(50% + ${tile.top}px)`,
                width: `${TILE_SIZE}px`,
                height: `${TILE_SIZE}px`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[hsl(210_60%_55%/0.35)] via-transparent to-[hsl(220_30%_4%/0.55)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,hsl(220_30%_3%/0.65)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,hsl(0_0%_100%/0.025)_3px,hsl(0_0%_100%/0.025)_4px)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 opacity-70">
        <span className="bg-primary absolute left-1/2 top-0 h-2 w-px -translate-x-1/2" />
        <span className="bg-primary absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2" />
        <span className="bg-primary absolute left-0 top-1/2 h-px w-2 -translate-y-1/2" />
        <span className="bg-primary absolute right-0 top-1/2 h-px w-2 -translate-y-1/2" />
        <span className="bg-primary absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      </div>
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
        <span>{unit.callsign} · EO · gimbal -25°</span>
        <span>REC · 1080p · {isMoving ? 'tracking' : 'idle'}</span>
      </div>
      <div className="pointer-events-none absolute inset-x-2 bottom-2 grid grid-cols-3 gap-2 font-mono text-[10px] text-white/95 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
        <span className="truncate">
          {lat.toFixed(4)}°N {lon.toFixed(4)}°E
        </span>
        <span className="text-center">ALT {Math.round(altitude)} m</span>
        <span className="text-right">
          HDG {String(Math.round(heading)).padStart(3, '0')}°
        </span>
      </div>
    </div>
  );
}

export function DronePovPanel({
  unit,
  onClose,
}: {
  unit: Unit;
  onClose: () => void;
}) {
  const speed = unit.speed_mps ?? 0;
  const isMoving = speed > 0.5;
  return (
    <div className="border-border bg-card/95 absolute bottom-3 left-1/2 z-40 w-[380px] -translate-x-1/2 border backdrop-blur">
      <div className="border-border flex items-center justify-between gap-3 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Crosshair className="text-primary size-3.5 shrink-0" />
          <span className="text-foreground truncate font-mono text-[11px] font-bold">
            {unit.callsign} · ISR
          </span>
          <span className="text-muted-foreground font-mono text-[9px] uppercase tracking-wider">
            {isMoving ? 'moving cam' : 'static cam'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="bg-success/20 text-success border-success/40 border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider">
            LIVE
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close drone POV"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <DroneCameraView unit={unit} className="h-[240px]" />
      <div className="border-border bg-muted/30 flex items-center justify-between border-t px-3 py-1.5 font-mono text-[9px]">
        <span className="text-muted-foreground truncate">
          {unit.capabilities.length > 0
            ? unit.capabilities.join(' · ').toUpperCase()
            : '—'}
        </span>
        <span className="text-muted-foreground shrink-0">
          BAT {unit.battery_pct ?? '—'}% · {Math.round(speed)} m/s
        </span>
      </div>
    </div>
  );
}
