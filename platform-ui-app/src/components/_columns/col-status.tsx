'use client';

import {
  Brain,
  CheckCircle2,
  Database,
  FileStack,
  Network,
  Plane,
  Radio,
  Satellite,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';

import { affiliationToken } from '@/components/_ontology/affiliation';
import type {
  AnyObject,
  Entity,
  Event,
  MissionObjective,
  Report,
  Unit,
} from '@/types/ontology';

export type WorkspaceSectionId =
  | 'awareness'
  | 'drone_ops'
  | 'integrations'
  | 'objects'
  | 'planning'
  | 'intelligence';

interface ColStatusProps {
  workspace: WorkspaceSectionId;
  objective: MissionObjective;
  units: Unit[];
  entities: Entity[];
  events: Event[];
  reports: Report[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
  onLaunchDrone: (unitId: string) => void;
  onLaunchSwarm: () => void;
  onInjectFeed: (source: string) => void;
  onGeneratePlan: () => void;
}

const DATA_SOURCES = [
  {
    id: 'radio',
    title: 'Radio traffic',
    meta: 'TAC-3 speech-to-text',
    state: 'live',
    icon: Radio,
  },
  {
    id: 'satellite',
    title: 'Satellite change',
    meta: 'thermal + scar detection',
    state: 'queued',
    icon: Satellite,
  },
  {
    id: 'intel',
    title: 'Intel reports',
    meta: 'entity extraction',
    state: 'live',
    icon: FileStack,
  },
  {
    id: 'social',
    title: 'Public OSINT',
    meta: 'geotag + credibility',
    state: 'degraded',
    icon: Network,
  },
  {
    id: 'allies',
    title: 'Allied comms',
    meta: 'radar liaison feed',
    state: 'live',
    icon: ShieldCheck,
  },
  {
    id: 'drone_video',
    title: 'Drone video',
    meta: 'EO/IR tracklets',
    state: 'live',
    icon: Plane,
  },
];

export function ColStatus({
  workspace,
  objective,
  units,
  entities,
  events,
  reports,
  selectedId,
  onSelect,
  onLaunchDrone,
  onLaunchSwarm,
  onInjectFeed,
  onGeneratePlan,
}: ColStatusProps) {
  return (
    <aside className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <WorkspaceHeader workspace={workspace} />
      {workspace === 'awareness' ? (
        <AwarenessPanel
          objective={objective}
          units={units}
          entities={entities}
          events={events}
          reports={reports}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ) : null}
      {workspace === 'drone_ops' ? (
        <DroneOpsPanel
          units={units}
          selectedId={selectedId}
          onSelect={onSelect}
          onLaunchDrone={onLaunchDrone}
          onLaunchSwarm={onLaunchSwarm}
        />
      ) : null}
      {workspace === 'integrations' ? (
        <IntegrationsPanel
          reports={reports}
          events={events}
          onSelect={onSelect}
          onInjectFeed={onInjectFeed}
        />
      ) : null}
      {workspace === 'objects' ? (
        <ObjectsPanel
          units={units}
          entities={entities}
          reports={reports}
          events={events}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ) : null}
      {workspace === 'planning' ? (
        <PlanningPanel objective={objective} onGeneratePlan={onGeneratePlan} />
      ) : null}
      {workspace === 'intelligence' ? (
        <IntelligencePanel
          entities={entities}
          reports={reports}
          events={events}
          onInjectFeed={onInjectFeed}
        />
      ) : null}
    </aside>
  );
}

function WorkspaceHeader({ workspace }: { workspace: WorkspaceSectionId }) {
  const label =
    workspace === 'awareness'
      ? 'Situational awareness'
      : workspace === 'drone_ops'
        ? 'Drone operations'
        : workspace === 'integrations'
          ? 'Data integrations'
          : workspace === 'objects'
            ? 'Object management'
            : workspace === 'planning'
              ? 'Mission planning'
              : 'AI intelligence';
  const Icon =
    workspace === 'awareness'
      ? Waypoints
      : workspace === 'drone_ops'
        ? Plane
        : workspace === 'integrations'
          ? Database
          : workspace === 'objects'
            ? Network
            : workspace === 'planning'
              ? FileStack
              : Brain;

  return (
    <div className="border-border bg-card flex shrink-0 items-center gap-2 border-b px-3 py-2">
      <Icon className="text-primary size-4" />
      <div className="min-w-0">
        <div className="label-cap-sm text-muted-foreground">Section</div>
        <div className="text-foreground truncate font-mono text-[12px] font-bold">
          {label}
        </div>
      </div>
    </div>
  );
}

function AwarenessPanel({
  objective,
  units,
  entities,
  events,
  reports,
  selectedId,
  onSelect,
}: {
  objective: MissionObjective;
  units: Unit[];
  entities: Entity[];
  events: Event[];
  reports: Report[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}) {
  const hostiles = entities.filter((e) => e.affiliation === 'hostile');
  const unknowns = entities.filter((e) => e.affiliation === 'unknown');
  const osintReports = reports.filter((report) => report._subtype === 'osint');

  return (
    <>
      <ObjectiveBanner objective={objective} onSelect={onSelect} />
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
      <Section title="OSINT" meta={`${osintReports.length} public cue`}>
        <ReportList reports={osintReports} onSelect={onSelect} />
      </Section>
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
    </>
  );
}

function DroneOpsPanel({
  units,
  selectedId,
  onSelect,
  onLaunchDrone,
  onLaunchSwarm,
}: {
  units: Unit[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
  onLaunchDrone: (unitId: string) => void;
  onLaunchSwarm: () => void;
}) {
  const drones = units.filter((unit) => unit._subtype === 'drone');

  return (
    <>
      <Section title="Command" meta="human approved">
        <div className="grid gap-2 p-3">
          <ActionButton
            label="Launch ROOK-1"
            meta="overwatch BOGEY-7 · stand-off"
            onClick={() => onLaunchDrone('unit_rook1')}
          />
          <ActionButton
            label="Coordinate swarm"
            meta="ROOK-1 overwatch · ROOK-2 flank"
            onClick={onLaunchSwarm}
          />
        </div>
      </Section>
      <Section title="Fleet" meta={`${drones.length} aircraft`}>
        <ul className="divide-border divide-y">
          {drones.map((unit) => (
            <UnitRow
              key={unit._id}
              unit={unit}
              selected={selectedId === unit._id}
              onSelect={() => onSelect(unit)}
            />
          ))}
        </ul>
      </Section>
      <Section title="Autonomy package" meta="supervised" fill>
        <div className="grid gap-2 p-3">
          <WorkflowStep
            index="01"
            title="Assign intent"
            body="Maintain visual track on BOGEY-7 without crossing operator-defined boundary."
          />
          <WorkflowStep
            index="02"
            title="Split roles"
            body="ROOK-1 high overwatch, ROOK-2 offset confirmation, BRAVO-3 holds ground cue."
          />
          <WorkflowStep
            index="03"
            title="Audit tasking"
            body="Every drone command creates an event and remains reversible from the feed."
          />
        </div>
      </Section>
    </>
  );
}

function IntegrationsPanel({
  reports,
  events,
  onSelect,
  onInjectFeed,
}: {
  reports: Report[];
  events: Event[];
  onSelect: (o: AnyObject) => void;
  onInjectFeed: (source: string) => void;
}) {
  return (
    <>
      <Section title="Source fabric" meta={`${DATA_SOURCES.length} feeds`}>
        <div className="bg-border grid grid-cols-2 gap-px">
          {DATA_SOURCES.map((source) => {
            const Icon = source.icon;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => onInjectFeed(source.id)}
                className="bg-card hover:bg-secondary flex min-h-[92px] flex-col items-start gap-1.5 p-3 text-left transition-colors"
              >
                <Icon className="text-primary size-4" />
                <span className="text-foreground font-mono text-[11px] font-bold">
                  {source.title}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-[10px]">
                  {source.meta}
                </span>
                <span className="text-warning mt-auto font-mono text-[9px] uppercase">
                  {source.state}
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Recent reports" meta={`${reports.length} objects`}>
        <ReportList reports={reports.slice(0, 5)} onSelect={onSelect} />
      </Section>
      <Section title="Fusion audit" meta={`${events.length} events`} fill>
        <ol className="px-3 py-1">
          {events.slice(0, 8).map((event, index) => (
            <FeedRow
              key={event._id}
              event={event}
              fresh={index === 0}
              onSelect={() => onSelect(event)}
            />
          ))}
        </ol>
      </Section>
    </>
  );
}

function ObjectsPanel({
  units,
  entities,
  reports,
  events,
  selectedId,
  onSelect,
}: {
  units: Unit[];
  entities: Entity[];
  reports: Report[];
  events: Event[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}) {
  const objects: AnyObject[] = [
    ...entities,
    ...units,
    ...reports.slice(0, 4),
    ...events.slice(0, 5),
  ];

  return (
    <>
      <Section title="Registry" meta={`${objects.length} live objects`} fill>
        <ul className="divide-border divide-y">
          {objects.map((object) => (
            <li key={object._id}>
              <button
                type="button"
                onClick={() => onSelect(object)}
                className={[
                  'hover:bg-secondary flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors',
                  selectedId === object._id ? 'bg-secondary' : '',
                ].join(' ')}
              >
                <div className="min-w-0">
                  <div className="text-foreground truncate font-mono text-[11px] font-bold">
                    {objectLabel(object)}
                  </div>
                  <div className="text-muted-foreground font-mono text-[10px]">
                    {object._type} · {object._source}
                  </div>
                </div>
                <span className="border-border text-muted-foreground border px-1.5 py-0.5 font-mono text-[9px]">
                  v{object._version}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Knowledge graph" meta="entity links">
        <div className="grid gap-2 p-3">
          <GraphLink left="BOGEY-7" edge="supported by" right="RF + OSINT" />
          <GraphLink left="V-117" edge="near" right="DeepState boundary" />
          <GraphLink left="ROOK-1" edge="assigned to" right="OP-SE-001" />
        </div>
      </Section>
    </>
  );
}

function PlanningPanel({
  objective,
  onGeneratePlan,
}: {
  objective: MissionObjective;
  onGeneratePlan: () => void;
}) {
  return (
    <>
      <ObjectiveBanner objective={objective} onSelect={() => undefined} />
      <Section title="COA generator" meta="decision support">
        <div className="grid gap-2 p-3">
          <ActionButton
            label="Generate COA"
            meta="overwatch · confirm · contain"
            onClick={onGeneratePlan}
          />
          <WorkflowStep
            index="A"
            title="Fast confirm"
            body="Push ROOK-1 now, hold ROOK-2 as redundant angle. Lowest time to visual."
          />
          <WorkflowStep
            index="B"
            title="Swarm box"
            body="Two-drone bracket around BOGEY-7 track, BRAVO-3 stays masked."
          />
          <WorkflowStep
            index="C"
            title="Observe only"
            body="No movement, increase confidence using RF and satellite refresh."
          />
        </div>
      </Section>
      <Section title="Timeline" meta="next 15m" fill>
        <div className="grid gap-2 p-3">
          <TimelineRow t="+00" body="Confirm commander intent and ROE gates." />
          <TimelineRow t="+02" body="ROOK-1 on route to overwatch point." />
          <TimelineRow
            t="+06"
            body="ROOK-2 offset if track remains unresolved."
          />
          <TimelineRow t="+12" body="Generate updated intelligence summary." />
        </div>
      </Section>
    </>
  );
}

function IntelligencePanel({
  entities,
  reports,
  events,
  onInjectFeed,
}: {
  entities: Entity[];
  reports: Report[];
  events: Event[];
  onInjectFeed: (source: string) => void;
}) {
  return (
    <>
      <Section title="Analysis surface" meta="queryable">
        <div className="grid gap-2 p-3">
          <ActionButton
            label="Synthesize radio"
            meta="simulate transcript → extract entities"
            onClick={() => onInjectFeed('radio')}
          />
          <ActionButton
            label="Learn from satellite"
            meta="inject change-detection cue"
            onClick={() => onInjectFeed('satellite')}
          />
        </div>
      </Section>
      <Section title="Current assessment" meta="machine assisted">
        <div className="grid gap-2 p-3">
          <Insight title="Most likely" value="Low UAV + ground support cue" />
          <Insight
            title="Uncertainty"
            value="V-117 intent and route relation"
          />
          <Insight title="Need next" value="ROOK-1 visual confirmation" />
        </div>
      </Section>
      <Section
        title="Evidence graph"
        meta={`${entities.length + reports.length + events.length} nodes`}
        fill
      >
        <div className="grid gap-2 p-3">
          <GraphLink left="BOGEY-7" edge="correlates" right="SIG-A" />
          <GraphLink left="SOCIAL-17" edge="supports" right="ROOK-1 track" />
          <GraphLink left="DeepState" edge="context" right="contact boundary" />
          <GraphLink
            left="Commander query"
            edge="answers from"
            right="all feeds"
          />
        </div>
      </Section>
    </>
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
      <div className="border-border bg-muted/30 flex shrink-0 items-baseline justify-between border-b px-3 py-1">
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
      className="border-border bg-card hover:bg-secondary group flex w-full shrink-0 flex-col items-start gap-1 border-b px-3 py-2 text-left transition-colors"
    >
      <div className="flex w-full items-baseline justify-between">
        <span className="text-muted-foreground label-cap-sm">Objective</span>
        <span className="text-primary font-mono text-[10px]">
          {objective.priority}
        </span>
      </div>
      <span className="text-foreground font-serif text-[15px] italic leading-tight tracking-tight">
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
          'group hover:bg-secondary flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
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
          'group hover:bg-secondary flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
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

function ReportList({
  reports,
  onSelect,
}: {
  reports: Report[];
  onSelect: (o: AnyObject) => void;
}) {
  return (
    <ul className="divide-border divide-y">
      {reports.map((report) => (
        <li key={report._id}>
          <button
            type="button"
            onClick={() => onSelect(report)}
            className="hover:bg-secondary flex w-full flex-col items-start gap-1 px-3 py-1.5 text-left transition-colors"
          >
            <div className="flex w-full items-baseline justify-between gap-2">
              <span className="text-foreground font-mono text-[11px] font-bold">
                {report._source_ref}
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">
                {report.classification.toUpperCase()}
              </span>
            </div>
            <span className="text-muted-foreground line-clamp-2 text-[11px] leading-snug">
              {report.text}
            </span>
          </button>
        </li>
      ))}
    </ul>
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

function ActionButton({
  label,
  meta,
  onClick,
}: {
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border bg-card hover:bg-secondary flex items-center justify-between gap-3 border px-3 py-2 text-left transition-colors"
    >
      <span className="min-w-0">
        <span className="text-foreground block font-mono text-[12px] font-bold">
          {label}
        </span>
        <span className="text-muted-foreground block truncate font-mono text-[10px]">
          {meta}
        </span>
      </span>
      <CheckCircle2 className="text-primary size-4 shrink-0" />
    </button>
  );
}

function WorkflowStep({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <div className="border-border bg-muted/20 border p-2">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-primary font-mono text-[10px] font-bold">
          {index}
        </span>
        <span className="text-foreground font-mono text-[11px] font-bold">
          {title}
        </span>
      </div>
      <p className="text-muted-foreground text-[11px] leading-snug">{body}</p>
    </div>
  );
}

function TimelineRow({ t, body }: { t: string; body: string }) {
  return (
    <div className="grid grid-cols-[42px_1fr] gap-2">
      <span className="text-primary font-mono text-[11px]">{t}</span>
      <span className="text-muted-foreground text-[11px] leading-snug">
        {body}
      </span>
    </div>
  );
}

function GraphLink({
  left,
  edge,
  right,
}: {
  left: string;
  edge: string;
  right: string;
}) {
  return (
    <div className="border-border bg-muted/20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border px-2 py-1.5 font-mono text-[10px]">
      <span className="text-foreground truncate font-bold">{left}</span>
      <span className="text-muted-foreground">{edge}</span>
      <span className="text-foreground truncate text-right font-bold">
        {right}
      </span>
    </div>
  );
}

function Insight({ title, value }: { title: string; value: string }) {
  return (
    <div className="border-border bg-card border px-3 py-2">
      <div className="label-cap-sm text-muted-foreground">{title}</div>
      <div className="text-foreground mt-0.5 text-[12px] leading-snug">
        {value}
      </div>
    </div>
  );
}

function objectLabel(object: AnyObject) {
  switch (object._type) {
    case 'Unit':
      return object.callsign;
    case 'Entity':
      return object.name ?? object._id;
    case 'Report':
      return object._source_ref ?? object.author ?? object._id;
    case 'Event':
      return object.verb ?? object._subtype;
    case 'MissionObjective':
      return object.title;
    case 'Recommendation':
      return `${object.verb} ${object.short}`;
    case 'Plan':
      return object.title;
    case 'Mission':
      return object.intent;
    case 'TaskingOrder':
      return object.command_type;
  }
}
