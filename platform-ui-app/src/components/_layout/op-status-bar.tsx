'use client';

// Bloomberg-density operational status bar. Single dense mono row,
// no logo, no avatar. Pure tabular telemetry — UTC + Zulu, comms,
// mission ID, sensor count, threat count. Tightly-packed and the
// only typographic vocabulary is mono + label-cap.

import { Crosshair } from 'lucide-react';

interface OpStatusBarProps {
  missionId: string;
  utcTime: string; // "14:23:47Z"
  missionElapsed: string; // "T+02:14:09"
  commsLatencyMs: number;
  edgeState: 'synced' | 'degraded' | 'severed';
  sensorCount: number;
  threatCount: number;
  unitCount: number;
}

export function OpStatusBar(props: OpStatusBarProps) {
  const {
    missionId,
    utcTime,
    missionElapsed,
    commsLatencyMs,
    edgeState,
    sensorCount,
    threatCount,
    unitCount,
  } = props;

  const edgeColor =
    edgeState === 'synced'
      ? 'text-success'
      : edgeState === 'degraded'
        ? 'text-warning'
        : 'text-threat';

  const edgeDot =
    edgeState === 'synced'
      ? 'bg-success'
      : edgeState === 'degraded'
        ? 'bg-warning'
        : 'bg-threat';

  return (
    <header className="border-border bg-background relative z-30 flex h-9 shrink-0 items-stretch border-b">
      {/* Brand corner notch — minimal, monogram + version. */}
      <div className="border-border flex w-[200px] items-center gap-2 border-r px-3">
        <div
          aria-hidden
          className="bg-primary text-primary-foreground grid size-5 place-items-center rounded-[1px]"
        >
          <Crosshair className="size-3" strokeWidth={2.4} />
        </div>
        <span className="label-cap text-foreground/80">
          Mission&nbsp;Commander
        </span>
        <span className="text-muted-foreground/50 font-mono text-[10px]">
          v0
        </span>
      </div>

      {/* Status rail — left to right, dense, mono. */}
      <div className="divide-border flex flex-1 items-center divide-x">
        <Cell label="Op" value={missionId} mono />
        <Cell label="UTC" value={utcTime} mono />
        <Cell label="Elapsed" value={missionElapsed} mono />
        <Cell label="Lat" value="38.71°N" mono />
        <Cell label="Lon" value="23.50°E" mono />
        <Cell
          label="Edge"
          value={edgeState.toUpperCase()}
          mono
          dot={edgeDot}
          valueClass={edgeColor}
        />
        <Cell label="Comms" value={`${commsLatencyMs}ms`} mono />
        <Cell label="Units" value={`${unitCount}`} mono />
        <Cell
          label="Threats"
          value={`${threatCount}`}
          mono
          valueClass={threatCount > 0 ? 'text-threat' : ''}
        />
        <Cell label="Sensors" value={`${sensorCount}`} mono />
      </div>

      {/* Right rail — fix nothing more. The status bar IS the chrome. */}
      <div className="border-border flex items-center border-l px-3">
        <span className="text-muted-foreground/70 font-mono text-[10px]">
          ROE&nbsp;<span className="text-foreground/85">P1</span>
        </span>
      </div>
    </header>
  );
}

function Cell({
  label,
  value,
  mono,
  dot,
  valueClass,
}: {
  label: string;
  value: string;
  mono?: boolean;
  dot?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1">
      {dot ? <span aria-hidden className={`size-1.5 ${dot}`} /> : null}
      <span className="text-muted-foreground/70 label-cap-sm">{label}</span>
      <span
        className={`text-foreground ${mono ? 'font-mono text-[11px]' : 'text-[12px]'} ${valueClass ?? ''}`}
      >
        {value}
      </span>
    </div>
  );
}
