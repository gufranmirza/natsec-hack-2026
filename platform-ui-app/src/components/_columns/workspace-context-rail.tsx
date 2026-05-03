'use client';

import {
  Activity,
  Brain,
  Database,
  FileStack,
  GitBranch,
  Plane,
  Radio,
  ShieldCheck,
} from 'lucide-react';

import { ColCopilot } from '@/components/_columns/col-copilot';
import type { WorkspaceSectionId } from '@/components/_columns/col-status';
import type { DataSourceId } from '@/components/_columns/workspace-center';
import { SOURCE_LABELS } from '@/components/_columns/workspace-center';
import type {
  AnyObject,
  Entity,
  Event,
  Recommendation,
  Report,
  Unit,
} from '@/types/ontology';

interface WorkspaceContextRailProps {
  workspace: WorkspaceSectionId;
  entities: Entity[];
  units: Unit[];
  events: Event[];
  reports: Report[];
  recommendations: Recommendation[];
  activeFeedSource: DataSourceId;
  activeDroneFeed?: string;
  onSelect: (o: AnyObject) => void;
  onApprove: (rec: Recommendation) => void;
  onReject: (rec: Recommendation) => void;
  onModify: (rec: Recommendation) => void;
  /** Forward chat queries through the agent (control-plane → Azure OpenAI). */
  onAskCopilot?: (text: string) => Promise<string | null>;
  /** Forward to the global voice handler when the copilot mic is tapped. */
  onVoiceCommand?: () => void;
  /** Hint that voice capture is currently armed/listening. */
  voiceListening?: boolean;
}

export function WorkspaceContextRail({
  workspace,
  entities,
  units,
  events,
  reports,
  recommendations,
  activeFeedSource,
  activeDroneFeed,
  onSelect,
  onApprove,
  onReject,
  onModify,
  onAskCopilot,
  onVoiceCommand,
  voiceListening,
}: WorkspaceContextRailProps) {
  if (workspace === 'awareness') {
    return (
      <ColCopilot
        recommendations={recommendations}
        onSelect={onSelect}
        onApprove={onApprove}
        onReject={onReject}
        onModify={onModify}
        onAskCopilot={onAskCopilot}
        onVoiceCommand={onVoiceCommand}
        voiceListening={voiceListening}
      />
    );
  }

  if (workspace === 'integrations') {
    return (
      <ContextShell
        icon={Database}
        title="Fusion state"
        meta={SOURCE_LABELS[activeFeedSource]}
      >
        <MetricGrid
          metrics={[
            ['Reports', reports.length],
            ['Events', events.length],
            ['Linked objects', entities.length + units.length],
          ]}
        />
        <Panel title="Stream health" meta="source adapter">
          <StatusRow label="Radio ASR" value="live" />
          <StatusRow label="Satellite refresh" value="queued 02:00" />
          <StatusRow label="Allied liaison" value="live" />
          <StatusRow label="OSINT credibility" value="degraded" />
        </Panel>
        <Panel title="Newest feed deltas" meta="audit">
          {events.slice(0, 5).map((event) => (
            <EventLine key={event._id} event={event} />
          ))}
        </Panel>
      </ContextShell>
    );
  }

  if (workspace === 'drone_ops') {
    const drone =
      units.find((unit) => unit._id === activeDroneFeed) ??
      units.find((unit) => unit._subtype === 'drone');
    return (
      <ContextShell
        icon={Plane}
        title="Aircraft control"
        meta={drone?.callsign ?? 'no aircraft'}
      >
        <MetricGrid
          metrics={[
            ['Drones', units.filter((u) => u._subtype === 'drone').length],
            ['En route', units.filter((u) => u.status === 'en_route').length],
            ['Healthy', units.filter((u) => u.health === 'healthy').length],
          ]}
        />
        <Panel title="Live task" meta="simulated">
          <StatusRow
            label="Camera"
            value={drone ? `${drone.callsign} EO/IR` : 'standby'}
          />
          <StatusRow label="Autonomy" value="supervised" />
          <StatusRow label="Link" value="edge local" />
          <StatusRow label="Audit" value="recording" />
        </Panel>
        <Panel title="Last telemetry" meta="fleet">
          {units
            .filter((unit) => unit._subtype === 'drone')
            .map((unit) => (
              <StatusRow
                key={unit._id}
                label={unit.callsign}
                value={`${unit.status.toUpperCase()} · BAT ${unit.battery_pct ?? '--'}%`}
              />
            ))}
        </Panel>
      </ContextShell>
    );
  }

  if (workspace === 'objects') {
    return (
      <ContextShell
        icon={GitBranch}
        title="Ontology inspector"
        meta="object graph"
      >
        <MetricGrid
          metrics={[
            ['Entities', entities.length],
            ['Units', units.length],
            ['Evidence', reports.length + events.length],
          ]}
        />
        <Panel title="Object contracts" meta="enforced">
          <StatusRow label="Envelope" value="_type / _id / version" />
          <StatusRow label="Temporal" value="observed + ingested" />
          <StatusRow label="Source" value="adapter + source ref" />
          <StatusRow label="Links" value="entity refs + evidence refs" />
        </Panel>
        <Panel title="Hot objects" meta="priority">
          {['BOGEY-7', 'ROOK-1', 'V-117', 'SIG-A', 'SOCIAL-17'].map((label) => (
            <StatusRow key={label} label={label} value="linked" />
          ))}
        </Panel>
      </ContextShell>
    );
  }

  if (workspace === 'planning') {
    return (
      <ContextShell icon={FileStack} title="Planning context" meta="COA inputs">
        <Panel title="Constraints" meta="operator owned">
          <StatusRow label="Tasking" value="ISR / investigate only" />
          <StatusRow label="Approval" value="human required" />
          <StatusRow label="Connectivity" value="edge resilient" />
          <StatusRow label="Exposure" value="stand-off preferred" />
        </Panel>
        <Panel title="Decision variables" meta="planner">
          <StatusRow label="Time to visual" value="4m 02s" />
          <StatusRow label="Fuel margin" value="+18%" />
          <StatusRow label="Confidence gap" value="V-117 intent" />
          <StatusRow label="Fallback" value="observe only" />
        </Panel>
      </ContextShell>
    );
  }

  // Live counts for the right-rail model-inputs panel.
  const droneCount = units.filter((u) => u._subtype === 'drone').length;
  const onStationCount = units.filter(
    (u) => u._subtype === 'drone' && u.status === 'on_station'
  ).length;
  const reportSubtypes = new Set(reports.map((r) => r._subtype).filter(Boolean));
  const reportSummary =
    reports.length === 0
      ? 'no reports yet'
      : `${reports.length} · ${Array.from(reportSubtypes).slice(0, 3).join(' / ') || 'mixed'}`;
  const trackedEntities = entities.length;
  const pendingRecCount = recommendations.filter((r) => r.status === 'pending').length;
  const decidedRecCount = recommendations.filter(
    (r) => r.status === 'accepted' || r.status === 'rejected'
  ).length;

  // Suggested voice prompts adapt to current state. Pending decisions get
  // priority; otherwise nudge the operator toward a useful query.
  const suggestedPrompts: Array<{ icon: typeof Radio; text: string }> = [];
  if (pendingRecCount > 0) {
    suggestedPrompts.push({
      icon: ShieldCheck,
      text: `Why is the top recommendation pending?`,
    });
  }
  const hostiles = entities.filter(
    (e) => e.threat_level === 'high' || e.threat_level === 'med'
  );
  if (hostiles[0]) {
    const name = hostiles[0].name ?? hostiles[0]._subtype;
    suggestedPrompts.push({ icon: Radio, text: `Show me everything about ${name}` });
  }
  suggestedPrompts.push({
    icon: Plane,
    text: 'Give me an update on the last 10 minutes',
  });

  return (
    <ContextShell icon={Brain} title="AI context" meta="mission RAG">
      <MetricGrid
        metrics={[
          ['Objects', entities.length + units.length],
          ['Evidence', reports.length + events.length],
          ['Pending', pendingRecCount],
        ]}
      />
      <Panel title="Model inputs" meta="indexed live">
        <StatusRow
          label="Telemetry"
          value={`${droneCount} drones · ${onStationCount} on-station`}
        />
        <StatusRow label="Reports" value={reportSummary} />
        <StatusRow
          label="Tracks"
          value={
            trackedEntities === 0
              ? 'none'
              : `${trackedEntities} entities · ${hostiles.length} contested`
          }
        />
        <StatusRow
          label="Audit"
          value={`${events.length} events · ${decidedRecCount} decisions`}
        />
      </Panel>
      <Panel title="Suggested queries" meta="context-aware">
        {suggestedPrompts.slice(0, 3).map((p) => (
          <PromptLine key={p.text} icon={p.icon} text={p.text} />
        ))}
      </Panel>
    </ContextShell>
  );
}

function ContextShell({
  icon: Icon,
  title,
  meta,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <header className="border-border bg-card flex shrink-0 items-center justify-between border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="text-primary size-4 shrink-0" />
          <div className="min-w-0">
            <div className="label-cap-sm text-muted-foreground">Context</div>
            <div className="text-foreground truncate font-mono text-[12px] font-bold">
              {title}
            </div>
          </div>
        </div>
        <span className="text-muted-foreground font-mono text-[10px]">
          {meta}
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </aside>
  );
}

function MetricGrid({ metrics }: { metrics: Array<[string, number]> }) {
  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {metrics.map(([label, value]) => (
        <div key={label} className="border-border bg-card border p-2">
          <div className="label-cap-sm text-muted-foreground">{label}</div>
          <div className="text-foreground font-mono text-[18px] font-bold">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card mb-3 border last:mb-0">
      <div className="border-border bg-muted/30 flex items-baseline justify-between border-b px-3 py-1.5">
        <h2 className="label-cap text-foreground/90">{title}</h2>
        <span className="text-muted-foreground font-mono text-[10px]">
          {meta}
        </span>
      </div>
      <div className="grid gap-1.5 p-3">{children}</div>
    </section>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="text-foreground truncate text-right font-bold">
        {value}
      </span>
    </div>
  );
}

function EventLine({ event }: { event: Event }) {
  return (
    <div className="grid grid-cols-[16px_1fr] gap-2 text-[11px]">
      <Activity className="text-primary mt-0.5 size-3" />
      <div className="min-w-0">
        <div className="text-foreground truncate">{event.description}</div>
        <div className="text-muted-foreground font-mono text-[9px]">
          {event._source} · {event._observed_at.split('T')[1]?.slice(0, 8)}
        </div>
      </div>
    </div>
  );
}

function PromptLine({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="text-foreground flex items-center gap-2 text-[11px]">
      <Icon className="text-primary size-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
