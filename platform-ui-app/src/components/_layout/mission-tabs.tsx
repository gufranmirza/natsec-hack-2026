'use client';

// Chrome-style mission tabs. Each tab = one MissionObjective.
// The active tab drives every per-mission surface below. Tabs are
// square-edged (consistent with the sharp-corner system), have a
// 2px top stripe in the mission's status color, an Op ID in mono
// small caps, a compact mission name, and a close button on hover.

import { Plus, X } from 'lucide-react';

import type { MissionObjective } from '@/types/ontology';

interface MissionTabsProps {
  missions: MissionObjective[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  onNew?: () => void;
}

export function MissionTabs({
  missions,
  activeId,
  onSelect,
  onClose,
  onNew,
}: MissionTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Open missions"
      className="bg-muted border-border flex h-9 shrink-0 items-stretch border-b"
    >
      <ol className="flex flex-1 items-stretch overflow-x-auto">
        {missions.map((m) => (
          <MissionTab
            key={m._id}
            mission={m}
            active={m._id === activeId}
            onSelect={() => onSelect(m._id)}
            onClose={onClose ? () => onClose(m._id) : undefined}
          />
        ))}
        <li className="flex items-stretch">
          <button
            type="button"
            onClick={onNew}
            aria-label="Open new mission"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground flex w-9 items-center justify-center transition-colors"
          >
            <Plus className="size-3.5" />
          </button>
        </li>
      </ol>
      <div className="text-muted-foreground/70 flex items-center pl-2 pr-3 font-mono text-[10px]">
        {missions.length} OPS
      </div>
    </div>
  );
}

function MissionTab({
  mission,
  active,
  onSelect,
  onClose,
}: {
  mission: MissionObjective;
  active: boolean;
  onSelect: () => void;
  onClose?: () => void;
}) {
  const stripe = statusStripe(mission.status);
  const dot = statusDot(mission.status);

  return (
    <li
      className={[
        'group border-border relative flex min-w-[180px] max-w-[260px] items-stretch border-r transition-colors',
        active
          ? 'bg-background'
          : 'bg-muted hover:bg-secondary text-muted-foreground',
      ].join(' ')}
    >
      {/* Top stripe — visible on active tab; wider on hover for inactive. */}
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 ${active ? 'h-[2px] opacity-100' : 'h-px opacity-60 group-hover:opacity-90'}`}
        style={{ backgroundColor: stripe }}
      />
      <button
        type="button"
        onClick={onSelect}
        role="tab"
        aria-selected={active}
        className="flex flex-1 items-center gap-2 truncate pl-3 pr-2 text-left"
      >
        <span aria-hidden className={`size-1.5 shrink-0 ${dot}`} />
        <span
          className={`shrink-0 rounded-sm border px-1 py-px font-mono text-[9px] uppercase tracking-wide ${
            mission.priority === 'P0'
              ? 'border-threat/50 text-threat'
              : mission.priority === 'P1'
                ? 'border-warning/50 text-warning'
                : 'border-muted-foreground/40 text-muted-foreground'
          }`}
        >
          {mission.priority}
        </span>
        <span
          className={`truncate font-mono text-[11px] ${active ? 'text-foreground font-bold' : ''}`}
        >
          {mission.title}
        </span>
      </button>
      {onClose ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label={`Close ${mission.title}`}
          className={[
            'text-muted-foreground hover:bg-card hover:text-foreground flex w-7 items-center justify-center opacity-0 transition-opacity',
            active ? 'opacity-60 hover:opacity-100' : 'group-hover:opacity-60',
          ].join(' ')}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </li>
  );
}

function statusStripe(status: MissionObjective['status']): string {
  switch (status) {
    case 'active':
      return 'hsl(var(--success))';
    case 'open':
      return 'hsl(var(--warning))';
    case 'completed':
      return 'hsl(var(--muted-foreground))';
    case 'cancelled':
      return 'hsl(var(--threat))';
  }
}

function statusDot(status: MissionObjective['status']): string {
  switch (status) {
    case 'active':
      return 'bg-success';
    case 'open':
      return 'bg-warning';
    case 'completed':
      return 'bg-muted-foreground';
    case 'cancelled':
      return 'bg-threat';
  }
}
