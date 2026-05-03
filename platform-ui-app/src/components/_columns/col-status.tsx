'use client';

// Column 2 (25%) — mission status. The "what we know" surface.
// Vertical stack: MissionObjective banner, asset roster (stoplight
// tri-state), threat list, change feed. Tabular density. No cards
// around cards — just hairline-divided sections.

import { affiliationToken } from '@/components/_ontology/affiliation';
import type {
  AnyObject,
  Entity,
  Event,
  MissionObjective,
  Unit,
} from '@/types/ontology';

interface ColStatusProps {
  objective: MissionObjective;
  units: Unit[];
  entities: Entity[];
  events: Event[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}

export function ColStatus({
  objective,
  units,
  entities,
  events,
  selectedId,
  onSelect,
}: ColStatusProps) {
  const hostiles = entities.filter((e) => e.affiliation === 'hostile');
  const unknowns = entities.filter((e) => e.affiliation === 'unknown');

  return (
    <aside className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      {/* Objective banner */}
      <ObjectiveBanner objective={objective} onSelect={onSelect} />

      {/* Asset roster */}
      <Section title="Assets" meta={`${units.length} on roster`}>
        <ul className="divide-border divide-y">
          {units.map((u) => (
            <UnitRow
              key={u._id}
              unit={u}
              selected={selectedId === u._id}
              onSelect={() => onSelect(u)}
            />
          ))}
        </ul>
      </Section>

      {/* Threat list */}
      <Section
        title="Contacts"
        meta={`${hostiles.length} hostile · ${unknowns.length} unknown`}
      >
        <ul className="divide-border divide-y">
          {[...hostiles, ...unknowns].map((e) => (
            <ContactRow
              key={e._id}
              entity={e}
              selected={selectedId === e._id}
              onSelect={() => onSelect(e)}
            />
          ))}
        </ul>
      </Section>

      {/* Change feed — fills remaining space, scrolls */}
      <Section title="What changed." meta={`Last 10m · ${events.length}`} fill>
        <ol className="px-3 py-1">
          {events.map((e, i) => (
            <FeedRow
              key={e._id}
              event={e}
              fresh={i === 0}
              onSelect={() => onSelect(e)}
            />
          ))}
        </ol>
      </Section>
    </aside>
  );
}

function Section({
  title,
  meta,
  children,
  fill = false,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  fill?: boolean;
}) {
  return (
    <section
      className={[
        'border-border border-b',
        fill ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'shrink-0',
      ].join(' ')}
    >
      <div className="border-border bg-muted/30 flex shrink-0 items-baseline justify-between border-b px-4 py-1.5">
        <h2 className="text-foreground/90 label-cap">{title}</h2>
        {meta ? (
          <span className="text-muted-foreground/80 font-mono text-[10px]">
            {meta}
          </span>
        ) : null}
      </div>
      <div className={fill ? 'min-h-0 flex-1 overflow-y-auto' : ''}>
        {children}
      </div>
    </section>
  );
}

function ObjectiveBanner({
  objective,
  onSelect,
}: {
  objective: MissionObjective;
  onSelect: (o: AnyObject) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(objective)}
      className="border-border bg-card hover:bg-secondary group flex w-full shrink-0 flex-col items-start gap-1 border-b px-4 py-3 text-left transition-colors"
    >
      <div className="flex w-full items-baseline justify-between">
        <span className="text-muted-foreground label-cap-sm">Objective</span>
        <span className="text-primary font-mono text-[10px]">
          {objective.priority}
        </span>
      </div>
      <span className="text-foreground font-serif text-[18px] italic leading-tight tracking-tight">
        {objective.title}
      </span>
      <span className="text-muted-foreground font-mono text-[10px]">
        {objective.status.toUpperCase()} · DUE&nbsp;
        {objective.deadline?.split('T')[1]?.slice(0, 5)}Z
      </span>
    </button>
  );
}

function UnitRow({
  unit,
  selected,
  onSelect,
}: {
  unit: Unit;
  selected: boolean;
  onSelect: () => void;
}) {
  const dot =
    unit.health === 'healthy'
      ? 'bg-success'
      : unit.health === 'limited'
        ? 'bg-warning'
        : 'bg-threat';
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={[
          'group hover:bg-secondary flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
          selected ? 'bg-secondary' : '',
        ].join(' ')}
      >
        <span aria-hidden className={`size-1.5 ${dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-foreground font-mono text-[12px] font-bold">
              {unit.callsign}
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              {unit.status.toUpperCase()}
            </span>
          </div>
          <div className="text-muted-foreground/80 font-mono text-[10px]">
            {unit.battery_pct !== undefined
              ? `BAT ${unit.battery_pct}% · `
              : ''}
            {unit.fuel_pct !== undefined ? `FUEL ${unit.fuel_pct}% · ` : ''}
            {unit.heading_deg ?? 0}° · {unit.speed_mps ?? 0}m/s
          </div>
        </div>
      </button>
    </li>
  );
}

function ContactRow({
  entity,
  selected,
  onSelect,
}: {
  entity: Entity;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = affiliationToken(entity.affiliation);
  const threatColor =
    entity.threat_level === 'high'
      ? 'text-threat'
      : entity.threat_level === 'med'
        ? 'text-warning'
        : 'text-muted-foreground';
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={[
          'group hover:bg-secondary flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
          selected ? 'bg-secondary' : '',
        ].join(' ')}
      >
        <svg width="14" height="14" className="shrink-0">
          {entity.affiliation === 'hostile' && (
            <polygon
              points="7,1 13,7 7,13 1,7"
              fill="none"
              stroke={tone.hsl}
              strokeWidth={1.4}
            />
          )}
          {entity.affiliation === 'unknown' && (
            <path
              d="M7 1 C9 1, 13 5, 13 7 C13 9, 9 13, 7 13 C5 13, 1 9, 1 7 C1 5, 5 1, 7 1 Z"
              fill="none"
              stroke={tone.hsl}
              strokeWidth={1.4}
            />
          )}
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-foreground font-mono text-[12px] font-bold">
              {entity.name ?? entity._id}
            </span>
            <span className={`font-mono text-[10px] ${threatColor}`}>
              {entity.threat_level.toUpperCase()}
            </span>
          </div>
          <div className="text-muted-foreground/80 font-mono text-[10px]">
            {entity._subtype} · CONF&nbsp;{(entity.confidence * 100).toFixed(0)}
            %
          </div>
        </div>
      </button>
    </li>
  );
}

function FeedRow({
  event,
  fresh,
  onSelect,
}: {
  event: Event;
  fresh?: boolean;
  onSelect: () => void;
}) {
  const dotColor =
    event.severity === 'critical'
      ? 'bg-threat'
      : event.severity === 'warn'
        ? 'bg-warning'
        : 'bg-muted-foreground/60';
  const verbColor =
    event.severity === 'critical'
      ? 'text-threat'
      : event.severity === 'warn'
        ? 'text-warning'
        : 'text-foreground';

  return (
    <li
      className={[
        'border-border/60 group border-b last:border-b-0',
        fresh ? 'feed-enter' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onSelect}
        className="hover:bg-secondary flex w-full items-baseline gap-2 py-2 pl-3 pr-1 text-left transition-colors"
      >
        <span className={`mt-1 size-1.5 shrink-0 ${dotColor}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-foreground/95 text-[12px] leading-snug">
            <span
              className={`mr-1.5 font-serif text-[14px] italic ${verbColor}`}
            >
              {event.verb ?? event._subtype}
            </span>
            {event.description}
          </p>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[10px]">
            <span className="font-mono">
              {event._observed_at.split('T')[1]?.slice(0, 8)}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="font-mono">{event._source}</span>
          </div>
        </div>
      </button>
    </li>
  );
}
