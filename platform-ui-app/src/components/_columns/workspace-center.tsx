'use client';

import {
  Brain,
  Camera,
  Database,
  FileStack,
  GitBranch,
  Plane,
  Radar,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { ColMap } from '@/components/_columns/col-map';
import type { WorkspaceSectionId } from '@/components/_columns/col-status';
import type {
  AnyObject,
  Entity,
  Event,
  MissionObjective,
  Recommendation,
  Report,
  Unit,
} from '@/types/ontology';

export type DataSourceId =
  | 'radio'
  | 'satellite'
  | 'intel'
  | 'social'
  | 'allies'
  | 'drone_video';

export const SOURCE_LABELS: Record<DataSourceId, string> = {
  radio: 'Radio traffic',
  satellite: 'Satellite imagery',
  intel: 'Intelligence reports',
  social: 'Public OSINT',
  allies: 'Allied communications',
  drone_video: 'Drone video',
};

interface WorkspaceCenterProps {
  workspace: WorkspaceSectionId;
  objective: MissionObjective;
  entities: Entity[];
  units: Unit[];
  events: Event[];
  reports: Report[];
  recommendations: Recommendation[];
  selectedId?: string;
  activeFeedSource: DataSourceId;
  activeDroneFeed?: string;
  onSelect: (o: AnyObject) => void;
  onInjectFeed: (source: DataSourceId) => void;
  onLaunchDrone: (unitId: string) => void;
  onLaunchSwarm: () => void;
  onGeneratePlan: () => void;
  onAsk: (query: string, fromVoice?: boolean) => void;
}

export function WorkspaceCenter({
  workspace,
  objective,
  entities,
  units,
  events,
  reports,
  recommendations,
  selectedId,
  activeFeedSource,
  activeDroneFeed,
  onSelect,
  onInjectFeed,
  onLaunchDrone,
  onLaunchSwarm,
  onGeneratePlan,
  onAsk,
}: WorkspaceCenterProps) {
  if (workspace === 'integrations') {
    return (
      <SourceDetailSurface
        source={activeFeedSource}
        reports={reports}
        events={events}
        onInjectFeed={onInjectFeed}
      />
    );
  }

  if (workspace === 'drone_ops') {
    return (
      <DroneLiveSurface
        units={units}
        activeDroneFeed={activeDroneFeed}
        onLaunchDrone={onLaunchDrone}
        onLaunchSwarm={onLaunchSwarm}
      />
    );
  }

  if (workspace === 'objects') {
    return (
      <OntologySurface
        entities={entities}
        units={units}
        reports={reports}
        events={events}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    );
  }

  if (workspace === 'planning') {
    return (
      <PlanningSurface
        objective={objective}
        units={units}
        entities={entities}
        events={events}
        recommendations={recommendations}
        onGeneratePlan={onGeneratePlan}
      />
    );
  }

  if (workspace === 'intelligence') {
    return (
      <IntelligenceSurface
        entities={entities}
        units={units}
        reports={reports}
        events={events}
        recommendations={recommendations}
        onAsk={onAsk}
      />
    );
  }

  return (
    <ColMap
      entities={entities}
      units={units}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}

function SourceDetailSurface({
  source,
  reports,
  events,
  onInjectFeed,
}: {
  source: DataSourceId;
  reports: Report[];
  events: Event[];
  onInjectFeed: (source: DataSourceId) => void;
}) {
  const sourceReports = reports.filter((report) =>
    source === 'satellite'
      ? report._subtype === 'sigint' || report._source === 'satellite'
      : report._source === source ||
        report._source_ref?.toLowerCase() === source
  );
  const sourceEvents = events.filter((event) =>
    source === 'radio'
      ? event._source.includes('voice') || event._source === 'radio'
      : event._source === source || event.payload?.source === source
  );
  const rows = syntheticRows(source);

  return (
    <section className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <SurfaceHeader
        icon={Database}
        eyebrow="Data fusion"
        title={SOURCE_LABELS[source]}
        meta="synthetic stream · edge local"
      />
      <div className="bg-border grid min-h-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-px">
        <div className="bg-card flex min-h-0 flex-col overflow-hidden">
          <div className="border-border bg-muted/30 text-muted-foreground grid grid-cols-4 border-b px-4 py-2 font-mono text-[10px] uppercase">
            <span>Time</span>
            <span>Object</span>
            <span>Signal</span>
            <span>Confidence</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {rows.map((row) => (
              <div
                key={`${source}-${row.time}-${row.object}`}
                className="border-border/70 grid grid-cols-4 border-b px-4 py-3 font-mono text-[11px]"
              >
                <span className="text-muted-foreground">{row.time}</span>
                <span className="text-foreground font-bold">{row.object}</span>
                <span className="text-foreground/80">{row.signal}</span>
                <span
                  className={
                    row.confidence >= 80 ? 'text-success' : 'text-warning'
                  }
                >
                  {row.confidence}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-background grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden">
          <div className="border-border border-b p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="label-cap-sm text-muted-foreground">
                  Processor
                </div>
                <div className="text-foreground font-mono text-[13px] font-bold">
                  {sourcePipeline(source)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onInjectFeed(source)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 font-mono text-[11px] font-bold"
              >
                Inject refresh
              </button>
            </div>
            <p className="text-muted-foreground text-[12px] leading-relaxed">
              {sourceNarrative(source)}
            </p>
          </div>
          <div className="min-h-0 overflow-y-auto p-4">
            <PanelTitle
              title="Extracted objects"
              meta={`${sourceReports.length} reports`}
            />
            <div className="mt-2 grid gap-2">
              {sourceReports.slice(0, 4).map((report) => (
                <EvidenceCard
                  key={report._id}
                  title={report._source_ref ?? report._source}
                  body={report.text}
                  meta={report.classification}
                />
              ))}
              {sourceReports.length === 0 ? (
                <EvidenceCard
                  title="Synthetic fixture"
                  body="No injected report yet. Click a source card or Inject refresh to materialize a new feed object, event, and audit trail."
                  meta="standby"
                />
              ) : null}
            </div>
          </div>
          <div className="border-border border-t p-4">
            <PanelTitle
              title="Recent fusion events"
              meta={`${sourceEvents.length} linked`}
            />
            <div className="mt-2 grid gap-1.5">
              {sourceEvents.slice(0, 3).map((event) => (
                <MiniEvent key={event._id} event={event} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DroneLiveSurface({
  units,
  activeDroneFeed,
  onLaunchDrone,
  onLaunchSwarm,
}: {
  units: Unit[];
  activeDroneFeed?: string;
  onLaunchDrone: (unitId: string) => void;
  onLaunchSwarm: () => void;
}) {
  const drone =
    units.find((unit) => unit._id === activeDroneFeed) ??
    units.find((unit) => unit._id === 'unit_rook1') ??
    units[0];

  return (
    <section className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <SurfaceHeader
        icon={Camera}
        eyebrow="Live drone feed"
        title={drone ? `${drone.callsign} EO/IR` : 'Drone camera'}
        meta={
          drone
            ? `${drone.status.replace('_', ' ')} · ${drone.battery_pct ?? '--'}% battery`
            : 'standby'
        }
      />
      <div className="bg-border grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-px">
        <div
          className="relative overflow-hidden"
          style={{ backgroundColor: 'hsl(206 18% 8%)' }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 55% 45%, hsl(182 75% 70% / 0.18), transparent 18%), linear-gradient(135deg, hsl(206 16% 9%), hsl(210 22% 14%) 45%, hsl(204 18% 7%))',
            }}
          />
          <div
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                'linear-gradient(transparent 0, transparent 11px, hsl(180 80% 80% / 0.18) 12px)',
              backgroundSize: '100% 12px',
            }}
          />
          <div className="border-success/70 absolute left-[18%] top-[22%] h-[22%] w-[28%] border">
            <span className="bg-success text-background absolute -top-5 left-0 px-1.5 font-mono text-[10px] font-bold">
              VEHICLE SCAR
            </span>
          </div>
          <div className="border-warning absolute left-[58%] top-[38%] h-[15%] w-[18%] border">
            <span className="bg-warning text-background absolute -top-5 left-0 px-1.5 font-mono text-[10px] font-bold">
              HEAT TRACE
            </span>
          </div>
          <div className="text-primary absolute inset-x-10 bottom-8 grid grid-cols-4 gap-3 font-mono text-[11px]">
            <CameraMetric label="MODE" value="EO/IR FUSED" />
            <CameraMetric label="GRID" value="37U-DQ-842" />
            <CameraMetric label="ALT" value={`${drone?.altitude_m ?? 420}m`} />
            <CameraMetric label="LINK" value="EDGE LOCAL" />
          </div>
          <div className="border-primary/70 absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 border">
            <span className="bg-primary absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="border-primary/60 bg-background/70 text-primary absolute right-5 top-5 border px-3 py-2 font-mono text-[10px]">
            LIVE SIM · {new Date().toISOString().split('T')[1]?.slice(0, 8)}Z
          </div>
        </div>
        <div className="bg-background min-h-0 overflow-y-auto">
          <div className="border-border border-b p-4">
            <PanelTitle title="Task controls" meta="human approved" />
            <div className="mt-3 grid gap-2">
              <ActionSurfaceButton
                label="Launch ROOK-1"
                meta="open live camera + overwatch"
                onClick={() => onLaunchDrone('unit_rook1')}
              />
              <ActionSurfaceButton
                label="Coordinate swarm"
                meta="ROOK-1 overwatch · ROOK-2 flank"
                onClick={onLaunchSwarm}
              />
            </div>
          </div>
          <div className="p-4">
            <PanelTitle
              title="Telemetry"
              meta={`${units.filter((u) => u._subtype === 'drone').length} drones`}
            />
            <div className="mt-3 grid gap-2">
              {units
                .filter((unit) => unit._subtype === 'drone')
                .map((unit) => (
                  <TelemetryRow key={unit._id} unit={unit} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OntologySurface({
  entities,
  units,
  reports,
  events,
  selectedId,
  onSelect,
}: {
  entities: Entity[];
  units: Unit[];
  reports: Report[];
  events: Event[];
  selectedId?: string;
  onSelect: (o: AnyObject) => void;
}) {
  const objects: AnyObject[] = [...entities, ...units, ...reports, ...events];
  return (
    <section className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <SurfaceHeader
        icon={GitBranch}
        eyebrow="Ontology layer"
        title="Mission object graph"
        meta={`${objects.length} objects · ${events.length + reports.length} evidence nodes`}
      />
      <div className="bg-border grid min-h-0 flex-1 grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)] gap-px">
        <div className="bg-card min-h-0 overflow-y-auto">
          {objects.map((object) => (
            <button
              key={object._id}
              type="button"
              onClick={() => onSelect(object)}
              className={[
                'grid w-full grid-cols-[92px_1fr_auto] items-center gap-3 border-b border-border px-4 py-3 text-left hover:bg-secondary',
                selectedId === object._id ? 'bg-secondary' : '',
              ].join(' ')}
            >
              <span className="label-cap-sm text-muted-foreground">
                {object._type}
              </span>
              <span className="min-w-0">
                <span className="text-foreground block truncate font-mono text-[12px] font-bold">
                  {objectName(object)}
                </span>
                <span className="text-muted-foreground block truncate font-mono text-[10px]">
                  {object._source} · v{object._version}
                </span>
              </span>
              <span className="border-border text-muted-foreground border px-1.5 py-0.5 font-mono text-[9px]">
                {_time(object._observed_at)}
              </span>
            </button>
          ))}
        </div>
        <div className="bg-background min-h-0 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-3">
            <OntologyMetric label="Entities" value={entities.length} />
            <OntologyMetric label="Units" value={units.length} />
            <OntologyMetric
              label="Evidence"
              value={reports.length + events.length}
            />
          </div>
          <div className="mt-5 grid gap-3">
            <PanelTitle title="Resolved relationships" meta="typed edges" />
            <GraphRow left="BOGEY-7" edge="observed_by" right="ROOK-1 EO" />
            <GraphRow
              left="BOGEY-7"
              edge="corroborated_by"
              right="SIG-A + SOCIAL-17"
            />
            <GraphRow
              left="V-117"
              edge="near_boundary"
              right="DeepState occupied terrain"
            />
            <GraphRow left="P-04" edge="reported_by" right="BRAVO-3 TAC-3" />
            <GraphRow
              left="OP-SE-001"
              edge="tasks"
              right="ROOK-1 / ROOK-2 / BRAVO-3"
            />
          </div>
          <div className="mt-5 grid gap-3">
            <PanelTitle
              title="Schema enforcement"
              meta="control-plane objects"
            />
            <EvidenceCard
              title="Identity resolution"
              body="Callsigns, report refs, event refs, and unit tasking all resolve to ontology objects before appearing in recommendations."
              meta="active"
            />
            <EvidenceCard
              title="Auditability"
              body="Every command, query, source injection, and approval writes a new event envelope with source, subtype, severity, payload, and timestamps."
              meta="active"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanningSurface({
  objective,
  units,
  entities,
  events,
  recommendations,
  onGeneratePlan,
}: {
  objective: MissionObjective;
  units: Unit[];
  entities: Entity[];
  events: Event[];
  recommendations: Recommendation[];
  onGeneratePlan: () => void;
}) {
  return (
    <section className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <SurfaceHeader
        icon={FileStack}
        eyebrow="Mission planning"
        title={objective.title}
        meta="contextual COA builder"
      />
      <div className="bg-border grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-px">
        <div className="bg-card min-h-0 overflow-y-auto p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="label-cap-sm text-muted-foreground">
                Commander intent
              </div>
              <p className="text-foreground/90 mt-1 max-w-3xl text-[14px] leading-relaxed">
                {objective.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onGeneratePlan}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 font-mono text-[11px] font-bold"
            >
              Generate COA
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <CoaCard
              title="COA A · Fast confirm"
              risk="med"
              body="ROOK-1 moves to stand-off overwatch now. ROOK-2 remains reserve. Shortest time to visual confidence."
            />
            <CoaCard
              title="COA B · Swarm box"
              risk="high"
              body="ROOK-1 and ROOK-2 bracket the target track while BRAVO-3 holds. Better coverage, higher link load."
            />
            <CoaCard
              title="COA C · Observe only"
              risk="low"
              body="Hold drones, wait for satellite/RF refresh. Lowest exposure, slower OODA loop."
            />
          </div>
          <div className="mt-5">
            <PanelTitle
              title="Context model"
              meta="what the planner is using"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <EvidenceCard
                title="Terrain"
                body="DeepState occupied boundary, route relation, standoff zone, and Kramatorsk/Sloviansk corridor."
                meta="map"
              />
              <EvidenceCard
                title="Assets"
                body={`${units.length} friendly assets with battery, payload, status, tasking, and local link state.`}
                meta="fleet"
              />
              <EvidenceCard
                title="Threat picture"
                body={`${entities.filter((e) => e.affiliation === 'hostile').length} hostile track, ${entities.filter((e) => e.affiliation === 'unknown').length} unresolved objects.`}
                meta="ontology"
              />
              <EvidenceCard
                title="Decision record"
                body={`${recommendations.length} recommendations, ${events.length} mission events, human approval required for drone tasking.`}
                meta="audit"
              />
            </div>
          </div>
        </div>
        <div className="bg-background min-h-0 overflow-y-auto p-4">
          <PanelTitle title="Execution timeline" meta="next 15m" />
          <div className="mt-3 grid gap-3">
            <TimelineBlock
              t="+00"
              title="Approve intent"
              body="Confirm ISR-only tasking and keep engagement outside autonomous scope."
            />
            <TimelineBlock
              t="+02"
              title="Push ROOK-1"
              body="Open live camera, move to overwatch box, maintain stand-off."
            />
            <TimelineBlock
              t="+06"
              title="Resolve ambiguity"
              body="If BOGEY-7 persists, task ROOK-2 as offset observer."
            />
            <TimelineBlock
              t="+12"
              title="Update commander"
              body="Summarize deltas, confidence, unresolved objects, and next decision."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function IntelligenceSurface({
  entities,
  units,
  reports,
  events,
  recommendations,
  onAsk,
}: {
  entities: Entity[];
  units: Unit[];
  reports: Report[];
  events: Event[];
  recommendations: Recommendation[];
  onAsk: (query: string, fromVoice?: boolean) => void;
}) {
  const corpus =
    entities.length +
    units.length +
    reports.length +
    events.length +
    recommendations.length;
  return (
    <section className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <SurfaceHeader
        icon={Brain}
        eyebrow="Model layer"
        title="Search and reason across the mission"
        meta={`${corpus} indexed objects · local context`}
      />
      <div className="bg-border grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] gap-px">
        <div className="bg-card min-h-0 overflow-y-auto p-5">
          <div className="border-border bg-background border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Search className="text-primary size-4" />
              <span className="text-foreground font-mono text-[12px] font-bold">
                Mission-wide query examples
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Give me an update on the last 10 minutes',
                'What evidence supports launching ROOK-1?',
                'Summarize unresolved objects and confidence',
                'What changes if cloud comms drop?',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onAsk(prompt)}
                  className="border-border bg-card text-foreground hover:bg-secondary border px-3 py-2 text-left text-[12px]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <EvidenceCard
              title="Retriever context"
              body="Top-k context pulls from drone telemetry, reports, RF detections, map features, unit state, object graph edges, and recommendation rationale."
              meta="RAG"
            />
            <EvidenceCard
              title="Tool layer"
              body="Commands resolve to explicit actions: inject source, launch drone, coordinate swarm, generate plan, approve recommendation."
              meta="tools"
            />
            <EvidenceCard
              title="Guardrails"
              body="Recommendations stay explainable and require human approval. The model can draft ISR tasking, not silently execute engagement."
              meta="HITL"
            />
            <EvidenceCard
              title="Voice loop"
              body="Push-to-talk transcribes command intent, routes it through the same parser, and logs an audit event with source voice-query."
              meta="speech"
            />
          </div>
        </div>
        <div className="bg-background min-h-0 overflow-y-auto p-4">
          <PanelTitle title="Current synthesis" meta="real-time" />
          <div className="mt-3 grid gap-3">
            <InsightBlock
              icon={Radar}
              title="Most important change"
              value="BOGEY-7 persisted across EO, RF, and OSINT cues inside the last 10 minutes."
            />
            <InsightBlock
              icon={Plane}
              title="Best next ISR action"
              value="ROOK-1 stand-off overwatch; ROOK-2 remains offset confirmation."
            />
            <InsightBlock
              icon={ShieldCheck}
              title="Human decision required"
              value="Approve the recommendation before drone tasking mutates mission state."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LiveFeedStrip({
  events,
  onSelect,
}: {
  events: Event[];
  onSelect: (event: Event) => void;
}) {
  return (
    <div className="border-border bg-card flex shrink-0 items-stretch border-b">
      <div className="bg-primary text-primary-foreground flex w-[76px] items-center justify-center font-mono text-[10px] font-bold uppercase">
        Live
      </div>
      <div className="divide-border grid min-w-0 flex-1 grid-cols-1 divide-y md:grid-cols-4 md:divide-x md:divide-y-0">
        {events.slice(0, 4).map((event, index) => (
          <button
            key={event._id}
            type="button"
            onClick={() => onSelect(event)}
            className="hover:bg-secondary min-w-0 px-3 py-2 text-left"
          >
            <div className="flex items-center gap-2">
              <span
                className={[
                  'size-1.5 shrink-0',
                  event.severity === 'critical'
                    ? 'bg-threat'
                    : event.severity === 'warn'
                      ? 'bg-warning'
                      : index === 0
                        ? 'bg-primary'
                        : 'bg-muted-foreground',
                ].join(' ')}
              />
              <span className="text-foreground truncate font-mono text-[10px] font-bold">
                {event.verb ?? event._subtype}
              </span>
              <span className="text-muted-foreground ml-auto font-mono text-[9px]">
                {_time(event._observed_at)}
              </span>
            </div>
            <div className="text-muted-foreground mt-1 line-clamp-1 text-[11px]">
              {event.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function syntheticRows(source: DataSourceId) {
  const base = {
    radio: [
      ['14:23:31', 'P-04', 'speech: movement east treeline', 72],
      ['14:22:58', 'BOGEY-7', 'callsign fragment / launch team', 66],
      ['14:19:12', 'BRAVO-3', 'request overwatch', 91],
    ],
    satellite: [
      ['14:23:09', 'V-117', 'track gap recovered', 84],
      ['14:22:44', 'BOGEY-7', 'heat residue / vehicle scar', 78],
      ['14:21:44', 'Route DQ-842', '12 deg deviation', 86],
    ],
    intel: [
      ['14:22:37', 'Logistics cell', 'probing route window', 69],
      ['14:21:02', 'P-04', 'person of interest link', 58],
      ['14:18:46', 'DQ-842', 'pattern match prior incident', 74],
    ],
    social: [
      ['14:20:31', 'SOCIAL-17', 'low aircraft noise geotag', 61],
      ['14:19:54', 'Kramatorsk', 'lights moving southwest', 57],
      ['14:18:10', 'OSINT cluster', 'source credibility medium', 64],
    ],
    allies: [
      ['14:23:12', 'Counter-UAS radar', 'intermittent low return', 76],
      ['14:22:49', 'SIG-A', 'L-band cross-cue', 81],
      ['14:20:03', 'Liaison net', 'route advisory', 68],
    ],
    drone_video: [
      ['14:23:01', 'BOGEY-7', 'EO tracklet class low UAV', 87],
      ['14:22:40', 'Treeline', 'thermal edge motion', 63],
      ['14:21:58', 'ROOK-1', 'visual lock stable', 82],
    ],
  } satisfies Record<DataSourceId, Array<[string, string, string, number]>>;

  return base[source].map(([time, object, signal, confidence]) => ({
    time,
    object,
    signal,
    confidence,
  }));
}

function sourcePipeline(source: DataSourceId) {
  return {
    radio: 'Whisper-class ASR → entity extraction → object link',
    satellite: 'Change detection → track association → heat/route cue',
    intel: 'Report parser → entity linker → pattern matcher',
    social: 'Geotag scrape → credibility score → temporal join',
    allies: 'Liaison adapter → radar cue normalization',
    drone_video: 'EO/IR detector → tracklet fusion → target handoff',
  }[source];
}

function sourceNarrative(source: DataSourceId) {
  return {
    radio:
      'Simulated radio traffic is transcribed, segmented, and linked to known units, grid references, and unresolved objects before it enters the mission graph.',
    satellite:
      'Synthetic satellite change detection compares route scars, heat residue, and track continuity against recent mission context.',
    intel:
      'Intel reports are parsed into entities, locations, and events, then fused with live sensor state for commander-ready context.',
    social:
      'Public OSINT cues are geolocated and credibility-scored before they can influence recommendations.',
    allies:
      'Allied communications are normalized into the same ontology so radar, liaison, and unit reports become queryable.',
    drone_video:
      'Drone video is represented as EO/IR tracklets with confidence, object association, and audit trail references.',
  }[source];
}

function SurfaceHeader({
  icon: Icon,
  eyebrow,
  title,
  meta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  meta: string;
}) {
  return (
    <header className="border-border bg-card flex shrink-0 items-center justify-between border-b px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="text-primary size-5 shrink-0" />
        <div className="min-w-0">
          <div className="label-cap-sm text-muted-foreground">{eyebrow}</div>
          <h1 className="text-foreground truncate font-mono text-[15px] font-bold">
            {title}
          </h1>
        </div>
      </div>
      <span className="text-muted-foreground font-mono text-[10px]">
        {meta}
      </span>
    </header>
  );
}

function PanelTitle({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="label-cap text-foreground/90">{title}</h2>
      <span className="text-muted-foreground font-mono text-[10px]">
        {meta}
      </span>
    </div>
  );
}

function EvidenceCard({
  title,
  body,
  meta,
}: {
  title: string;
  body: string;
  meta: string;
}) {
  return (
    <div className="border-border bg-card border px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-foreground truncate font-mono text-[11px] font-bold">
          {title}
        </span>
        <span className="text-muted-foreground font-mono text-[9px] uppercase">
          {meta}
        </span>
      </div>
      <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
        {body}
      </p>
    </div>
  );
}

function MiniEvent({ event }: { event: Event }) {
  return (
    <div className="grid grid-cols-[58px_1fr] gap-2 font-mono text-[10px]">
      <span className="text-muted-foreground">{_time(event._observed_at)}</span>
      <span className="text-foreground truncate">{event.description}</span>
    </div>
  );
}

function ActionSurfaceButton({
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
      className="border-border bg-card hover:bg-secondary border px-3 py-2 text-left"
    >
      <span className="text-foreground block font-mono text-[12px] font-bold">
        {label}
      </span>
      <span className="text-muted-foreground block font-mono text-[10px]">
        {meta}
      </span>
    </button>
  );
}

function CameraMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-primary/40 bg-background/70 border px-2 py-1.5">
      <div className="text-muted-foreground text-[9px]">{label}</div>
      <div className="text-primary font-bold">{value}</div>
    </div>
  );
}

function TelemetryRow({ unit }: { unit: Unit }) {
  return (
    <div className="border-border bg-card border px-3 py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-foreground font-mono text-[12px] font-bold">
          {unit.callsign}
        </span>
        <span className="text-primary font-mono text-[10px]">
          {unit.status.toUpperCase()}
        </span>
      </div>
      <div className="text-muted-foreground mt-1 grid grid-cols-3 gap-2 font-mono text-[10px]">
        <span>BAT {unit.battery_pct ?? '--'}%</span>
        <span>ALT {unit.altitude_m ?? '--'}m</span>
        <span>{unit.speed_mps ?? 0}m/s</span>
      </div>
    </div>
  );
}

function OntologyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border bg-card border px-3 py-2">
      <div className="label-cap-sm text-muted-foreground">{label}</div>
      <div className="text-foreground mt-1 font-mono text-[22px] font-bold">
        {value}
      </div>
    </div>
  );
}

function GraphRow({
  left,
  edge,
  right,
}: {
  left: string;
  edge: string;
  right: string;
}) {
  return (
    <div className="border-border bg-card grid grid-cols-[1fr_140px_1fr] items-center gap-3 border px-3 py-2 font-mono text-[11px]">
      <span className="text-foreground font-bold">{left}</span>
      <span className="text-muted-foreground text-center">{edge}</span>
      <span className="text-foreground text-right font-bold">{right}</span>
    </div>
  );
}

function CoaCard({
  title,
  body,
  risk,
}: {
  title: string;
  body: string;
  risk: string;
}) {
  return (
    <div className="border-border bg-background border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-foreground font-mono text-[12px] font-bold">
          {title}
        </h2>
        <span className="text-warning font-mono text-[9px] uppercase">
          risk {risk}
        </span>
      </div>
      <p className="text-muted-foreground mt-2 text-[12px] leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function TimelineBlock({
  t,
  title,
  body,
}: {
  t: string;
  title: string;
  body: string;
}) {
  return (
    <div className="grid grid-cols-[44px_1fr] gap-3">
      <span className="text-primary font-mono text-[12px] font-bold">{t}</span>
      <span>
        <span className="text-foreground block font-mono text-[11px] font-bold">
          {title}
        </span>
        <span className="text-muted-foreground block text-[11px] leading-snug">
          {body}
        </span>
      </span>
    </div>
  );
}

function InsightBlock({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <div className="border-border bg-card border p-3">
      <Icon className="text-primary mb-2 size-4" />
      <div className="label-cap-sm text-muted-foreground">{title}</div>
      <div className="text-foreground mt-1 text-[12px] leading-snug">
        {value}
      </div>
    </div>
  );
}

function objectName(object: AnyObject) {
  switch (object._type) {
    case 'Entity':
      return object.name ?? object._id;
    case 'Unit':
      return object.callsign;
    case 'Report':
      return object._source_ref ?? object._id;
    case 'Event':
      return object.verb ?? object._subtype;
    case 'Recommendation':
      return `${object.verb} ${object.short}`;
    case 'MissionObjective':
      return object.title;
    case 'Plan':
      return object.title;
    case 'Mission':
      return object.intent;
    case 'TaskingOrder':
      return object.command_type;
  }
}

function _time(iso: string) {
  return iso.split('T')[1]?.slice(0, 8) ?? iso;
}
