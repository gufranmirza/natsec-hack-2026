'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Crosshair,
  Database,
  GitBranch,
  Layers,
  MapPin,
  Mic,
  Network,
  Plane,
  Play,
  Radio,
  RotateCcw,
  Satellite,
  ScanLine,
  Server,
  ShieldCheck,
  Smartphone,
  Square,
  Timer,
  Video,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

type Position = {
  lat: number;
  lon: number;
  grid: string;
  x: number;
  y: number;
};

type DroneAsset = {
  id: string;
  name: string;
  callsign: string;
  status: string;
  task: string;
  battery: number;
  payload: string;
  link_status: string;
  autonomy_mode: string;
  speed_kts: number;
  heading: number;
  position: Position;
};

type MissionEvent = {
  id: string;
  time: string;
  delta: string;
  kind: string;
  verb: string;
  body: string;
  source: string;
  tone: 'threat' | 'amber' | 'friendly' | 'muted';
  evidence?: string[];
};

type Recommendation = {
  id: string;
  title: string;
  proposed_command: string;
  asset_id: string;
  target_grid: string;
  confidence: number;
  eta: string;
  status: 'pending' | 'approved' | 'queued';
  why: string[];
  evidence: string[];
};

type SensorFeed = {
  asset_id: string;
  mode: string;
  title: string;
  signal: string;
  confidence: number;
  classification: string;
  overlays: string[];
};

type CopilotAnswer = {
  question: string;
  answer: string;
  citations: string[];
};

type MissionSnapshot = {
  mission_name: string;
  mission_time: string;
  scenario_step: number;
  scenario_label: string;
  edge_mode: 'synced' | 'degraded';
  cloud_link: 'healthy' | 'denied';
  comms_latency_ms: number;
  local_queue_count: number;
  commander_line: string;
  drones: DroneAsset[];
  events: MissionEvent[];
  recommendations: Recommendation[];
  sensor_feed: SensorFeed;
  copilot_answer: CopilotAnswer;
};

const API_BASE =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? 'http://localhost:8080';

const INITIAL_SNAPSHOT: MissionSnapshot = {
  mission_name: 'Silent Eye',
  mission_time: 'T+02:14:09',
  scenario_step: 3,
  scenario_label: 'Recommended',
  edge_mode: 'synced',
  cloud_link: 'healthy',
  comms_latency_ms: 92,
  local_queue_count: 0,
  commander_line:
    'We compress the OODA loop by turning sensor overload into human-approved autonomous drone tasking.',
  drones: [
    {
      id: 'rook-1',
      name: 'ROOK-1',
      callsign: 'ROOK-1',
      status: 'ready',
      task: 'Route scan east of convoy',
      battery: 78,
      payload: 'EO/IR + RF',
      link_status: 'synced',
      autonomy_mode: 'hold for approval',
      speed_kts: 72,
      heading: 88,
      position: {
        lat: 38.724,
        lon: 23.515,
        grid: '35S-QR-381',
        x: 570,
        y: 340,
      },
    },
    {
      id: 'rook-2',
      name: 'ROOK-2',
      callsign: 'ROOK-2',
      status: 'available',
      task: 'Perimeter orbit',
      battery: 84,
      payload: 'EO wide',
      link_status: 'synced',
      autonomy_mode: 'supervised',
      speed_kts: 88,
      heading: 215,
      position: {
        lat: 38.691,
        lon: 23.463,
        grid: '35S-QR-369',
        x: 420,
        y: 480,
      },
    },
    {
      id: 'rook-3',
      name: 'ROOK-3',
      callsign: 'ROOK-3',
      status: 'charging',
      task: 'Reserve launch slot',
      battery: 41,
      payload: 'relay',
      link_status: 'local',
      autonomy_mode: 'standby',
      speed_kts: 0,
      heading: 0,
      position: {
        lat: 38.705,
        lon: 23.492,
        grid: '35S-QR-372',
        x: 500,
        y: 420,
      },
    },
  ],
  events: [
    {
      id: 'evt-rf-anomaly',
      time: '14:23:01',
      delta: '46s ago',
      kind: 'rf',
      verb: 'Detected.',
      body: 'RF burst at grid 35S-QR-417 overlaps the convoy route and a gap in ROOK-1 visual coverage.',
      source: 'Edge RF sensor - local inference',
      tone: 'threat',
      evidence: ['RF bearing 071', 'Signal family matched 0.82'],
    },
    {
      id: 'evt-radio-grid',
      time: '14:21:44',
      delta: '2m 03s ago',
      kind: 'radio',
      verb: 'Reported.',
      body: 'BRAVO-3 reports two figures moving near the same grid; no positive identification.',
      source: 'Voice - BRAVO-3',
      tone: 'amber',
    },
    {
      id: 'evt-video-gap',
      time: '14:20:12',
      delta: '3m 35s ago',
      kind: 'video',
      verb: 'Lost.',
      body: 'ROOK-1 onboard video confidence dropped below threshold while crossing terrain shadow.',
      source: 'ROOK-1 - EO/IR',
      tone: 'amber',
    },
    {
      id: 'evt-rook2-ready',
      time: '14:18:30',
      delta: '5m 17s ago',
      kind: 'telemetry',
      verb: 'Ready.',
      body: 'ROOK-2 returned to perimeter orbit with 84 percent battery and clear payload status.',
      source: 'ROOK-2 - telemetry',
      tone: 'friendly',
    },
  ],
  recommendations: [
    {
      id: 'rec-rf-overwatch',
      title: 'Retask ROOK-1 to overwatch 35S-QR-417.',
      proposed_command: 'Investigate RF anomaly at grid 35S-QR-417',
      asset_id: 'rook-1',
      target_grid: '35S-QR-417',
      confidence: 0.86,
      eta: 'On-station in 3m 40s - fuel margin +21%',
      status: 'pending',
      why: [
        'RF anomaly aligns with convoy route',
        'Radio report in same grid',
        'ROOK-1 has EO/IR and RF payload',
      ],
      evidence: ['evt-rf-anomaly', 'evt-radio-grid', 'evt-video-gap'],
    },
    {
      id: 'rec-swarm-box',
      title: 'Stage ROOK-2 as relay and visual confirm.',
      proposed_command: 'Move ROOK-2 to relay orbit south of 35S-QR-417',
      asset_id: 'rook-2',
      target_grid: '35S-QR-404',
      confidence: 0.68,
      eta: 'Relay orbit in 5m 10s',
      status: 'pending',
      why: [
        'Maintains coverage if cloud link drops',
        'Separates sensor angle from ROOK-1',
      ],
      evidence: ['evt-rf-anomaly', 'evt-rook2-ready'],
    },
  ],
  sensor_feed: {
    asset_id: 'rook-1',
    mode: 'RF + EO/IR',
    title: 'Terrain shadow with RF burst',
    signal: 'Intermittent burst',
    confidence: 0.82,
    classification: 'Unidentified emitter',
    overlays: [
      'RF bearing 071',
      'EO confidence degraded',
      'Radio report nearby',
    ],
  },
  copilot_answer: {
    question: 'Why are you recommending ROOK-1?',
    answer:
      'ROOK-1 is the best first task because it already carries EO/IR plus RF, is closest to 35S-QR-417, and can close the video-confidence gap without waiting for cloud support.',
    citations: ['rec-rf-overwatch', 'evt-rf-anomaly', 'evt-video-gap'],
  },
};

const OPENING_SNAPSHOT: MissionSnapshot = {
  ...INITIAL_SNAPSHOT,
  mission_time: 'T+02:11:00',
  scenario_step: 0,
  scenario_label: 'Calm',
  commander_line:
    'Mission steady. Edge node is watching drone telemetry, unit positions, and local RF.',
  events: [
    {
      id: 'evt-rook2-ready',
      time: '14:18:30',
      delta: '5m 17s ago',
      kind: 'telemetry',
      verb: 'Ready.',
      body: 'ROOK-2 returned to perimeter orbit with 84 percent battery and clear payload status.',
      source: 'ROOK-2 - telemetry',
      tone: 'friendly',
    },
  ],
  recommendations: [],
  sensor_feed: {
    asset_id: 'rook-1',
    mode: 'EO',
    title: 'Route scan nominal',
    signal: 'Clean',
    confidence: 0.31,
    classification: 'No correlated threat',
    overlays: ['Convoy axis clear', 'RF quiet', 'EO confidence 0.91'],
  },
  copilot_answer: {
    question: 'What changed in the last 5 minutes?',
    answer:
      'Only routine telemetry has changed so far. The edge node is ready to correlate RF, radio, video, and unit reports as new signals arrive.',
    citations: ['evt-rook2-ready'],
  },
};

const COPILOT_QUESTIONS = [
  'Why are you recommending ROOK-1?',
  'What changed in the last 5 minutes?',
  'What assets can cover 35S-QR-417?',
  'What happens if cloud comms drop?',
];

const SCENARIO_BEATS = [
  'Calm',
  'RF anomaly',
  'Corroborated',
  'Recommended',
  'Approved',
  'Cloud denied',
  'Edge continues',
];

const OODA_STEPS = [
  { label: 'Observe', value: '4 feeds', detail: 'RF + EO + radio + telemetry' },
  { label: 'Orient', value: '0.82', detail: 'fused emitter confidence' },
  { label: 'Decide', value: '1 rec', detail: 'grounded with citations' },
  { label: 'Act', value: '<4m', detail: 'ROOK-1 tasking ETA' },
];

const EDGE_KIT = [
  { label: 'Operator UI', value: 'phone/laptop', icon: Smartphone },
  { label: 'Local control plane', value: 'single node', icon: Server },
  { label: 'Ontology mirror', value: 'typed objects', icon: Database },
  { label: 'Reasoning layer', value: 'rules + local model', icon: Cpu },
  { label: 'Drone link', value: 'supervised autonomy', icon: Network },
  { label: 'Sync queue', value: 'replay on restore', icon: GitBranch },
];

export default function Page() {
  const [snapshot, setSnapshot] = useState<MissionSnapshot>(INITIAL_SNAPSHOT);
  const [apiStatus, setApiStatus] = useState<'local' | 'synced'>('local');
  const [selectedQuestion, setSelectedQuestion] = useState(
    COPILOT_QUESTIONS[0]
  );

  useEffect(() => {
    void fetch(`${API_BASE}/api/v1/mission/snapshot`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('mission api unavailable');
        }
        return res.json() as Promise<MissionSnapshot>;
      })
      .then((data) => {
        setSnapshot(data);
        setApiStatus('synced');
      })
      .catch(() => setApiStatus('local'));
  }, []);

  const selectedDrone = snapshot.drones.find((drone) => drone.id === 'rook-1');

  async function approveRecommendation(rec: Recommendation) {
    const next = applyCommand(snapshot, rec);
    setSnapshot(next);

    try {
      const res = await fetch(`${API_BASE}/api/v1/drone-commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: rec.id,
          asset_id: rec.asset_id,
          command: rec.proposed_command,
          target_grid: rec.target_grid,
        }),
      });
      if (res.ok) {
        setSnapshot((await res.json()) as MissionSnapshot);
        setApiStatus('synced');
      }
    } catch {
      setApiStatus('local');
    }
  }

  async function advanceScenario() {
    const optimistic = advanceLocal(snapshot);
    setSnapshot(optimistic);

    try {
      const res = await fetch(`${API_BASE}/api/v1/scenario/advance`, {
        method: 'POST',
      });
      if (res.ok) {
        setSnapshot((await res.json()) as MissionSnapshot);
        setApiStatus('synced');
      }
    } catch {
      setApiStatus('local');
    }
  }

  async function resetScenario() {
    setSnapshot(OPENING_SNAPSHOT);

    try {
      const res = await fetch(`${API_BASE}/api/v1/scenario/reset`, {
        method: 'POST',
      });
      if (res.ok) {
        setSnapshot((await res.json()) as MissionSnapshot);
        setApiStatus('synced');
      }
    } catch {
      setApiStatus('local');
    }
  }

  async function askCopilot(question: string) {
    setSelectedQuestion(question);
    setSnapshot((current) => ({
      ...current,
      copilot_answer: answerForQuestion(question),
    }));

    try {
      const res = await fetch(`${API_BASE}/api/v1/copilot/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (res.ok) {
        setSnapshot((await res.json()) as MissionSnapshot);
        setApiStatus('synced');
      }
    } catch {
      setApiStatus('local');
    }
  }

  async function toggleComms() {
    const degraded = snapshot.edge_mode !== 'degraded';
    setSnapshot(applyComms(snapshot, degraded));

    try {
      const res = await fetch(`${API_BASE}/api/v1/comms/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ degraded }),
      });
      if (res.ok) {
        setSnapshot((await res.json()) as MissionSnapshot);
        setApiStatus('synced');
      }
    } catch {
      setApiStatus('local');
    }
  }

  return (
    <div className="bg-background relative flex h-full flex-1 flex-col overflow-hidden">
      <HeaderBar
        snapshot={snapshot}
        apiStatus={apiStatus}
        onAdvanceScenario={advanceScenario}
        onResetScenario={resetScenario}
        onToggleComms={toggleComms}
      />
      <MissionTimeline snapshot={snapshot} />
      <main className="bg-border grid flex-1 grid-cols-12 gap-px overflow-hidden">
        <section className="invert-surface col-span-12 overflow-hidden lg:col-span-8">
          <MapPane
            snapshot={snapshot}
            selectedDrone={selectedDrone}
            sensorFeed={snapshot.sensor_feed}
          />
        </section>
        <aside className="bg-background col-span-12 flex flex-col overflow-hidden lg:col-span-4">
          <ChangeFeed events={snapshot.events} />
          <CopilotPanel
            answer={snapshot.copilot_answer}
            selectedQuestion={selectedQuestion}
            onAsk={askCopilot}
          />
          <AutonomyEnvelope snapshot={snapshot} />
          <Recommendations
            recommendations={snapshot.recommendations}
            drones={snapshot.drones}
            onApprove={approveRecommendation}
          />
        </aside>
      </main>
      <VoiceAffordance />
    </div>
  );
}

function MissionTimeline({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="border-border/60 bg-background relative z-10 border-b px-5 py-2.5">
      <div className="flex items-center gap-3">
        <div className="hidden min-w-[180px] lg:block">
          <div className="label-cap text-muted-foreground">Demo spine</div>
          <div className="text-foreground font-serif text-[15px] italic">
            Centralized command. Decentralized execution.
          </div>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-7 gap-1.5">
          {SCENARIO_BEATS.map((beat, index) => {
            const active = snapshot.scenario_step === index;
            const complete = snapshot.scenario_step > index;
            return (
              <div
                key={beat}
                className={[
                  'relative min-w-0 rounded-sm border px-2 py-1.5',
                  active
                    ? 'border-primary bg-accent text-accent-foreground'
                    : complete
                      ? 'border-success/40 bg-success/5 text-foreground'
                      : 'border-border bg-card text-muted-foreground',
                ].join(' ')}
              >
                <div className="flex items-center gap-1.5">
                  {complete ? (
                    <CheckCircle2 className="text-success size-3 shrink-0" />
                  ) : active ? (
                    <Activity className="text-primary size-3 shrink-0" />
                  ) : (
                    <span className="bg-border block size-2 shrink-0 rounded-full" />
                  )}
                  <span className="truncate font-mono text-[10px]">
                    {index}. {beat}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden min-w-[150px] text-right xl:block">
          <div className="label-cap text-muted-foreground">OODA target</div>
          <div className="text-foreground font-mono text-[12px]">
            detect to task &lt; 60s
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderBar({
  snapshot,
  apiStatus,
  onAdvanceScenario,
  onResetScenario,
  onToggleComms,
}: {
  snapshot: MissionSnapshot;
  apiStatus: 'local' | 'synced';
  onAdvanceScenario: () => void;
  onResetScenario: () => void;
  onToggleComms: () => void;
}) {
  const degraded = snapshot.edge_mode === 'degraded';

  return (
    <header className="border-border/60 bg-background relative z-10 flex h-[76px] shrink-0 items-stretch border-b">
      <div className="border-border/60 flex w-[260px] items-center gap-3 border-r px-5">
        <div
          aria-hidden
          className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-sm"
        >
          <Crosshair className="size-4" strokeWidth={2.4} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-foreground font-serif text-[15px] italic tracking-tight">
            Mission Commander
          </span>
          <span className="label-cap text-muted-foreground">
            Drone Ops Console
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center px-8">
        <div className="flex items-baseline gap-5">
          <span className="label-cap text-muted-foreground/80">Operation</span>
          <h1 className="text-foreground font-serif text-[26px] italic leading-none tracking-tight">
            {snapshot.mission_name}
          </h1>
          <span className="text-muted-foreground font-mono text-[12px]">
            {snapshot.mission_time}
          </span>
        </div>
        <p className="text-muted-foreground mt-1 truncate text-[12px]">
          {snapshot.commander_line}
        </p>
      </div>

      <div className="flex items-center gap-3 px-5">
        <StatusPill
          icon={<Play className="size-3" />}
          label="Beat"
          value={`${snapshot.scenario_step} - ${snapshot.scenario_label}`}
          tone={snapshot.scenario_step >= 5 ? 'amber' : 'ok'}
        />
        <StatusPill
          icon={<Square className="size-3" />}
          label="Queue"
          value={`${snapshot.local_queue_count}`}
          tone={snapshot.local_queue_count > 0 ? 'amber' : 'ok'}
        />
        <StatusPill
          icon={
            degraded ? (
              <WifiOff className="size-3" />
            ) : (
              <Wifi className="size-3" />
            )
          }
          label="Edge"
          value={degraded ? 'Local' : 'Synced'}
          tone={degraded ? 'amber' : 'ok'}
        />
        <StatusPill
          icon={<Radio className="size-3" />}
          label="Comms"
          value={degraded ? 'Denied' : `${snapshot.comms_latency_ms}ms`}
          tone={degraded ? 'threat' : 'ok'}
        />
        <StatusPill
          label="API"
          value={apiStatus === 'synced' ? 'Live' : 'Fallback'}
          tone={apiStatus === 'synced' ? 'ok' : 'amber'}
        />
        <button
          type="button"
          onClick={onAdvanceScenario}
          className="border-border bg-card hover:bg-muted flex h-10 items-center gap-2 rounded-md border px-3 text-[12px] transition-colors"
        >
          <Play className="size-3.5" />
          Advance
        </button>
        <button
          type="button"
          onClick={onToggleComms}
          className="border-border bg-card hover:bg-muted flex h-10 items-center gap-2 rounded-md border px-3 text-[12px] transition-colors"
        >
          <RotateCcw className="size-3.5" />
          {degraded ? 'Restore link' : 'Degrade link'}
        </button>
        <button
          type="button"
          onClick={onResetScenario}
          aria-label="Reset scenario"
          className="border-border bg-card hover:bg-muted grid size-10 place-items-center rounded-md border transition-colors"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>
    </header>
  );
}

function StatusPill({
  icon,
  label,
  value,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  tone: 'ok' | 'amber' | 'threat';
}) {
  const dot =
    tone === 'ok'
      ? 'bg-success'
      : tone === 'amber'
        ? 'bg-warning'
        : 'bg-threat';
  return (
    <div className="hairline flex items-center gap-2 rounded-sm border border-transparent bg-transparent px-2 py-1.5">
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      <span className="label-cap text-muted-foreground">{label}</span>
      <span className="text-foreground font-mono text-[11px]">{value}</span>
    </div>
  );
}

function MapPane({
  snapshot,
  selectedDrone,
  sensorFeed,
}: {
  snapshot: MissionSnapshot;
  selectedDrone?: DroneAsset;
  sensorFeed: SensorFeed;
}) {
  return (
    <div className="topo relative size-full overflow-hidden">
      <TacticalMap snapshot={snapshot} />
      <div className="absolute left-6 top-6 flex flex-col gap-1.5">
        <LayerChip label="Drone assets" tone="friendly" active />
        <LayerChip label="RF anomaly" tone="threat" active />
        <LayerChip label="Friendly units" tone="amber" active />
        <LayerChip label="Edge execution" tone="muted" active />
      </div>
      <EdgeKitPanel snapshot={snapshot} />
      <OodaRail snapshot={snapshot} />
      <div className="bg-card border-border absolute right-6 top-6 rounded-md border px-3.5 py-2.5 shadow-[0_2px_8px_-4px_hsl(0_0%_0%/0.5)]">
        <div className="label-cap text-muted-foreground">Commander Query</div>
        <div className="text-foreground/95 mt-1 max-w-[260px] text-[12px] leading-snug">
          Why retask ROOK-1? RF, radio, and video-gap evidence converge at
          35S-QR-417.
        </div>
      </div>
      <div className="absolute bottom-6 left-6">
        <AssetRail drones={snapshot.drones} />
      </div>
      <SensorPreview feed={sensorFeed} />
      {selectedDrone ? <SelectedDroneCard drone={selectedDrone} /> : null}
    </div>
  );
}

function EdgeKitPanel({ snapshot }: { snapshot: MissionSnapshot }) {
  const degraded = snapshot.edge_mode === 'degraded';

  return (
    <div className="surface-card-elevated border-border absolute left-6 top-[154px] w-[292px] rounded-md border p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="label-cap text-muted-foreground">
            Backpack edge kit
          </div>
          <div className="text-foreground mt-0.5 font-serif text-[17px] italic">
            Cloud optional C2 stack
          </div>
        </div>
        <div
          className={[
            'grid size-8 place-items-center rounded-sm',
            degraded
              ? 'bg-warning text-warning-foreground'
              : 'bg-success text-success-foreground',
          ].join(' ')}
        >
          {degraded ? (
            <WifiOff className="size-4" />
          ) : (
            <Wifi className="size-4" />
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {EDGE_KIT.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="border-border bg-background/65 rounded-sm border px-2 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="text-primary size-3" />
                <span className="text-foreground font-mono text-[10px]">
                  {item.label}
                </span>
              </div>
              <div className="text-muted-foreground mt-0.5 truncate font-mono text-[9px]">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-border/60 mt-3 border-t pt-2">
        <div className="flex items-center justify-between">
          <span className="label-cap text-muted-foreground">
            Operating mode
          </span>
          <span className="text-foreground font-mono text-[10px]">
            {degraded ? 'local autonomy' : 'cloud synced'}
          </span>
        </div>
      </div>
    </div>
  );
}

function OodaRail({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="surface-card-elevated border-border absolute left-1/2 top-6 w-[390px] -translate-x-1/2 rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="text-primary size-4" />
          <div className="label-cap text-muted-foreground">
            OODA compression
          </div>
        </div>
        <span className="text-foreground font-mono text-[10px]">
          step {snapshot.scenario_step}/6
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {OODA_STEPS.map((step, index) => {
          const active = snapshot.scenario_step >= Math.min(index + 1, 4);
          return (
            <div
              key={step.label}
              className={[
                'rounded-sm border px-2 py-1.5',
                active
                  ? 'border-primary/45 bg-primary/10'
                  : 'border-border bg-background/55',
              ].join(' ')}
            >
              <div className="text-foreground font-mono text-[13px]">
                {step.value}
              </div>
              <div className="label-cap text-muted-foreground">
                {step.label}
              </div>
              <div className="text-muted-foreground mt-1 line-clamp-2 text-[10px] leading-tight">
                {step.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LayerChip({
  label,
  tone,
  active = false,
}: {
  label: string;
  tone: 'friendly' | 'threat' | 'amber' | 'muted';
  active?: boolean;
}) {
  const dotClass =
    tone === 'friendly'
      ? 'bg-friendly'
      : tone === 'threat'
        ? 'bg-threat'
        : tone === 'amber'
          ? 'bg-warning'
          : 'bg-muted-foreground/50';
  return (
    <div
      className={[
        'border-border flex w-fit items-center gap-2 rounded-md border px-2.5 py-1.5 shadow-[0_2px_8px_-4px_hsl(0_0%_0%/0.5)] transition-colors',
        active ? 'bg-card text-foreground' : 'bg-card/85 text-muted-foreground',
      ].join(' ')}
    >
      <span className={`size-1.5 rounded-full ${dotClass}`} />
      <span className="label-cap">{label}</span>
    </div>
  );
}

function AssetRail({ drones }: { drones: DroneAsset[] }) {
  return (
    <div className="bg-card border-border flex gap-2 rounded-md border p-2 shadow-[0_2px_8px_-4px_hsl(0_0%_0%/0.5)]">
      {drones.map((drone) => (
        <div key={drone.id} className="min-w-[112px] px-2 py-1">
          <div className="flex items-center gap-1.5">
            <Plane className="text-friendly size-3.5" />
            <span className="text-foreground font-mono text-[11px]">
              {drone.name}
            </span>
          </div>
          <div className="text-muted-foreground mt-1 font-mono text-[10px]">
            {drone.battery}% - {drone.status}
          </div>
        </div>
      ))}
    </div>
  );
}

function SensorPreview({ feed }: { feed: SensorFeed }) {
  return (
    <div className="surface-card-elevated border-border absolute bottom-6 right-[370px] w-[300px] rounded-md border p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Video className="text-friendly size-4" />
          <div>
            <div className="label-cap text-muted-foreground">ROOK payload</div>
            <div className="text-foreground font-mono text-[11px]">
              {feed.mode}
            </div>
          </div>
        </div>
        <div className="text-muted-foreground font-mono text-[10px]">
          {(feed.confidence * 100).toFixed(0)}%
        </div>
      </div>

      <div className="border-border relative mt-3 h-[132px] overflow-hidden rounded border bg-[hsl(222_32%_5%)]">
        <div className="absolute inset-0 opacity-80 [background:repeating-linear-gradient(0deg,hsl(150_35%_56%/0.10)_0,hsl(150_35%_56%/0.10)_1px,transparent_1px,transparent_7px),radial-gradient(circle_at_62%_46%,hsl(28_75%_60%/0.42),transparent_18%),radial-gradient(circle_at_48%_58%,hsl(200_55%_65%/0.28),transparent_22%),linear-gradient(135deg,hsl(222_35%_6%),hsl(222_30%_12%))]" />
        <div className="bg-friendly/70 absolute inset-x-0 top-1/2 h-px" />
        <div className="bg-friendly/70 absolute inset-y-0 left-1/2 w-px" />
        <div className="border-primary/80 bg-primary/10 absolute left-[58%] top-[38%] size-12 rounded-full border" />
        <div className="text-friendly absolute left-3 top-3 font-mono text-[10px]">
          {feed.signal}
        </div>
        <div className="text-muted-foreground absolute inset-x-3 bottom-3 font-mono text-[10px]">
          {feed.title}
        </div>
        <ScanLine className="text-primary absolute right-3 top-3 size-4" />
      </div>

      <div className="mt-3">
        <div className="text-foreground text-[12px]">{feed.classification}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {feed.overlays.map((overlay) => (
            <span
              key={overlay}
              className="border-border bg-muted text-muted-foreground rounded-sm border px-1.5 py-0.5 font-mono text-[10px]"
            >
              {overlay}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SelectedDroneCard({ drone }: { drone: DroneAsset }) {
  return (
    <div className="surface-card-elevated border-border absolute bottom-6 right-6 w-[336px] rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label-cap text-friendly">Selected Drone</div>
          <div className="text-foreground mt-1 font-serif text-2xl italic leading-tight tracking-tight">
            {drone.name}
          </div>
          <div className="text-muted-foreground mt-0.5 font-mono text-[11px]">
            {drone.payload} - {drone.autonomy_mode}
          </div>
        </div>
        <ShieldCheck className="text-success size-5" />
      </div>

      <div className="border-border/60 mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3">
        <Stat label="Grid" value={drone.position.grid} mono />
        <Stat label="Battery" value={`${drone.battery}%`} mono />
        <Stat label="Heading" value={`${drone.heading} deg`} mono />
        <Stat label="Speed" value={`${drone.speed_kts} kt`} mono />
        <Stat label="Link" value={drone.link_status} />
        <Stat label="Status" value={drone.status} />
      </div>

      <div className="border-border/60 mt-3 border-t pt-3">
        <span className="label-cap text-muted-foreground">Current Task</span>
        <p className="text-foreground/90 mt-1 text-[13px] leading-snug">
          {drone.task}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="label-cap text-muted-foreground/80">{label}</span>
      <span
        className={`text-foreground/95 ${mono ? 'font-mono text-[12px]' : 'text-[13px]'}`}
      >
        {value}
      </span>
    </div>
  );
}

function TacticalMap({ snapshot }: { snapshot: MissionSnapshot }) {
  const commandActive = snapshot.recommendations.some(
    (rec) => rec.status === 'approved' || rec.status === 'queued'
  );
  const degraded = snapshot.edge_mode === 'degraded';

  return (
    <svg
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <g stroke="hsl(38 20% 70% / 0.06)" strokeWidth="0.6">
        {Array.from({ length: 21 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="700" />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 50} x2="1000" y2={i * 50} />
        ))}
      </g>
      <g fill="none" stroke="hsl(28 40% 65% / 0.18)" strokeWidth="1.1">
        <path d="M -20 220 Q 180 160, 360 240 T 760 200 T 1020 260" />
        <path d="M -20 320 Q 180 280, 360 350 T 760 315 T 1020 390" />
        <path d="M -20 460 C 80 420, 220 480, 320 440 S 540 470, 660 430 S 880 450, 1020 410" />
      </g>
      <g stroke="hsl(38 20% 70% / 0.12)" strokeWidth="0.7">
        {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((x) => (
          <line key={`major-v-${x}`} x1={x} y1="0" x2={x} y2="700" />
        ))}
        {[0, 100, 200, 300, 400, 500, 600, 700].map((y) => (
          <line key={`major-h-${y}`} x1="0" y1={y} x2="1000" y2={y} />
        ))}
      </g>
      <g
        fontFamily="var(--font-mono)"
        fontSize="9"
        fill="hsl(38 18% 60% / 0.72)"
      >
        <text x="618" y="292">
          35S-QR-417
        </text>
        <text x="250" y="488">
          CONVOY ROUTE
        </text>
        <text x="555" y="403">
          RELAY BOX
        </text>
      </g>
      <g
        fontFamily="var(--font-serif)"
        fontStyle="italic"
        fill="hsl(38 25% 75% / 0.55)"
      >
        <text x="190" y="180" fontSize="14">
          Limnos
        </text>
        <text x="380" y="600" fontSize="13">
          Aegean Sea
        </text>
      </g>

      <path
        d="M 555 372 L 640 315 L 710 360 L 610 430 Z"
        fill="hsl(200 55% 65% / 0.08)"
        stroke="hsl(200 55% 65% / 0.34)"
        strokeWidth="1"
        strokeDasharray="6 5"
      />
      <path
        d="M 610 282 L 692 300 L 720 360 L 650 410 L 580 365 Z"
        fill="hsl(12 78% 60% / 0.10)"
        stroke="hsl(12 78% 60% / 0.45)"
        strokeWidth="1"
      />
      <path
        d="M 320 500 C 420 435, 525 405, 650 330"
        fill="none"
        stroke="hsl(35 88% 62% / 0.6)"
        strokeWidth="1.6"
        strokeDasharray="4 5"
      />
      <text
        x="315"
        y="520"
        fontFamily="var(--font-mono)"
        fontSize="10"
        fill="hsl(35 88% 75%)"
      >
        CONVOY AXIS
      </text>

      <g transform="translate(650 315)">
        <circle
          r="34"
          className="pulse-ring"
          fill="hsl(12 78% 60% / 0.18)"
          stroke="hsl(12 78% 60% / 0.7)"
        />
        <circle r="18" fill="hsl(12 78% 60% / 0.14)" stroke="hsl(12 78% 60%)" />
        <Crosshair
          x="-8"
          y="-8"
          width="16"
          height="16"
          stroke="hsl(12 78% 70%)"
        />
        <text
          x="25"
          y="-8"
          fontFamily="var(--font-mono)"
          fontSize="11"
          fill="hsl(12 78% 70%)"
        >
          RF-417
        </text>
        <text
          x="25"
          y="6"
          fontFamily="var(--font-mono)"
          fontSize="9"
          fill="hsl(38 18% 65%)"
        >
          35S-QR-417
        </text>
      </g>

      {degraded ? (
        <g transform="translate(790 96)">
          <rect
            x="-88"
            y="-24"
            width="176"
            height="48"
            rx="4"
            fill="hsl(222 30% 9% / 0.92)"
            stroke="hsl(35 88% 62% / 0.55)"
          />
          <Satellite
            x="-72"
            y="-8"
            width="16"
            height="16"
            stroke="hsl(35 88% 62%)"
          />
          <text
            x="-48"
            y="-2"
            fontFamily="var(--font-mono)"
            fontSize="10"
            fill="hsl(35 88% 75%)"
          >
            CLOUD LINK DENIED
          </text>
          <text
            x="-48"
            y="13"
            fontFamily="var(--font-mono)"
            fontSize="9"
            fill="hsl(38 18% 65%)"
          >
            EDGE QUEUE ACTIVE
          </text>
        </g>
      ) : null}

      {commandActive ? (
        <path
          d="M 570 340 Q 610 326, 650 315"
          fill="none"
          stroke="hsl(200 55% 65%)"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      ) : null}

      {snapshot.drones.map((drone) => (
        <g
          key={drone.id}
          transform={`translate(${drone.position.x} ${drone.position.y}) rotate(${drone.heading})`}
        >
          <circle
            r="10"
            fill="hsl(222 32% 7%)"
            stroke={
              drone.status === 'charging'
                ? 'hsl(35 88% 62%)'
                : 'hsl(200 50% 68%)'
            }
            strokeWidth="1.5"
          />
          <polygon points="0,-14 5,-6 -5,-6" fill="hsl(200 50% 68%)" />
          <text
            x="16"
            y="-3"
            transform={`rotate(${-drone.heading})`}
            fontFamily="var(--font-mono)"
            fontSize="10"
            fontWeight="600"
            fill="hsl(200 50% 78%)"
          >
            {drone.name}
          </text>
          <text
            x="16"
            y="11"
            transform={`rotate(${-drone.heading})`}
            fontFamily="var(--font-mono)"
            fontSize="9"
            fill="hsl(38 18% 65%)"
          >
            {drone.battery}% - {drone.status}
          </text>
        </g>
      ))}

      <g transform="translate(355 510)">
        <rect
          x="-8"
          y="-8"
          width="16"
          height="16"
          fill="hsl(222 32% 7%)"
          stroke="hsl(35 88% 62%)"
        />
        <text
          x="15"
          y="4"
          fontFamily="var(--font-mono)"
          fontSize="10"
          fill="hsl(35 88% 75%)"
        >
          BRAVO-3
        </text>
      </g>
      <g transform="translate(650 315)">
        <MapPin
          x="-8"
          y="-44"
          width="16"
          height="16"
          stroke="hsl(28 75% 60%)"
        />
      </g>
    </svg>
  );
}

function ChangeFeed({ events }: { events: MissionEvent[] }) {
  return (
    <div className="border-border/60 flex min-h-0 flex-1 flex-col border-b">
      <div className="border-border/60 flex shrink-0 items-baseline justify-between gap-4 border-b px-6 py-4">
        <div>
          <div className="label-cap text-muted-foreground">Live fusion</div>
          <h2 className="text-foreground mt-0.5 font-serif text-[22px] italic leading-none tracking-tight">
            What changed.
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <FilterChip label="All" active />
          <FilterChip label="RF" />
          <FilterChip label="Audit" />
        </div>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
        {events.map((event, index) => (
          <li
            key={event.id}
            className={[
              'border-border/60 group relative flex gap-5 border-b py-4 last:border-b-0',
              index === 0 ? 'feed-enter' : '',
            ].join(' ')}
          >
            <div className="flex w-[80px] shrink-0 flex-col items-end pr-2 pt-0.5">
              <span className="text-foreground/85 font-mono text-[11px]">
                {event.time}
              </span>
              <span className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                {event.delta}
              </span>
            </div>
            <div
              aria-hidden
              className="border-border/60 relative shrink-0 border-l pr-2"
              style={{ marginLeft: -18 }}
            >
              <span
                className={[
                  'absolute top-1.5 size-2 rounded-full ring-2',
                  event.tone === 'threat'
                    ? 'bg-threat ring-threat/15'
                    : event.tone === 'amber'
                      ? 'bg-warning ring-warning/15'
                      : event.tone === 'friendly'
                        ? 'bg-friendly ring-friendly/15'
                        : 'bg-muted-foreground/60 ring-muted-foreground/15',
                ].join(' ')}
                style={{ left: -5 }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground/95 text-[13.5px] leading-relaxed">
                <span
                  className={[
                    'mr-2 font-serif text-[15px] italic',
                    event.tone === 'threat'
                      ? 'text-threat'
                      : event.tone === 'amber'
                        ? 'text-warning'
                        : event.tone === 'friendly'
                          ? 'text-friendly'
                          : 'text-foreground',
                  ].join(' ')}
                >
                  {event.verb}
                </span>
                {event.body}
              </p>
              <div className="text-muted-foreground/90 mt-1.5 flex items-center gap-2 text-[11px]">
                <span className="label-cap">Source</span>
                <span className="font-mono">{event.source}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={[
        'rounded-sm border px-2 py-1 text-[11px] transition-colors',
        active
          ? 'border-border bg-card text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function CopilotPanel({
  answer,
  selectedQuestion,
  onAsk,
}: {
  answer: CopilotAnswer;
  selectedQuestion: string;
  onAsk: (question: string) => void;
}) {
  return (
    <div className="border-border/60 shrink-0 border-b px-6 py-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="text-primary size-4" />
          <h2 className="text-foreground font-serif text-[18px] italic tracking-tight">
            Commander copilot
          </h2>
        </div>
        <span className="label-cap text-muted-foreground">Grounded</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {COPILOT_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onAsk(question)}
            className={[
              'min-h-9 rounded-sm border px-2 py-1.5 text-left text-[11px] leading-tight transition-colors',
              selectedQuestion === question
                ? 'border-primary/50 bg-accent text-accent-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {question}
          </button>
        ))}
      </div>
      <div className="surface-card border-border mt-3 rounded-md border p-3">
        <div className="label-cap text-muted-foreground">{answer.question}</div>
        <p className="text-foreground/90 mt-2 text-[13px] leading-relaxed">
          {answer.answer}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {answer.citations.map((citation) => (
            <span
              key={citation}
              className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 font-mono text-[10px]"
            >
              {citation}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AutonomyEnvelope({ snapshot }: { snapshot: MissionSnapshot }) {
  const degraded = snapshot.edge_mode === 'degraded';
  const approved = snapshot.recommendations.some(
    (rec) => rec.status === 'approved' || rec.status === 'queued'
  );

  const controls = [
    {
      label: 'Human gate',
      value: approved ? 'approved' : 'required',
      tone: approved ? 'ok' : 'amber',
      icon: ShieldCheck,
    },
    {
      label: 'Rules of tasking',
      value: 'ISR only',
      tone: 'ok',
      icon: Layers,
    },
    {
      label: 'Local queue',
      value: degraded ? `${snapshot.local_queue_count} pending` : 'clear',
      tone: degraded ? 'amber' : 'ok',
      icon: GitBranch,
    },
    {
      label: 'Sync window',
      value: degraded ? 'on restore' : 'live',
      tone: degraded ? 'amber' : 'ok',
      icon: Timer,
    },
  ];

  return (
    <div className="border-border/60 shrink-0 border-b px-6 py-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-foreground font-serif text-[17px] italic tracking-tight">
          Autonomy envelope
        </h2>
        <span className="label-cap text-muted-foreground">Human in loop</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {controls.map((control) => {
          const Icon = control.icon;
          return (
            <div
              key={control.label}
              className="border-border bg-card rounded-sm border px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Icon
                    className={[
                      'size-3.5 shrink-0',
                      control.tone === 'ok' ? 'text-success' : 'text-warning',
                    ].join(' ')}
                  />
                  <span className="text-muted-foreground truncate font-mono text-[10px]">
                    {control.label}
                  </span>
                </div>
                <span
                  className={[
                    'size-1.5 shrink-0 rounded-full',
                    control.tone === 'ok' ? 'bg-success' : 'bg-warning',
                  ].join(' ')}
                />
              </div>
              <div className="text-foreground mt-1 font-mono text-[11px]">
                {control.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Recommendations({
  recommendations,
  drones,
  onApprove,
}: {
  recommendations: Recommendation[];
  drones: DroneAsset[];
  onApprove: (rec: Recommendation) => void;
}) {
  const droneByID = useMemo(
    () => new Map(drones.map((drone) => [drone.id, drone])),
    [drones]
  );

  return (
    <div className="flex min-h-[220px] flex-1 flex-col overflow-hidden">
      <div className="border-border/60 flex items-baseline justify-between border-b px-6 py-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-foreground font-serif text-[18px] italic tracking-tight">
            Human-approved tasks
          </h2>
          <span className="label-cap text-muted-foreground">
            Hybrid AI layer
          </span>
        </div>
        <span className="text-muted-foreground font-mono text-[10px]">
          {recommendations.length} candidates
        </span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto p-3">
        {recommendations.map((rec) => {
          const drone = droneByID.get(rec.asset_id);
          return (
            <li
              key={rec.id}
              className="surface-card hairline hover:border-primary/60 group mb-2 rounded-md border p-3.5 transition-colors last:mb-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-foreground text-[14px] leading-snug">
                    <span className="text-foreground mr-1 font-serif text-[16px] italic">
                      Recommend
                    </span>
                    {rec.title}
                  </p>
                  <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <span className="font-mono">{rec.eta}</span>
                    <span aria-hidden className="text-muted-foreground/40">
                      -
                    </span>
                    <span>Asset: {drone?.name ?? rec.asset_id}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ConfidenceMeter v={rec.confidence} />
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {(rec.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-1.5">
                {rec.why.map((why) => (
                  <div
                    key={why}
                    className="flex items-center gap-2 text-[12px]"
                  >
                    <span className="bg-primary size-1.5 rounded-full" />
                    <span className="text-foreground/80">{why}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="size-3.5" />
                  <span className="label-cap">
                    {rec.status === 'approved'
                      ? 'Approved'
                      : rec.status === 'queued'
                        ? 'Queued locally'
                        : 'Approval required'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={
                    rec.status === 'approved' || rec.status === 'queued'
                  }
                  onClick={() => onApprove(rec)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground inline-flex items-center gap-1 rounded-sm px-3 py-1 text-[12px] font-medium transition-colors"
                >
                  {rec.status === 'pending' ? 'Approve' : 'Tasking'}
                  <ChevronRight className="size-3" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ConfidenceMeter({ v }: { v: number }) {
  const filled = Math.round(v * 8);
  const tone =
    v >= 0.8
      ? 'bg-primary'
      : v >= 0.6
        ? 'bg-success'
        : 'bg-muted-foreground/60';
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className={`block h-2.5 w-1 rounded-[1px] ${i < filled ? tone : 'bg-border/80'}`}
        />
      ))}
    </div>
  );
}

function VoiceAffordance() {
  return (
    <div className="pointer-events-none fixed bottom-7 right-7 z-50 flex flex-col items-end gap-2">
      <div className="bg-background/85 hairline rounded-full border px-3 py-1.5 backdrop-blur-md">
        <span className="text-muted-foreground font-mono text-[10px]">
          Voice: task ROOK-1 to investigate
        </span>
      </div>
      <button
        type="button"
        aria-label="Push to talk"
        className="mic-breath bg-primary text-primary-foreground pointer-events-auto grid size-14 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95"
      >
        <Mic className="size-6" strokeWidth={2.2} />
      </button>
    </div>
  );
}

function applyCommand(
  snapshot: MissionSnapshot,
  rec: Recommendation
): MissionSnapshot {
  const degraded = snapshot.edge_mode === 'degraded';
  const events = [
    {
      id: `local-audit-${rec.id}`,
      time: '14:24:18',
      delta: 'now',
      kind: 'audit',
      verb: degraded ? 'Queued.' : 'Approved.',
      body: degraded
        ? `Commander approved ${rec.proposed_command}. Edge node queued the action locally for replay on reconnect.`
        : `Commander approved ${rec.proposed_command}. Asset continues under edge-local supervised autonomy.`,
      source: degraded
        ? 'Edge action queue - human in loop'
        : 'Action audit - human in loop',
      tone: 'friendly' as const,
      evidence: rec.evidence,
    },
    ...snapshot.events.filter((event) => event.id !== `local-audit-${rec.id}`),
  ];

  return {
    ...snapshot,
    drones: snapshot.drones.map((drone) =>
      drone.id === rec.asset_id
        ? {
            ...drone,
            status: 'tasking',
            task: rec.proposed_command,
            battery: Math.max(0, drone.battery - 3),
            link_status: 'edge-local',
            autonomy_mode: 'supervised',
            speed_kts: 96,
            heading: 71,
            position: {
              lat: 38.732,
              lon: 23.552,
              grid: rec.target_grid,
              x: rec.asset_id === 'rook-2' ? 585 : 640,
              y: rec.asset_id === 'rook-2' ? 380 : 315,
            },
          }
        : drone
    ),
    recommendations: snapshot.recommendations.map((candidate) =>
      candidate.id === rec.id
        ? { ...candidate, status: degraded ? 'queued' : 'approved' }
        : candidate
    ),
    scenario_step: Math.max(snapshot.scenario_step, 4),
    scenario_label: degraded ? 'Queued locally' : 'Human approved',
    local_queue_count: degraded
      ? snapshot.local_queue_count + 1
      : snapshot.local_queue_count,
    sensor_feed: {
      asset_id: rec.asset_id,
      mode: 'EO/IR + RF',
      title: 'On station over 35S-QR-417',
      signal: 'RF source localized',
      confidence: 0.89,
      classification: 'Probable handheld emitter',
      overlays: [
        'Heat trace in terrain shadow',
        'RF bearing stable',
        'Human approval logged',
      ],
    },
    events,
  };
}

function applyComms(
  snapshot: MissionSnapshot,
  degraded: boolean
): MissionSnapshot {
  const event: MissionEvent = degraded
    ? {
        id: 'local-comms-denied',
        time: '14:24:27',
        delta: 'now',
        kind: 'comms',
        verb: 'Degraded.',
        body: 'Cloud bridge dropped. Mission state remains available from the edge node; command queue is durable until reconnect.',
        source: 'Edge node - comms monitor',
        tone: 'amber',
      }
    : {
        id: 'local-comms-restored',
        time: '14:25:03',
        delta: 'now',
        kind: 'comms',
        verb: 'Restored.',
        body: 'Cloud bridge restored. Edge action log replayed without conflict.',
        source: 'Edge node - sync queue',
        tone: 'friendly',
      };

  return {
    ...snapshot,
    edge_mode: degraded ? 'degraded' : 'synced',
    cloud_link: degraded ? 'denied' : 'healthy',
    comms_latency_ms: degraded ? 0 : 92,
    scenario_step: degraded
      ? Math.max(snapshot.scenario_step, 5)
      : snapshot.scenario_step,
    scenario_label: degraded ? 'Cloud denied' : 'Reconnected',
    local_queue_count: degraded ? Math.max(snapshot.local_queue_count, 1) : 0,
    commander_line: degraded
      ? 'Cloud denied. Edge node continues local fusion, recommendations, and drone tasking.'
      : 'Centralized command, decentralized execution.',
    events: [
      event,
      ...snapshot.events.filter(
        (existing) =>
          existing.id !== 'local-comms-denied' &&
          existing.id !== 'local-comms-restored'
      ),
    ],
  };
}

function advanceLocal(snapshot: MissionSnapshot): MissionSnapshot {
  const next = Math.min(snapshot.scenario_step + 1, 6);

  if (next === 1) {
    return {
      ...snapshot,
      scenario_step: 1,
      scenario_label: 'RF anomaly',
      commander_line: 'Edge RF sensor detects a burst near the convoy route.',
      events: prependUnique(snapshot.events, {
        id: 'evt-rf-anomaly',
        time: '14:23:01',
        delta: '46s ago',
        kind: 'rf',
        verb: 'Detected.',
        body: 'RF burst at grid 35S-QR-417 overlaps the convoy route and a gap in ROOK-1 visual coverage.',
        source: 'Edge RF sensor - local inference',
        tone: 'threat',
        evidence: ['RF bearing 071', 'Signal family matched 0.82'],
      }),
      sensor_feed: {
        asset_id: 'rook-1',
        mode: 'RF + EO/IR',
        title: 'Terrain shadow with RF burst',
        signal: 'Intermittent burst',
        confidence: 0.82,
        classification: 'Unidentified emitter',
        overlays: [
          'RF bearing 071',
          'EO confidence degraded',
          'Radio report nearby',
        ],
      },
    };
  }

  if (next === 2) {
    return {
      ...snapshot,
      scenario_step: 2,
      scenario_label: 'Corroborated',
      commander_line:
        'Radio, RF, and EO uncertainty converge on the same grid.',
      events: prependUnique(
        prependUnique(snapshot.events, {
          id: 'evt-radio-grid',
          time: '14:21:44',
          delta: '2m 03s ago',
          kind: 'radio',
          verb: 'Reported.',
          body: 'BRAVO-3 reports two figures moving near the same grid; no positive identification.',
          source: 'Voice - BRAVO-3',
          tone: 'amber',
        }),
        {
          id: 'evt-video-gap',
          time: '14:20:12',
          delta: '3m 35s ago',
          kind: 'video',
          verb: 'Lost.',
          body: 'ROOK-1 onboard video confidence dropped below threshold while crossing terrain shadow.',
          source: 'ROOK-1 - EO/IR',
          tone: 'amber',
        }
      ),
    };
  }

  if (next === 3) {
    return {
      ...snapshot,
      scenario_step: 3,
      scenario_label: 'Recommended',
      commander_line:
        'The hybrid AI layer proposes a supervised drone task with cited evidence.',
      recommendations: INITIAL_SNAPSHOT.recommendations,
      copilot_answer: answerForQuestion('Why are you recommending ROOK-1?'),
    };
  }

  if (next === 4) {
    const rec =
      snapshot.recommendations[0] ?? INITIAL_SNAPSHOT.recommendations[0];
    return applyCommand(
      {
        ...snapshot,
        recommendations: snapshot.recommendations.length
          ? snapshot.recommendations
          : INITIAL_SNAPSHOT.recommendations,
      },
      rec
    );
  }

  if (next === 5) {
    return applyComms(snapshot, true);
  }

  return {
    ...snapshot,
    scenario_step: 6,
    scenario_label: 'Edge continues',
    commander_line:
      'The edge node keeps fusing, tasking, and queuing actions while disconnected.',
    recommendations: prependRecommendation(snapshot.recommendations, {
      id: 'rec-edge-queue',
      title: 'Keep ROOK-2 in relay orbit until cloud sync returns.',
      proposed_command: 'Hold ROOK-2 as edge relay for ROOK-1 tasking',
      asset_id: 'rook-2',
      target_grid: '35S-QR-404',
      confidence: 0.74,
      eta: 'Already within relay basket',
      status: 'pending',
      why: [
        'Cloud bridge is denied',
        'ROOK-2 can preserve local command coverage',
        'Action queue will replay on reconnect',
      ],
      evidence: ['local-comms-denied', 'local-audit-rec-rf-overwatch'],
    }),
  };
}

function answerForQuestion(question: string): CopilotAnswer {
  const q = question.toLowerCase();
  if (q.includes('why') || q.includes('rook-1')) {
    return {
      question,
      answer:
        'ROOK-1 is the best first task because it already carries EO/IR plus RF, is closest to 35S-QR-417, and can close the video-confidence gap without waiting for cloud support.',
      citations: ['rec-rf-overwatch', 'evt-rf-anomaly', 'evt-video-gap'],
    };
  }
  if (q.includes('cloud') || q.includes('drop')) {
    return {
      question,
      answer:
        'If cloud comms drop, the edge node keeps the mission snapshot, recommendations, and drone command queue local. Approved actions are audited and replayed when the bridge restores.',
      citations: ['local-comms-denied', 'local-audit-rec-rf-overwatch'],
    };
  }
  if (q.includes('asset') || q.includes('cover')) {
    return {
      question,
      answer:
        'ROOK-1 can investigate directly; ROOK-2 should hold a relay/confirmation orbit; ROOK-3 is a reserve relay asset with low battery.',
      citations: ['rec-rf-overwatch', 'rec-swarm-box'],
    };
  }
  return {
    question,
    answer:
      'In the last five minutes the system fused an RF burst, a nearby radio report, and degraded ROOK-1 video confidence into one recommended supervised drone task.',
    citations: ['evt-rf-anomaly', 'evt-radio-grid', 'evt-video-gap'],
  };
}

function prependUnique(events: MissionEvent[], event: MissionEvent) {
  return [event, ...events.filter((existing) => existing.id !== event.id)];
}

function prependRecommendation(
  recommendations: Recommendation[],
  recommendation: Recommendation
) {
  return [
    recommendation,
    ...recommendations.filter((existing) => existing.id !== recommendation.id),
  ];
}
