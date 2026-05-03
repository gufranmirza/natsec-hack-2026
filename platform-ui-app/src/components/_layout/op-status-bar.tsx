'use client';

import { Crosshair } from 'lucide-react';

import type { MissionObjective } from '@/types/ontology';

interface OpStatusBarProps {
  missions: MissionObjective[];
  activeId: string;
  onMissionSelect: (id: string) => void;
  missionId: string;
  utcTime: string;
  missionElapsed: string;
  commsLatencyMs: number;
  edgeState: 'synced' | 'degraded' | 'severed';
  sensorCount: number;
  threatCount: number;
  unitCount: number;
}

export function OpStatusBar(props: OpStatusBarProps) {
  const {
    missions,
    activeId,
    onMissionSelect,
    missionId,
    utcTime,
    missionElapsed,
    commsLatencyMs,
    edgeState,
    sensorCount,
    threatCount,
    unitCount,
  } = props;

  const edgeTone =
    edgeState === 'synced'
      ? 'text-success'
      : edgeState === 'degraded'
        ? 'text-warning'
        : 'text-threat';

  return (
    <header className="border-border bg-background relative z-30 flex h-10 shrink-0 items-stretch border-b">
      <div className="border-border flex w-[168px] shrink-0 items-center gap-2 border-r px-2.5">
        <div
          aria-hidden
          className="bg-foreground text-background grid size-5 place-items-center"
        >
          <Crosshair className="size-3" strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <div className="text-foreground font-mono text-[11px] font-bold leading-none">
            EDGE C2
          </div>
          <div className="text-muted-foreground mt-0.5 font-mono text-[9px] leading-none">
            ISR TASKING
          </div>
        </div>
      </div>

      <nav
        aria-label="Mission workspaces"
        className="border-border flex w-[390px] shrink-0 items-stretch border-r"
      >
        {missions.slice(0, 3).map((mission) => {
          const active = mission._id === activeId;
          return (
            <button
              key={mission._id}
              type="button"
              onClick={() => onMissionSelect(mission._id)}
              className={[
                'border-border flex min-w-0 flex-1 items-center justify-center border-r px-2 text-center transition-colors last:border-r-0',
                active
                  ? 'bg-foreground text-background'
                  : 'bg-muted/40 text-muted-foreground hover:bg-secondary hover:text-foreground',
              ].join(' ')}
            >
              <span className="truncate font-mono text-[10px] font-semibold">
                {mission._source_ref ?? mission.title}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="divide-border grid min-w-0 flex-1 grid-cols-8 divide-x">
        <Cell label="Op" value={missionId} />
        <Cell label="UTC" value={utcTime} />
        <Cell label="Elapsed" value={missionElapsed} />
        <Cell
          label="Edge"
          value={edgeState.toUpperCase()}
          valueClass={edgeTone}
        />
        <Cell label="Comms" value={`${commsLatencyMs}ms`} />
        <Cell label="Units" value={`${unitCount}`} />
        <Cell
          label="Contacts"
          value={`${threatCount}`}
          valueClass={threatCount > 0 ? 'text-threat' : undefined}
        />
        <Cell label="Feeds" value={`${sensorCount}`} />
      </div>
    </header>
  );
}

function Cell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center px-2">
      <span className="text-muted-foreground label-cap-sm truncate">
        {label}
      </span>
      <span
        className={`text-foreground truncate font-mono text-[11px] ${valueClass ?? ''}`}
      >
        {value}
      </span>
    </div>
  );
}
