'use client';

import {
  AlertTriangle,
  Battery,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crosshair,
  Database,
  Eye,
  FileStack,
  Fuel,
  Globe,
  Heart,
  HelpCircle,
  MapPin,
  Network,
  Plane,
  PlaneTakeoff,
  Radio,
  Rocket,
  Satellite,
  ShieldCheck,
  Truck,
  User,
  Users,
  Waypoints,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import { affiliationToken } from '@/components/_ontology/affiliation';
import type {
  AnyObject,
  Entity,
  Event,
  MissionObjective,
  Recommendation,
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
  recommendations: Recommendation[];
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
  recommendations,
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
          recommendations={recommendations}
          units={units}
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
        <ul className="divide-border max-h-[260px] divide-y overflow-y-auto">
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
        <ul className="divide-border max-h-[280px] divide-y overflow-y-auto">
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
        <div className="max-h-[220px] overflow-y-auto">
          <ReportList reports={osintReports} onSelect={onSelect} />
        </div>
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
  // Match all drone subtypes — drone (legacy), drone_isr, drone_strike.
  // The CP wire returns ROOK-1 as `drone_isr`; the legacy-only filter
  // dropped it from the col-status fleet list.
  const drones = units.filter(
    (unit) =>
      unit._subtype === 'drone' ||
      unit._subtype === 'drone_isr' ||
      unit._subtype === 'drone_strike'
  );

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
          {objects.map((object) => {
            const Icon = registryIcon(object);
            return (
              <li key={object._id}>
                <button
                  type="button"
                  onClick={() => onSelect(object)}
                  className={[
                    'hover:bg-secondary grid w-full grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2 text-left transition-colors',
                    selectedId === object._id ? 'bg-secondary' : '',
                  ].join(' ')}
                >
                  <span
                    aria-hidden
                    className="text-muted-foreground/80 flex size-5 items-center justify-center"
                  >
                    <Icon className="size-3.5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className="text-foreground block truncate font-mono text-[11px] font-bold">
                      {objectLabel(object)}
                    </span>
                    <span className="text-muted-foreground block truncate font-mono text-[10px]">
                      {registrySubtitle(object)}
                    </span>
                  </span>
                  <span className="text-muted-foreground/70 shrink-0 font-mono text-[9px]">
                    {timeShort(object._observed_at)}
                  </span>
                </button>
              </li>
            );
          })}
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
  recommendations,
  units,
  onInjectFeed,
}: {
  entities: Entity[];
  reports: Report[];
  events: Event[];
  recommendations: Recommendation[];
  units: Unit[];
  onInjectFeed: (source: string) => void;
}) {
  // Derive live signals from already-loaded props. No SQL, no LLM —
  // the AI workspace's "current assessment" should reflect the
  // ontology state, refreshed every time props update.
  const topThreat = entities
    .filter((e) => e.threat_level === 'high' || e.threat_level === 'med')
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
  const lowestConfidence = entities
    .filter((e) => e.confidence < 0.7)
    .sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0))[0];
  const topPendingRec = recommendations.find((r) => r.status === 'pending');

  const mostLikely = topThreat
    ? `${topThreat.name ?? topThreat._subtype} · ${Math.round((topThreat.confidence ?? 0) * 100)}% confidence`
    : entities.length > 0
      ? `${entities.length} tracks, none high-threat`
      : 'No tracks observed';

  const uncertainty = lowestConfidence
    ? `${lowestConfidence.name ?? lowestConfidence._subtype} (${Math.round((lowestConfidence.confidence ?? 0) * 100)}%)`
    : 'All tracks well-resolved';

  const needNext = topPendingRec
    ? topPendingRec.short ?? topPendingRec.proposed_action_type
    : (() => {
        const lastCritical = events.find(
          (e) => e.severity === 'critical' || e.severity === 'warn'
        );
        if (lastCritical?.entity_id) {
          const tgt = entities.find((e) => e._id === lastCritical.entity_id);
          return `Resolve ${tgt?.name ?? lastCritical.entity_id}`;
        }
        return 'No urgent items';
      })();

  // Build real correlations: count how many events touch each entity, and
  // how many entities each report references. Top 4 become the graph chips.
  const eventCounts = new Map<string, number>();
  for (const ev of events) {
    if (ev.entity_id) {
      eventCounts.set(ev.entity_id, (eventCounts.get(ev.entity_id) ?? 0) + 1);
    }
  }
  const topCorrelated = Array.from(eventCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([entityId, count]) => {
      const ent = entities.find((e) => e._id === entityId);
      return {
        entityName: ent?.name ?? ent?._subtype ?? entityId,
        count,
        threat: ent?.threat_level ?? 'unknown',
      };
    });
  const recentReport = reports.find((r) => r.entity_refs && r.entity_refs.length > 0);
  const supportingReportEntity = (() => {
    const refs = recentReport?.entity_refs;
    if (!refs || refs.length === 0) return undefined;
    return entities.find((e) => e._id === refs[0]);
  })();

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
      <Section
        title="Current assessment"
        meta={`${units.filter((u) => u._subtype === 'drone' || u._subtype === 'drone_isr' || u._subtype === 'drone_strike').length} drones · ${entities.length} tracks`}
      >
        <div className="grid gap-2 p-3">
          <Insight title="Most likely" value={mostLikely} />
          <Insight title="Uncertainty" value={uncertainty} />
          <Insight title="Need next" value={needNext} />
        </div>
      </Section>
      <Section
        title="Evidence graph"
        meta={`${entities.length + reports.length + events.length} nodes`}
        fill
      >
        <div className="grid gap-2 p-3">
          {topCorrelated.length > 0 ? (
            topCorrelated.map((c) => (
              <GraphLink
                key={c.entityName}
                left={c.entityName}
                edge={c.threat === 'high' ? 'high threat' : 'observed in'}
                right={`${c.count} event${c.count > 1 ? 's' : ''}`}
              />
            ))
          ) : (
            <GraphLink
              left="No entity ↔ event"
              edge="links yet"
              right="ingest a feed"
            />
          )}
          {supportingReportEntity ? (
            <GraphLink
              left={recentReport?._subtype ?? 'report'}
              edge="references"
              right={supportingReportEntity.name ?? supportingReportEntity._id}
            />
          ) : null}
        </div>
      </Section>
    </>
  );
}

export function Section({
  title,
  meta,
  children,
  fill = false,
  defaultOpen = true,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  fill?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `section-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <section
      className={[
        'border-border border-b',
        fill && open ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'shrink-0',
      ].join(' ')}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="border-border hover:bg-muted/30 flex w-full shrink-0 items-baseline justify-between border-b px-3 py-1 text-left transition-colors"
      >
        <span className="flex items-baseline gap-1.5">
          <ChevronDown
            className={[
              'text-muted-foreground/70 size-3 self-center transition-transform',
              open ? '' : '-rotate-90',
            ].join(' ')}
            aria-hidden
          />
          <h2 className="text-foreground/90 label-cap">{title}</h2>
        </span>
        {meta ? (
          <span className="text-muted-foreground/80 font-mono text-[10px]">
            {meta}
          </span>
        ) : null}
      </button>
      {open ? (
        <div id={panelId} className={fill ? 'min-h-0 flex-1 overflow-y-auto' : ''}>
          {children}
        </div>
      ) : null}
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
  const priorityTone =
    objective.priority === 'P0'
      ? 'border-threat/50 text-threat'
      : objective.priority === 'P1'
        ? 'border-warning/50 text-warning'
        : 'border-muted-foreground/40 text-muted-foreground';

  const statusTone =
    objective.status === 'active'
      ? 'border-success/40 text-success/90'
      : objective.status === 'open'
        ? 'border-primary/40 text-primary/90'
        : objective.status === 'completed'
          ? 'border-muted-foreground/30 text-muted-foreground/80'
          : 'border-threat/40 text-threat/80';

  const deadlineHHMM = objective.deadline?.split('T')[1]?.slice(0, 5);
  const remaining = deadlineRemaining(objective.deadline);
  const aoSize = objective.target_area?.length
    ? `AO ${objective.target_area.length - 1}-pt polygon`
    : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(objective)}
      className="border-border bg-card hover:bg-secondary group flex w-full shrink-0 flex-col items-start gap-1 border-b px-3 py-2 text-left transition-colors"
    >
      {/* row 1 — label + priority pill */}
      <div className="flex w-full items-center justify-between">
        <div className="text-muted-foreground inline-flex items-center gap-1">
          <Crosshair aria-hidden className="size-3" strokeWidth={2} />
          <span className="label-cap-sm">Objective</span>
        </div>
        <span
          className={`rounded-sm border px-1 py-px font-mono text-[9px] uppercase tracking-wide ${priorityTone}`}
        >
          {objective.priority}
        </span>
      </div>

      {/* row 2 — title + status pill */}
      <div className="flex w-full items-baseline justify-between gap-2">
        <span className="text-foreground truncate font-serif text-[15px] italic leading-tight tracking-tight">
          {objective.title}
        </span>
        <span
          className={`shrink-0 rounded-sm border px-1 py-px font-mono text-[9px] uppercase tracking-wide ${statusTone}`}
        >
          {objective.status}
        </span>
      </div>

      {/* row 3 — description (truncated) */}
      {objective.description ? (
        <p className="text-muted-foreground/85 line-clamp-2 text-[11px] leading-snug">
          {objective.description}
        </p>
      ) : null}

      {/* row 4 — footer: deadline + countdown + AO size */}
      {(deadlineHHMM || aoSize) && (
        <div className="text-muted-foreground/80 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px]">
          {deadlineHHMM ? (
            <span className="inline-flex items-center gap-0.5">
              <Clock aria-hidden className="size-2.5" strokeWidth={2} />
              due {deadlineHHMM}Z
              {remaining ? (
                <span className="text-muted-foreground/60">
                  &nbsp;· {remaining}
                </span>
              ) : null}
            </span>
          ) : null}
          {aoSize ? (
            <>
              <span aria-hidden className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-0.5">
                <MapPin aria-hidden className="size-2.5" strokeWidth={2} />
                {aoSize}
              </span>
            </>
          ) : null}
        </div>
      )}
    </button>
  );
}

// deadlineRemaining renders "Hh Mm" between now and the deadline, or
// "overdue" when past, or "" when missing.
function deadlineRemaining(deadlineISO: string | undefined): string {
  if (!deadlineISO) return '';
  const ms = Date.parse(deadlineISO) - Date.now();
  if (Number.isNaN(ms)) return '';
  if (ms < 0) return 'overdue';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m left`;
  return `${h}h ${m}m left`;
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
  const Icon = unitIcon(unit);
  const moving = (unit.speed_mps ?? 0) >= 0.5;
  const airborne = unit.altitude_m !== undefined && unit.altitude_m > 50;
  const offMap = OFF_MAP_CALLSIGNS.has(unit.callsign);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={[
          'group hover:bg-secondary flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors',
          selected ? 'bg-secondary' : '',
        ].join(' ')}
      >
        <span aria-hidden className={`size-1.5 shrink-0 ${dot}`} />
        <Icon
          aria-hidden
          className="text-muted-foreground/80 size-3.5 shrink-0"
          strokeWidth={1.8}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className="text-foreground font-mono text-[12px] font-bold">
                {unit.callsign}
              </span>
              <span className="text-muted-foreground/70 truncate font-mono text-[10px]">
                {unitTypeLabel(unit)}
              </span>
            </div>
            <UnitStatusPill status={unit.status} />
          </div>
          <UnitMetrics
            unit={unit}
            moving={moving}
            airborne={airborne}
            offMap={offMap}
          />
        </div>
      </button>
    </li>
  );
}

// OFF_MAP_CALLSIGNS — assets that operate from rear positions outside
// the AO bbox. Heading/speed for these is meaningless on the map; they
// either fire on call (LIGHTNING/THUNDER) or sustain from depth (DRAY).
const OFF_MAP_CALLSIGNS = new Set(['LIGHTNING', 'THUNDER', 'DRAY']);

// Single source of truth: the finer-grained UnitSubtype values defined
// in src/types/ontology.ts (mirroring the Go const block) carry both
// the human-readable label AND the icon. No callsign-specific code in
// the UI — what the unit IS lives on the unit's _subtype field.
const UNIT_SUBTYPE_META: Record<
  Unit['_subtype'],
  { label: string; icon: LucideIcon }
> = {
  // finer-grained (preferred — set by JSONL author per OP SILENT EYE)
  command_post:     { label: 'command post',     icon: Crosshair },
  drone_isr:        { label: 'ISR drone',        icon: Plane },
  drone_strike:     { label: 'strike UAS',       icon: PlaneTakeoff },
  infantry_team:    { label: 'infantry team',    icon: Users },
  infantry_recon:   { label: 'forward observer', icon: Eye },
  infantry_kinetic: { label: 'FPV team',         icon: Zap },
  vehicle_mech:     { label: 'mech infantry',    icon: Truck },
  vehicle_recon:    { label: 'recon vehicle',    icon: Eye },
  vehicle_himars:   { label: 'HIMARS pair',      icon: Rocket },
  vehicle_mortar:   { label: 'mortar section',   icon: Rocket },
  vehicle_medical:  { label: 'medical',          icon: Heart },
  vehicle_logistic: { label: 'logistics',        icon: Truck },
  // legacy / unspecified — fallback when _subtype is the generic
  // pre-extension value
  drone:            { label: 'drone',            icon: Plane },
  vehicle:          { label: 'vehicle',          icon: Truck },
  infantry:         { label: 'infantry team',    icon: Users },
  boat:             { label: 'patrol boat',      icon: Truck },
};

function unitTypeLabel(unit: Unit): string {
  return UNIT_SUBTYPE_META[unit._subtype]?.label ?? unit._subtype;
}

function unitIcon(unit: Unit): LucideIcon {
  return UNIT_SUBTYPE_META[unit._subtype]?.icon ?? Truck;
}

// entityCategoryLabel reads the OSINT-grounded role straight off the
// entity's attributes. Prefers a producer-set `attributes.role` (short
// canonical category), falls back to `attributes.platform_role` (free
// text, trimmed if long), and finally to the generic ontology
// `_subtype` (Aircraft / Vehicle / Person / Threat / Unknown).
//
// No callsign / id hardcoding — what the entity IS lives on the entity.
function entityCategoryLabel(entity: Entity): string {
  const role = entity.attributes?.role;
  if (role) return role;
  const platformRole = entity.attributes?.platform_role;
  if (platformRole) {
    // Strip the leading nationality prefix ("Russian ", "Ukrainian ")
    // so the chip stays compact; keep the noun.
    return platformRole
      .replace(/^Russian\s+|^Ukrainian\s+|^NATO\s+/i, '')
      .replace(/^primary\s+/i, '');
  }
  return entity._subtype;
}

// UnitStatusPill — small subtle badge replacing the raw "ON_STATION"
// uppercase text. Uses outline tone matching the status semantics.
function UnitStatusPill({ status }: { status: Unit['status'] }) {
  const tone =
    status === 'on_station'
      ? 'border-success/40 text-success/90'
      : status === 'en_route'
        ? 'border-warning/40 text-warning/90'
        : status === 'returning'
          ? 'border-primary/40 text-primary/90'
          : status === 'offline'
            ? 'border-threat/40 text-threat/90'
            : 'border-muted-foreground/30 text-muted-foreground';
  return (
    <span
      className={`rounded-sm border px-1 py-px font-mono text-[9px] uppercase tracking-wide ${tone}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// UnitMetrics renders only the fields that mean something for THIS
// unit. Suppresses 0° heading + 0m/s speed on stationary assets,
// drops kinematic data entirely on off-map assets, shows altitude for
// drones, etc.
function UnitMetrics({
  unit,
  moving,
  airborne,
  offMap,
}: {
  unit: Unit;
  moving: boolean;
  airborne: boolean;
  offMap: boolean;
}) {
  const chips: React.ReactNode[] = [];

  if (offMap) {
    chips.push(
      <span key="off-map" className="text-muted-foreground/60">
        in support · off-map
      </span>,
    );
  }

  if (unit.battery_pct !== undefined) {
    chips.push(
      <span key="bat" className="inline-flex items-center gap-0.5">
        <Battery aria-hidden className="size-2.5" strokeWidth={2} />
        {unit.battery_pct}%
      </span>,
    );
  }
  if (unit.fuel_pct !== undefined) {
    chips.push(
      <span key="fuel" className="inline-flex items-center gap-0.5">
        <Fuel aria-hidden className="size-2.5" strokeWidth={2} />
        {unit.fuel_pct}%
      </span>,
    );
  }

  if (airborne && unit.altitude_m !== undefined) {
    chips.push(<span key="alt">{Math.round(unit.altitude_m)}m</span>);
  }

  if (moving && !offMap) {
    chips.push(
      <span key="kin">
        {unit.heading_deg ?? 0}° · {unit.speed_mps?.toFixed(0)}m/s
      </span>,
    );
  }

  // If nothing meaningful, show a single gentle placeholder so the row
  // doesn't collapse to just the callsign + status.
  if (chips.length === 0) {
    chips.push(
      <span key="idle" className="text-muted-foreground/60">
        idle · no telemetry
      </span>,
    );
  }

  return (
    <div className="text-muted-foreground/80 mt-px flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px]">
      {chips}
    </div>
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
  const threatTone =
    entity.threat_level === 'high'
      ? 'border-threat/50 text-threat'
      : entity.threat_level === 'med'
        ? 'border-warning/50 text-warning'
        : entity.threat_level === 'low'
          ? 'border-muted-foreground/40 text-muted-foreground'
          : 'border-muted-foreground/20 text-muted-foreground/60';

  // Prefer the real platform identity from OSINT-grounded attributes
  // (e.g., "T-72B3") over the generic ontology subtype ("Vehicle").
  // Falls back to subtype when attributes.class is absent.
  const platform = entity.attributes?.class ?? entity._subtype;
  const offMap = entity.attributes?.off_map === 'true';
  // Short category sits next to the name so the row tells you what
  // KIND of contact this is at a glance (e.g., "ISR UAV", "MBT",
  // "MRL battery", "loitering munition") without needing the full
  // platform-class string.
  const category = entityCategoryLabel(entity);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={[
          'group hover:bg-secondary flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors',
          selected ? 'bg-secondary' : '',
        ].join(' ')}
      >
        <svg width="14" height="14" className="shrink-0" aria-hidden>
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
          {entity.affiliation === 'neutral' && (
            <rect
              x="2"
              y="2"
              width="10"
              height="10"
              rx="1"
              fill="none"
              stroke={tone.hsl}
              strokeWidth={1.4}
            />
          )}
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className="text-foreground truncate font-mono text-[12px] font-bold">
                {entity.name ?? entity._id}
              </span>
              <span className="text-muted-foreground/70 truncate font-mono text-[10px]">
                {category}
              </span>
            </div>
            <span
              className={`shrink-0 rounded-sm border px-1 py-px font-mono text-[9px] uppercase tracking-wide ${threatTone}`}
            >
              {entity.threat_level}
            </span>
          </div>
          <div className="text-muted-foreground/80 mt-px flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px]">
            <span className="truncate" title={platform}>
              {platform}
            </span>
            <span>·</span>
            <span>conf {(entity.confidence * 100).toFixed(0)}%</span>
            {offMap ? (
              <>
                <span>·</span>
                <span className="text-muted-foreground/60">off-map</span>
              </>
            ) : null}
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

export function FeedRow({
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

// registryIcon picks the lucide glyph for a row in the col-status
// Registry. Only Entity / Unit / Report / Event flow through this
// surface (see ObjectsPanel.objects), but we cover the rest for safety.
function registryIcon(object: AnyObject): LucideIcon {
  switch (object._type) {
    case 'Unit':
      return unitIcon(object);
    case 'Entity':
      switch (object._subtype) {
        case 'Aircraft':
          return Plane;
        case 'Vehicle':
          return Truck;
        case 'Vessel':
          return Truck;
        case 'Person':
          return User;
        case 'Threat':
          return AlertTriangle;
        case 'Unknown':
          return HelpCircle;
        default:
          return Crosshair;
      }
    case 'Report':
      switch (object._subtype) {
        case 'radio':
          return Radio;
        case 'sigint':
          return Satellite;
        case 'osint':
          return Globe;
        case 'operator':
          return User;
        default:
          return FileStack;
      }
    case 'Event':
      return Zap;
    case 'Recommendation':
      return ShieldCheck;
    case 'MissionObjective':
      return Crosshair;
    default:
      return Database;
  }
}

// registrySubtitle — small grey line under the row title. Surfaces the
// most informative detail per type instead of the producer / version
// metadata that nobody operationally scans for.
function registrySubtitle(object: AnyObject): string {
  switch (object._type) {
    case 'Entity': {
      const cls = object.attributes?.class;
      const role = object.attributes?.role;
      const detail = cls ?? role;
      return detail ? `${object._subtype} · ${detail}` : object._subtype;
    }
    case 'Unit': {
      const role = unitTypeLabel(object);
      const tele =
        object.battery_pct !== undefined
          ? `${object.battery_pct}% bat`
          : object.fuel_pct !== undefined
            ? `${object.fuel_pct}% fuel`
            : null;
      return tele ? `${role} · ${tele}` : role;
    }
    case 'Report': {
      const author = object.author ?? object.channel;
      return author ? `${object._subtype} · ${author}` : object._subtype;
    }
    case 'Event':
      return `${object._subtype} · ${object.severity}`;
    case 'Recommendation':
      return `${object.proposed_action_type} · ${(object.confidence * 100).toFixed(0)}%`;
    case 'MissionObjective':
      return `${object.priority} · ${object.status}`;
    default:
      return object._type;
  }
}

// timeShort — HH:MM:SS slice of an ISO timestamp, mirroring the
// _time helper in workspace-center. Kept local to avoid a cross-column
// import.
function timeShort(iso: string): string {
  return iso.split('T')[1]?.slice(0, 8) ?? iso;
}
