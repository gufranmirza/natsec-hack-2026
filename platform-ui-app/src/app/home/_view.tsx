'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Database,
  FileStack,
  MapPinned,
  Mic,
  Network,
  Plane,
  Send,
} from 'lucide-react';

import {
  ColStatus,
  type WorkspaceSectionId,
} from '@/components/_columns/col-status';
import {
  type DataSourceId,
  LiveFeedStrip,
  type MissionAnswer,
  WorkspaceCenter,
} from '@/components/_columns/workspace-center';
import { WorkspaceContextRail } from '@/components/_columns/workspace-context-rail';
import { ObjectDrawer } from '@/components/_layout/object-drawer';
import { OpStatusBar } from '@/components/_layout/op-status-bar';
import { buildAiSuggestions } from '@/lib/ai-suggestions';
import { ACTIVE_MISSION_ID } from '@/lib/fixtures';
import {
  type ScenarioHandle,
  startUnknownContactScenario,
} from '@/lib/scenarios/unknown-contact';
import { normalizeRecommendation } from '@/services/cp/recommendations/recommendations-api';
import { useDemoData } from '@/services/cp/use-demo-data';
import type {
  AnyObject,
  Entity,
  Event,
  MissionObjective,
  Recommendation,
  Report,
  Unit,
} from '@/types/ontology';

interface VoiceRecognitionAlternative { readonly transcript: string; readonly confidence?: number; }
interface VoiceRecognitionResultItem {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: VoiceRecognitionAlternative;
}
interface VoiceRecognitionResult {
  readonly resultIndex: number;
  readonly results: { readonly length: number; readonly [index: number]: VoiceRecognitionResultItem };
}
interface VoiceRecognitionErrorEvent { readonly error: string; readonly message?: string; }

interface VoiceRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: VoiceRecognitionResult) => void) | null;
  onerror: ((event: VoiceRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onnomatch: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type VoiceRecognitionCtor = new () => VoiceRecognition;

// Base URL for the platform-control-plane HTTP API.
// Default matches LISTEN_ADDR in platform-control-plane/.env (:8080).
// Override via NEXT_PUBLIC_PLATFORM_API_URL at build time.
const API_BASE =
  (typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_PLATFORM_API_URL) ||
  'http://localhost:8080';

// Wire shape of POST /api/v1/operator/query responses (mirrors the Go
// QueryResponse struct in internal/api/agent/handler.go). Recommendations
// and Events come back as ontology Object handles ({ _type, _id, ... }).
interface AgentQueryResponse {
  query_id: string;
  transcript: string;
  intent: { type: string; confidence: number };
  ai_response: { text: string };
  recommendations: Recommendation[];
  events: Event[];
  generated_at: string;
}

const VOICE_ERROR_MESSAGES: Record<string, string> = {
  'no-speech': 'No speech detected — tap and speak.',
  'audio-capture': 'No microphone available.',
  'not-allowed': 'Mic permission denied — enable in browser settings.',
  'service-not-allowed': 'Speech service blocked.',
  'network': 'Network error during recognition.',
  'aborted': '',
  'language-not-supported': 'en-US not available on this device.',
};

const WORKSPACES: Array<{
  id: WorkspaceSectionId;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'awareness',
    label: 'Situational Awareness',
    short: 'COP',
    icon: MapPinned,
  },
  { id: 'drone_ops', label: 'Drone Ops', short: 'UAS', icon: Plane },
  {
    id: 'integrations',
    label: 'Data Integrations',
    short: 'FUSE',
    icon: Database,
  },
  { id: 'objects', label: 'Object Management', short: 'OBJ', icon: Network },
  { id: 'planning', label: 'Mission Planning', short: 'PLAN', icon: FileStack },
  { id: 'intelligence', label: 'AI Intelligence', short: 'AI', icon: Brain },
];

const SOURCE_SHORT_LABELS: Record<DataSourceId, string> = {
  radio: 'radio traffic',
  satellite: 'satellite imagery',
  intel: 'intelligence reports',
  social: 'public OSINT',
  allies: 'allied communications',
  drone_video: 'drone video',
};

const FALLBACK_MISSION: MissionObjective = {
  _type: 'MissionObjective',
  _id: 'obj_unloaded',
  _version: 0,
  _source: 'fallback',
  _source_ref: 'NO-MISSION',
  _observed_at: new Date(0).toISOString(),
  _ingested_at: new Date(0).toISOString(),
  title: 'No mission loaded',
  description: 'Mission fixtures are not available. Run the compile script.',
  priority: 'P2',
  status: 'open',
};

// Module-scope guard so the unknown-contact scenario fires exactly
// once per browser session (across React StrictMode's double-mount
// in dev, and across HomeView re-renders). Reset only by reload.
let scenarioStartedThisSession = false;

export function HomeView() {
  // useDemoData branches on NEXT_PUBLIC_USE_LIVE_CP: live=false returns
  // the static fixtures; live=true polls the cp/* TanStack Query hooks.
  // The 6 ontology arrays seed local useState below so the existing
  // optimistic-mutation paths (set*) keep working in fixture mode.
  // In live mode, the hooks refetch on their own intervals and overwrite
  // local state via the syncing effect below.
  const seed = useDemoData();

  const [activeMissionId, setActiveMissionId] =
    useState<string>(ACTIVE_MISSION_ID);
  const [workspace, setWorkspace] = useState<WorkspaceSectionId>('awareness');
  const [entities, setEntities] = useState<Entity[]>(seed.entities);
  const [units, setUnits] = useState<Unit[]>(seed.units);
  const [events, setEvents] = useState<Event[]>(seed.events);
  const [reports, setReports] = useState<Report[]>(seed.reports);
  const [recommendations, setRecommendations] =
    useState<Recommendation[]>(seed.recommendations);
  const [selected, setSelected] = useState<AnyObject | null>(
    seed.entities[0] ?? null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [voiceArmed, setVoiceArmed] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState(
    'Try: list every drone with status, battery, and capabilities'
  );
  const [activeFeedSource, setActiveFeedSource] =
    useState<DataSourceId>('radio');
  const [activeDroneFeed, setActiveDroneFeed] = useState<string | undefined>();
  const [aiAnswer, setAiAnswer] = useState<MissionAnswer | undefined>();
  // Full transcript of agent answers, newest first. The AI Intelligence
  // surface renders all of them so prior context isn't destroyed when a
  // new query lands. Cleared explicitly via the surface's "Clear" action
  // (or on a hard refresh).
  const [aiAnswerHistory, setAiAnswerHistory] = useState<MissionAnswer[]>([]);
  const [isAskingAi, setIsAskingAi] = useState(false);

  const recordAiAnswer = useCallback((answer: MissionAnswer) => {
    setAiAnswer(answer);
    setAiAnswerHistory((prev) => [answer, ...prev]);
  }, []);
  const [now, setNow] = useState(() => new Date());

  const activeMission =
    seed.missions.find((m) => m._id === activeMissionId) ??
    seed.missions[0] ??
    FALLBACK_MISSION;

  // Live-mode sync: when the cp/* hooks return new data on their poll
  // intervals, mirror it into local state so existing render code is
  // unchanged. In fixture mode `seed.*` references are stable so these
  // effects fire once on mount and never again. Local optimistic
  // mutations (set*) get overwritten on the next refetch — acceptable
  // for v1 since the live demo is replayer-driven, not user-mutation
  // driven.
  useEffect(() => {
    if (seed.live) setEntities(seed.entities);
  }, [seed.live, seed.entities]);
  useEffect(() => {
    if (seed.live) setUnits(seed.units);
  }, [seed.live, seed.units]);
  useEffect(() => {
    if (seed.live) setEvents(seed.events);
  }, [seed.live, seed.events]);
  useEffect(() => {
    if (seed.live) setReports(seed.reports);
  }, [seed.live, seed.reports]);
  useEffect(() => {
    if (seed.live) setRecommendations(seed.recommendations);
  }, [seed.live, seed.recommendations]);
  const missionElapsed = useMemo(
    () => formatElapsed(activeMission._observed_at, now),
    [activeMission._observed_at, now]
  );
  const utcTime =
    now.toISOString().split('T')[1]?.slice(0, 8).concat('Z') ?? '';
  const commsLatencyMs = 82 + (now.getUTCSeconds() % 8) * 4;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    // Demo-mode fake physics only — when live CP is on, real position
    // updates flow from the units query and this tick must not run.
    if (seed.live) return;
    const DEMO_TIME_SCALE = 25;
    const TICK_MS = 1000;
    const DRONE_SUBTYPES = new Set<Unit['_subtype']>([
      'drone',
      'drone_isr',
      'drone_strike',
    ]);
    const id = window.setInterval(() => {
      setUnits((current) =>
        current.map((unit) => {
          if (!DRONE_SUBTYPES.has(unit._subtype)) return unit;
          const speed = unit.speed_mps ?? 0;
          if (speed <= 0) return unit;
          const pos = unit.position;
          if (
            !Array.isArray(pos) ||
            typeof pos[0] !== 'number' ||
            typeof pos[1] !== 'number'
          ) {
            return unit;
          }
          const heading = unit.heading_deg ?? 0;
          const meters = speed * (TICK_MS / 1000) * DEMO_TIME_SCALE;
          const dLat = (meters * Math.cos((heading * Math.PI) / 180)) / 111000;
          const dLon =
            (meters * Math.sin((heading * Math.PI) / 180)) /
            (111000 * Math.cos((pos[0] * Math.PI) / 180));
          return {
            ...unit,
            position: [pos[0] + dLat, pos[1] + dLon],
          };
        })
      );
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [seed.live]);

  // unknown-contact scenario — fires once per browser session ~10s
  // after the first units poll completes. Walks ROOK-1 (or the first
  // camera-equipped drone) to a fixed target near the AO, persisting
  // every milestone to CP so the agent can later answer SITREP
  // questions. The "once per session" guard lives in a module-scope
  // flag (scenarioStartedThisSession below) so React StrictMode's
  // mount → unmount → mount doesn't cancel the timer + leave the
  // scenario unstarted.
  const scenarioHandleRef = useRef<ScenarioHandle | null>(null);
  useEffect(() => {
    if (scenarioStartedThisSession) return;
    if (units.length === 0) return;
    const camDrone =
      units.find((u) => u._id === 'unit_rook1') ??
      units.find(
        (u) =>
          (u._subtype === 'drone' ||
            u._subtype === 'drone_isr' ||
            u._subtype === 'drone_strike') &&
          (u.capabilities ?? []).some((c) =>
            ['optical', 'eo', 'ir'].includes(c)
          )
      );
    if (!camDrone) return;
    scenarioStartedThisSession = true;
    const timer = window.setTimeout(() => {
      scenarioHandleRef.current = startUnknownContactScenario({
        drone: camDrone,
        // Fixed target a short distance from the AO so transit is
        // visible without scrolling. Same lat/lon every run so the
        // agent can answer "what did ROOK-1 find at 48.79°N 37.84°E?"
        // deterministically.
        target: [48.79, 37.84],
        contactName: 'UNK-DELTA',
        hooks: {
          setEntities,
          setUnits,
          setEvents,
          setReports,
          setRecommendations,
          setActiveDroneFeed,
        },
      });
    }, 10_000);
    return () => {
      window.clearTimeout(timer);
      // Don't abort the scenario on cleanup. StrictMode runs the
      // effect twice in dev (mount → unmount → mount) and we'd
      // tear down a perfectly good scenario. The scenario's CP
      // writes are durable and its in-memory timers run inside the
      // closure, so it survives this component's re-render cycle.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units.length > 0]);

  // For v1 only OP SILENT EYE has full fixture data. Switching to
  // another tab updates chrome (tab highlight, status bar Op code,
  // objective banner) but leaves the live-data columns populated
  // with the OP SILENT EYE picture. A real wiring will swap data
  // sources per tab.
  const isLiveTab = activeMissionId === ACTIVE_MISSION_ID;

  // Grounded prompt set — same builder the AI Intelligence surface uses,
  // so the top command bar's quick-prompts stay in sync with what the
  // agent can actually answer well. Computed early so the voice fallback
  // path (which fires when WebSpeech is unavailable) can reference it.
  const commandBarPrompts = useMemo(
    () =>
      buildAiSuggestions(
        { entities, units, events, reports, recommendations },
        3
      ).map((s) => s.prompt),
    [entities, units, events, reports, recommendations]
  );

  const handleSelect = useCallback((o: AnyObject) => {
    setSelected(o);
    setDrawerOpen(true);
  }, []);

  const appendEvent = useCallback(
    (event: Omit<Event, '_type' | '_version'>) => {
      setEvents((current) => [
        {
          _type: 'Event',
          _version: 1,
          ...event,
        },
        ...current,
      ]);
    },
    []
  );

  const buildMissionAnswer = useCallback(
    (trimmed: string, fromVoice: boolean): MissionAnswer => {
      const lower = trimmed.toLowerCase();
      const recent = events.slice(0, 5);
      const pending = recommendations.find((rec) => rec.status === 'pending');
      const drones = units.filter((unit) => unit._subtype === 'drone');
      const sources = [
        'drone telemetry',
        'radio',
        'satellite',
        'intel reports',
        'OSINT',
        'object graph',
      ];
      let response =
        `Current picture: ${entitiesCount(entities, 'hostile')} hostile track, ` +
        `${entitiesCount(entities, 'unknown')} unresolved objects, ${drones.length} drones, ` +
        `${reports.length} reports, and ${events.length} events indexed. `;
      const actions = ['Open AI intelligence', 'Cite evidence refs'];

      if (lower.includes('last 10') || lower.includes('update')) {
        response =
          `Last 10 minutes: ${recent.map((event) => event.description).join(' ')} ` +
          `Highest-value delta is still ${pending?.asset_callsign ?? 'ROOK-1'} confirming BOGEY-7 with RF, EO/IR, and report support.`;
        actions.push('Refresh mission synthesis');
      } else if (lower.includes('evidence') || lower.includes('support')) {
        response =
          `${pending?.verb ?? 'Recommendation'} ${pending?.short ?? 'Retask ROOK-1'} is supported by ` +
          `${pending?.evidence_refs.join(', ') ?? 'linked RF, report, and track evidence'}. ` +
          `${pending?.rationale ?? 'The recommendation stays human-approved and ISR-only.'}`;
        actions.push('Show evidence references');
      } else if (lower.includes('cloud') || lower.includes('comms')) {
        response =
          'If cloud comms drop, local mission state, map layers, event feed, object graph, recommendations, and supervised drone tasking continue from the edge runtime. External feeds queue for later sync.';
        actions.push('Explain degraded mode');
      } else if (lower.includes('swarm')) {
        response =
          'Swarm tasking staged: ROOK-1 takes stand-off overwatch, ROOK-2 becomes offset observer, and both remain under human-approved ISR constraints.';
        actions.push('Coordinate ROOK-1 + ROOK-2');
      } else if (lower.includes('launch') && lower.includes('rook')) {
        response =
          'ROOK-1 launch command routed. The drone ops page now shows simulated EO/IR video, live coordinates, heading, speed, altitude, link quality, and frame telemetry.';
        actions.push('Launch ROOK-1', 'Open live feed');
      } else if (lower.includes('plan') || lower.includes('coa')) {
        response = `Planning view opened for ${activeMission._source_ref ?? activeMission.title}. Milestones, commander intent, COA tradeoffs, assets, and decision records are now contextual to the selected mission.`;
        actions.push('Generate COA', 'Review milestones');
      } else if (lower.includes('fuse') || lower.includes('data')) {
        response =
          'Data fusion view opened. Click radio, satellite, intel, allied, OSINT, or drone video streams to replace the map with simulated extracted objects, reports, and audit events.';
        actions.push('Open data fusion');
      }

      return {
        query: trimmed,
        response,
        sources,
        actions,
        generatedAt: new Date().toISOString(),
        fromVoice,
      };
    },
    [
      activeMission._source_ref,
      activeMission.title,
      events,
      entities,
      recommendations,
      reports.length,
      units,
    ]
  );

  const handleApproveRecommendation = useCallback(
    (rec: Recommendation) => {
      // Scenario-authored rec: hand back to the scenario engine so it
      // can advance through approve → transit → arrive_analyze and
      // persist the milestones itself. Skip the generic approval path
      // below — the scenario writes its own approval Event +
      // Recommendation update.
      if (rec._source === 'scenario:unknown-contact') {
        scenarioHandleRef.current?.approve();
        return;
      }
      const unitId = String(rec.proposed_params.unit_id ?? '');
      const targetId = String(rec.proposed_params.target_entity_id ?? '');

      setRecommendations((current) =>
        current.map((candidate) =>
          candidate._id === rec._id
            ? {
                ...candidate,
                status: 'accepted',
                decided_by: 'operator',
                decided_at: new Date().toISOString(),
              }
            : candidate
        )
      );

      setUnits((current) =>
        current.map((unit) =>
          unit._id === unitId
            ? {
                ...unit,
                status: 'en_route',
                assigned_mission_id: rec.objective_id,
              }
            : unit
        )
      );

      appendEvent({
        _id: `evt_approval_${rec._id}_${Date.now()}`,
        _observed_at: new Date().toISOString(),
        _ingested_at: new Date().toISOString(),
        _source: 'operator-action',
        _subtype: 'report_link',
        entity_id: targetId || rec.subject_entity_id,
        unit_id: unitId || undefined,
        severity: 'info',
        description: `Operator approved ${rec.verb.toLowerCase()} ${rec.short}`,
        payload: {
          recommendation_id: rec._id,
          proposed_action_type: rec.proposed_action_type,
        },
        verb: 'Approved.',
      });

      setSelected({ ...rec, status: 'accepted' });
      setDrawerOpen(true);
      recordAiAnswer({
        query: `Approve ${rec.verb} ${rec.short}`,
        response: `Approved. ${rec.asset_callsign ?? (unitId || 'Assigned asset')} was written to mission state and the approval event is now in the audit feed with recommendation ${rec._id}.`,
        sources: ['recommendation', 'operator action', 'mission audit'],
        actions: ['Recommendation marked approved', 'Drone tasking updated'],
        generatedAt: new Date().toISOString(),
        fromVoice: false,
      });
    },
    [appendEvent]
  );

  const handleRejectRecommendation = useCallback((rec: Recommendation) => {
    setRecommendations((current) =>
      current.map((candidate) =>
        candidate._id === rec._id
          ? {
              ...candidate,
              status: 'rejected',
              decided_by: 'operator',
              decided_at: new Date().toISOString(),
            }
          : candidate
      )
    );
  }, []);

  const handleModifyRecommendation = useCallback((rec: Recommendation) => {
    setRecommendations((current) =>
      current.map((candidate) =>
        candidate._id === rec._id
          ? {
              ...candidate,
              short: `${candidate.short} Hold confirmation orbit pending operator adjustment.`,
              eta: 'Modified draft · awaiting approval',
            }
          : candidate
      )
    );
  }, []);

  const handleLaunchDrone = useCallback(
    (unitId: string) => {
      const unit = units.find((candidate) => candidate._id === unitId);
      if (!unit) return;

      setUnits((current) =>
        current.map((candidate) =>
          candidate._id === unitId
            ? {
                ...candidate,
                status: 'en_route',
                assigned_mission_id: activeMission._id,
              }
            : candidate
        )
      );

      appendEvent({
        _id: `evt_launch_${unitId}_${Date.now()}`,
        _observed_at: new Date().toISOString(),
        _ingested_at: new Date().toISOString(),
        _source: 'operator-action',
        _subtype: 'detection',
        unit_id: unitId,
        severity: 'info',
        description: `${unit.callsign} launched to confirm the DeepState-adjacent contact area under operator supervision.`,
        payload: { action: 'launch_drone', autonomy: 'supervised' },
        verb: 'Launched.',
      });
      setActiveDroneFeed(unitId);
      setWorkspace('drone_ops');
      recordAiAnswer({
        query: `Launch ${unit.callsign}`,
        response: `${unit.callsign} is now en route. Live simulated camera, flight coordinates, heading, speed, altitude, link quality, model cue, and frame telemetry are visible in Drone Ops.`,
        sources: ['operator action', 'drone telemetry', 'mission audit'],
        actions: ['Open live EO/IR feed', 'Write launch event'],
        generatedAt: new Date().toISOString(),
        fromVoice: false,
      });
    },
    [activeMission._id, appendEvent, units]
  );

  const handleLaunchSwarm = useCallback(() => {
    const swarmIds = ['unit_rook1', 'unit_rook2'];
    setUnits((current) =>
      current.map((unit) =>
        swarmIds.includes(unit._id)
          ? {
              ...unit,
              status: 'en_route',
              assigned_mission_id: activeMission._id,
            }
          : unit
      )
    );

    appendEvent({
      _id: `evt_swarm_${Date.now()}`,
      _observed_at: new Date().toISOString(),
      _ingested_at: new Date().toISOString(),
      _source: 'operator-action',
      _subtype: 'anomaly',
      severity: 'info',
      description:
        'ROOK-1 and ROOK-2 assigned as a supervised two-drone swarm: ROOK-1 overwatch, ROOK-2 flank confirmation, shared target track BOGEY-7.',
      payload: {
        action: 'coordinate_swarm',
        units: swarmIds,
        autonomy: 'human-approved',
      },
      verb: 'Coordinated.',
    });
    setActiveDroneFeed('unit_rook1');
    setWorkspace('drone_ops');
    recordAiAnswer({
      query: 'Coordinate swarm',
      response:
        'ROOK-1 and ROOK-2 are staged as a two-drone ISR swarm: overwatch plus offset confirmation. The command is human-approved and recorded in the audit feed.',
      sources: ['drone fleet', 'operator action', 'mission audit'],
      actions: ['Assign ROOK-1 overwatch', 'Assign ROOK-2 offset observer'],
      generatedAt: new Date().toISOString(),
      fromVoice: false,
    });
  }, [activeMission._id, appendEvent]);

  const handleInjectFeed = useCallback(
    (source: string) => {
      const sourceId = (
        [
          'radio',
          'satellite',
          'intel',
          'social',
          'allies',
          'drone_video',
        ].includes(source)
          ? source
          : 'radio'
      ) as DataSourceId;
      const now = new Date().toISOString();
      const copy =
        sourceId === 'radio'
          ? 'TAC-3 radio burst: "engine noise east of treeline, possible launch team moving toward DQ-842."'
          : sourceId === 'satellite'
            ? 'Satellite change detection: new vehicle scar and heat residue 420m east of last BOGEY-7 track.'
            : sourceId === 'intel'
              ? 'Intel report: logistics cell likely probing route between Kramatorsk and Sloviansk in next 30m.'
              : sourceId === 'allies'
                ? 'Allied liaison feed: counter-UAS radar saw intermittent low-altitude return aligned with ROOK-1 track.'
                : sourceId === 'drone_video'
                  ? 'Drone video tracklet: ROOK-1 EO/IR sees heat trace and vehicle scar aligned with BOGEY-7 track.'
                  : 'Public/social cue: local post reports low aircraft noise and lights moving south-west near Kramatorsk.';

      const report: Report = {
        _type: 'Report',
        _id: `rep_${sourceId}_${Date.now()}`,
        _version: 1,
        _observed_at: now,
        _ingested_at: now,
        _source: sourceId,
        _source_ref: sourceId.toUpperCase(),
        _subtype:
          sourceId === 'radio'
            ? 'radio'
            : sourceId === 'intel'
              ? 'operator'
              : sourceId === 'satellite'
                ? 'sigint'
                : sourceId === 'allies'
                  ? 'sigint'
                  : 'osint',
        author: `${sourceId.toUpperCase()} feed`,
        channel: 'simulated integration',
        text: copy,
        entity_refs: ['ent_bogey7'],
        classification: sourceId === 'social' ? 'unclass' : 'cui',
      };

      setReports((current) => [report, ...current]);
      appendEvent({
        _id: `evt_ingest_${sourceId}_${Date.now()}`,
        _observed_at: now,
        _ingested_at: now,
        _source: sourceId,
        _subtype: sourceId === 'radio' ? 'report_link' : 'anomaly',
        entity_id: 'ent_bogey7',
        severity:
          sourceId === 'satellite' || sourceId === 'drone_video'
            ? 'warn'
            : 'info',
        description: copy,
        payload: { source: sourceId, report_id: report._id, simulated: true },
        verb: 'Ingested.',
      });
      setActiveFeedSource(sourceId);
      setWorkspace('integrations');
      recordAiAnswer({
        query: `Fuse ${SOURCE_SHORT_LABELS[sourceId]}`,
        response: `${SOURCE_SHORT_LABELS[sourceId]} refreshed. The integration surface now shows synthetic extracted objects, confidence scores, linked reports, and a mission event written to the local audit trail.`,
        sources: [
          SOURCE_SHORT_LABELS[sourceId],
          'object graph',
          'mission audit',
        ],
        actions: ['Inject source refresh', 'Link BOGEY-7 evidence'],
        generatedAt: new Date().toISOString(),
        fromVoice: false,
      });
    },
    [appendEvent]
  );

  const handleGeneratePlan = useCallback(() => {
    appendEvent({
      _id: `evt_plan_${Date.now()}`,
      _observed_at: new Date().toISOString(),
      _ingested_at: new Date().toISOString(),
      _source: 'mission-ai',
      _subtype: 'report_link',
      severity: 'info',
      description:
        'Generated COA: hold BRAVO-3, push ROOK-1 to overwatch, use ROOK-2 as offset observer, maintain human approval for all drone tasking.',
      payload: { coa: 'overwatch-confirm-contain', confidence: 0.78 },
      verb: 'Planned.',
    });
    setWorkspace('planning');
    recordAiAnswer({
      query: `Generate plan for ${activeMission._source_ref ?? activeMission.title}`,
      response:
        'Generated a contextual COA set with milestones, commander intent, assets, threat picture, and decision record for the selected mission.',
      sources: ['mission objective', 'unit state', 'events', 'recommendations'],
      actions: ['Open mission planning', 'Write planning event'],
      generatedAt: new Date().toISOString(),
      fromVoice: false,
    });
  }, [activeMission._source_ref, activeMission.title, appendEvent]);

  const handleAddObject = useCallback(() => {
    const createdAt = new Date().toISOString();
    const ordinal =
      entities.filter((entity) => entity._source === 'operator-object').length +
      1;
    const entity: Entity = {
      _type: 'Entity',
      _id: `ent_manual_${Date.now()}`,
      _version: 1,
      _observed_at: createdAt,
      _ingested_at: createdAt,
      _source: 'operator-object',
      _source_ref: `OBJ-${String(ordinal).padStart(3, '0')}`,
      _subtype: 'Unknown',
      affiliation: 'unknown',
      name: `FIELD-OBJ-${String(ordinal).padStart(2, '0')}`,
      position: [48.71 + (ordinal % 4) * 0.035, 37.52 + (ordinal % 5) * 0.045],
      heading_deg: 210 + ordinal * 7,
      speed_mps: 0,
      confidence: 0.52,
      threat_level: 'low',
      attributes: {
        status: 'operator-created',
        grid: '37U-DQ-842',
        disposition: 'unresolved',
      },
    };

    setEntities((current) => [entity, ...current]);
    appendEvent({
      _id: `evt_object_add_${entity._id}`,
      _observed_at: createdAt,
      _ingested_at: createdAt,
      _source: 'operator-object',
      _subtype: 'report_link',
      entity_id: entity._id,
      position: entity.position,
      severity: 'info',
      description: `${entity.name} added to the ontology and projected onto the operational map.`,
      payload: { action: 'add_object', object_id: entity._id },
      verb: 'Object added.',
    });
    setSelected(entity);
    setDrawerOpen(true);
    setWorkspace('objects');
    recordAiAnswer({
      query: `Add object ${entity.name}`,
      response: `${entity.name} is now in the object graph and visible on the map at ${entity.position.join(', ')}. It carries unresolved status, low threat level, and an audit event.`,
      sources: ['operator object', 'object graph', 'map overlay'],
      actions: ['Create Entity', 'Project marker to map', 'Write audit event'],
      generatedAt: createdAt,
      fromVoice: false,
    });
  }, [appendEvent, entities]);

  const handleRemoveObject = useCallback(
    (object: AnyObject) => {
      if (object._type !== 'Entity' || object._source !== 'operator-object') {
        recordAiAnswer({
          query: `Remove ${objectNameForAnswer(object)}`,
          response:
            'Only operator-created field objects can be removed in this demo. Fixture units, reports, events, and baseline tracks stay immutable for audit safety.',
          sources: ['object graph policy'],
          actions: ['No deletion performed'],
          generatedAt: new Date().toISOString(),
          fromVoice: false,
        });
        return;
      }

      const removedAt = new Date().toISOString();
      setEntities((current) =>
        current.filter((entity) => entity._id !== object._id)
      );
      appendEvent({
        _id: `evt_object_remove_${object._id}_${Date.now()}`,
        _observed_at: removedAt,
        _ingested_at: removedAt,
        _source: 'operator-object',
        _subtype: 'report_link',
        entity_id: object._id,
        severity: 'info',
        description: `${object.name ?? object._id} removed from the live object layer and map overlay.`,
        payload: { action: 'remove_object', object_id: object._id },
        verb: 'Object removed.',
      });
      setSelected((current) =>
        current?._id === object._id ? (entities[0] ?? null) : current
      );
      setDrawerOpen(false);
      recordAiAnswer({
        query: `Remove ${object.name ?? object._id}`,
        response: `${object.name ?? object._id} was removed from the editable object layer. The removal is retained in the live feed as an audit event.`,
        sources: ['operator object', 'object graph', 'mission audit'],
        actions: ['Remove map marker', 'Write removal event'],
        generatedAt: removedAt,
        fromVoice: false,
      });
    },
    [appendEvent, entities]
  );

  const handleViewObjectOnMap = useCallback((object: AnyObject) => {
    setSelected(object);
    setDrawerOpen(false);
    setWorkspace('awareness');
  }, []);

  // Server-mediated query — the operator's transcript goes to the CP, which
  // calls Azure OpenAI gpt-4o with the full mission context and returns
  // typed Recommendation + Event objects. UI just renders what CP hands back.
  // Returns the spoken response text (or null on failure) so secondary
  // surfaces — the copilot chat panel — can render the same answer inline.
  const submitMissionQuery = useCallback(
    async (rawQuery: string, fromVoice = false): Promise<string | null> => {
      const trimmed = rawQuery.trim();
      if (!trimmed) return null;
      setVoiceTranscript(trimmed);
      setIsAskingAi(true);

      // The agent now reads live state from ClickHouse directly (see
      // platform-control-plane/internal/api/agent/azure.go — it generates
      // SQL via the data catalog). UI ships only the transcript + minimal
      // hints (which drone the operator is looking at, which workspace).
      // No more units/events/entities/recs — they were causing 400s on
      // wire-shape mismatch and were redundant with the SQL path.
      const body = {
        transcript: trimmed,
        source: fromVoice ? 'voice' : 'text',
        mission_id: activeMission._id,
        ui_context: {
          active_drone_feed: activeDroneFeed ?? '',
          workspace,
        },
      };

      try {
        const res = await fetch(`${API_BASE}/api/v1/operator/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        // Setting isAskingAi=false is paired in finally below.

        if (!res.ok) {
          const message =
            res.status === 503
              ? 'Mission Commander agent disabled — Azure OpenAI not configured on the control plane.'
              : `Control plane returned ${res.status}.`;
          recordAiAnswer({
            query: trimmed,
            response: message,
            sources: ['platform-control-plane'],
            actions: [],
            generatedAt: new Date().toISOString(),
            fromVoice,
          });
          return message;
        }

        const data: AgentQueryResponse = await res.json();

        if (data.recommendations?.length) {
          const fresh = (data.recommendations as Recommendation[]).map(
            normalizeRecommendation
          );
          setRecommendations((current) => [...fresh, ...current]);
        }
        if (data.events?.length) {
          for (const e of data.events) appendEvent(e as Event);
        }

        recordAiAnswer({
          query: trimmed,
          response: data.ai_response.text,
          sources: ['Mission Commander · Azure OpenAI gpt-4o'],
          actions: (data.recommendations ?? []).map(
            (r) => r.proposed_action_type
          ),
          generatedAt: data.generated_at,
          fromVoice,
        });

        // Spoken response — only on voice queries, browser TTS, fire-and-forget.
        if (
          fromVoice &&
          typeof window !== 'undefined' &&
          'speechSynthesis' in window &&
          data.ai_response.text
        ) {
          try {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(data.ai_response.text);
            utt.lang = 'en-US';
            utt.rate = 1.05;
            utt.pitch = 1.0;
            window.speechSynthesis.speak(utt);
          } catch {
            /* TTS is optional — never throw on voice playback */
          }
        }
        return data.ai_response.text ?? null;
      } catch {
        const message =
          'Cannot reach Mission Commander control plane. Start the platform-control-plane and retry.';
        recordAiAnswer({
          query: trimmed,
          response: message,
          sources: ['platform-control-plane'],
          actions: [],
          generatedAt: new Date().toISOString(),
          fromVoice,
        });
        return message;
      } finally {
        setIsAskingAi(false);
      }
    },
    [
      activeMission._id,
      activeDroneFeed,
      workspace,
      units,
      events,
      entities,
      recommendations,
      appendEvent,
    ]
  );

  const handleQuerySubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!query.trim()) return;
      // The global command bar is reachable from every workspace, but
      // answers render on the AI Intelligence surface — auto-switch so
      // operators see the result of what they just asked.
      setWorkspace('intelligence');
      // Typed Asks are never voice — TTS playback only fires on the
      // recognition.onresult path. Pass false so a stale voiceArmed
      // doesn't bleed into a typed query and start the model speaking.
      submitMissionQuery(query, false);
      setQuery('');
    },
    [query, submitMissionQuery]
  );

  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const voiceListeningRef = useRef(false);
  voiceListeningRef.current = voiceListening;

  // Build the singleton recognition lazily, once per session.
  const ensureRecognition = useCallback((): VoiceRecognition | null => {
    if (recognitionRef.current) return recognitionRef.current;
    if (typeof window === 'undefined') return null;
    const speechWindow = window as unknown as {
      SpeechRecognition?: VoiceRecognitionCtor;
      webkitSpeechRecognition?: VoiceRecognitionCtor;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return null;

    const r = new Recognition();
    r.continuous = false;
    r.interimResults = true;       // show partials so the operator sees the system listening
    r.lang = 'en-US';
    recognitionRef.current = r;
    return r;
  }, []);

  const handleVoiceCommand = useCallback(() => {
    // Toggle: tap-while-listening = abort current capture. Also kill any
    // queued TTS so a long previous reply stops speaking.
    if (voiceListeningRef.current && recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
      }
      setVoiceListening(false);
      setVoiceArmed(false);
      setVoiceTranscript('Cancelled.');
      return;
    }

    setVoiceArmed(true);
    const recognition = ensureRecognition();

    if (!recognition) {
      // No browser support — keep the demo flowing with a canned grounded
      // query. Picks the top live suggestion so the demo always has data.
      const fallback =
        commandBarPrompts[0] ??
        'List every drone with callsign, status, battery_pct, fuel_pct, and capabilities.';
      setVoiceTranscript(fallback);
      submitMissionQuery(fallback, true);
      return;
    }

    // Bind handlers fresh every time so they close over current callbacks.
    recognition.onstart = () => {
      setVoiceListening(true);
      setVoiceTranscript('Listening…');
    };
    recognition.onresult = (event) => {
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const txt = r?.[0]?.transcript ?? '';
        if (r?.isFinal) finalText += txt;
        else interim += txt;
      }
      if (finalText) {
        const trimmed = finalText.trim();
        setVoiceTranscript(trimmed);
        setQuery(trimmed);
        submitMissionQuery(trimmed, true);
        // Disarm immediately on the final result so any subsequent
        // typed query / programmatic call doesn't get treated as voice
        // (which would otherwise auto-trigger TTS playback).
        setVoiceArmed(false);
      } else if (interim) {
        setVoiceTranscript(interim.trim() + '…');
      }
    };
    recognition.onerror = (event) => {
      setVoiceListening(false);
      setVoiceArmed(false);
      const msg = VOICE_ERROR_MESSAGES[event.error] ?? `Voice error: ${event.error}`;
      if (msg) setVoiceTranscript(msg);
    };
    recognition.onnomatch = () => {
      setVoiceArmed(false);
      setVoiceTranscript('Did not catch that — try again.');
    };
    recognition.onend = () => {
      setVoiceListening(false);
      setVoiceArmed(false);
    };

    try {
      recognition.start();
    } catch {
      // start() throws InvalidStateError if already running — abort and retry next tick.
      try { recognition.abort(); } catch { /* noop */ }
      setVoiceListening(false);
      window.setTimeout(() => {
        try { recognition.start(); } catch { /* noop */ }
      }, 120);
    }
  }, [ensureRecognition, submitMissionQuery, commandBarPrompts]);

  // Clean up the recognition session AND any queued TTS if the page
  // unmounts mid-listen — otherwise React StrictMode's dev-mode double
  // mount can leave a SpeechSynthesisUtterance queued and the model
  // appears to "start speaking by itself" on reload.
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* noop */ }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
      }
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <OpStatusBar
        missions={seed.missions}
        activeId={activeMissionId}
        onMissionSelect={setActiveMissionId}
        missionId={activeMission._source_ref ?? activeMission._id}
        utcTime={utcTime}
        missionElapsed={missionElapsed}
        commsLatencyMs={commsLatencyMs}
        edgeState="synced"
        sensorCount={isLiveTab ? 9 : 0}
        threatCount={
          isLiveTab
            ? entities.filter((entity) => entity.affiliation === 'hostile')
                .length
            : 0
        }
        unitCount={isLiveTab ? units.length : 0}
      />

      <form
        onSubmit={handleQuerySubmit}
        className="border-border bg-background flex shrink-0 items-stretch gap-px border-b"
      >
        <div className="bg-card hidden w-[76px] items-center justify-center border-r lg:flex">
          <span className="label-cap-sm text-muted-foreground">Command</span>
        </div>
        <div className="bg-border grid min-w-0 flex-1 grid-cols-1 gap-px">
          <div className="bg-background flex min-w-0 flex-col gap-2 px-3 py-2">
            <div className="border-border bg-muted/30 flex min-w-0 flex-1 items-center gap-2 border px-2.5 py-2">
              <Brain className="text-primary size-4 shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="text-foreground placeholder:text-muted-foreground/70 min-w-0 flex-1 bg-transparent font-mono text-[12px] outline-none"
                placeholder="Ask across drones, DeepState, radio, satellite, reports, OSINT, objects, plans..."
              />
              <button
                type="button"
                onClick={() => {
                  // Voice from the global bar lands in the AI tab; the
                  // col-3 copilot mic and the AI hero mic stay where they
                  // are because they call handleVoiceCommand directly.
                  if (!voiceListening) setWorkspace('intelligence');
                  handleVoiceCommand();
                }}
                className={[
                  'flex h-8 shrink-0 items-center gap-1.5 px-3 font-mono text-[11px] font-bold transition-colors',
                  voiceListening
                    ? 'bg-warning text-background'
                    : voiceArmed
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-warning/90 text-background hover:bg-warning',
                ].join(' ')}
                aria-label="Start voice command"
              >
                <Mic className="size-3.5" />
                {voiceListening
                  ? 'Listening'
                  : voiceArmed
                    ? 'Voice armed'
                    : 'Voice'}
              </button>
              <button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-8 items-center gap-1.5 px-3 font-mono text-[11px] font-semibold"
              >
                <Send className="size-3.5" />
                Ask
              </button>
            </div>
          </div>
        </div>
      </form>

      <LiveFeedStrip events={events} onSelect={handleSelect} />

      <main className="bg-border grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto lg:grid-cols-[76px_320px_minmax(0,1fr)_360px] lg:grid-rows-1 lg:overflow-hidden">
        <WorkspaceRail active={workspace} onSelect={setWorkspace} />

        {/* LEFT — orient (status surfaces, objective at top) */}
        <div className="order-2 min-h-[520px] overflow-hidden lg:order-1 lg:h-full lg:min-h-0">
          <ColStatus
            workspace={workspace}
            objective={activeMission}
            units={isLiveTab ? units : []}
            entities={isLiveTab ? entities : []}
            events={isLiveTab ? events : []}
            reports={isLiveTab ? reports : []}
            recommendations={isLiveTab ? recommendations : []}
            selectedId={selected?._id}
            onSelect={handleSelect}
            onLaunchDrone={handleLaunchDrone}
            onLaunchSwarm={handleLaunchSwarm}
            onInjectFeed={handleInjectFeed}
            onGeneratePlan={handleGeneratePlan}
          />
        </div>

        {/* CENTER — observe (map, the hero) */}
        <div className="order-1 min-h-[520px] overflow-hidden lg:order-2 lg:h-full lg:min-h-0">
          <WorkspaceCenter
            workspace={workspace}
            objective={activeMission}
            missions={seed.missions}
            activeMissionId={activeMissionId}
            entities={isLiveTab ? entities : []}
            units={isLiveTab ? units : []}
            events={isLiveTab ? events : []}
            reports={isLiveTab ? reports : []}
            recommendations={isLiveTab ? recommendations : []}
            aiAnswer={aiAnswer}
            aiAnswerHistory={aiAnswerHistory}
            selectedId={selected?._id}
            activeFeedSource={activeFeedSource}
            activeDroneFeed={activeDroneFeed}
            onSelect={handleSelect}
            onInjectFeed={handleInjectFeed}
            onLaunchDrone={handleLaunchDrone}
            onLaunchSwarm={handleLaunchSwarm}
            onGeneratePlan={handleGeneratePlan}
            onAddObject={handleAddObject}
            onRemoveObject={handleRemoveObject}
            onViewObjectOnMap={handleViewObjectOnMap}
            onMissionSelect={setActiveMissionId}
            onAsk={submitMissionQuery}
            isAskingAi={isAskingAi}
            onVoiceCommand={handleVoiceCommand}
            voiceListening={voiceListening}
            voiceArmed={voiceArmed}
            voiceTranscript={voiceTranscript}
          />
        </div>

        {/* RIGHT — decide + act (copilot) */}
        <div className="order-3 min-h-[520px] overflow-hidden lg:h-full lg:min-h-0">
          <WorkspaceContextRail
            workspace={workspace}
            entities={isLiveTab ? entities : []}
            units={isLiveTab ? units : []}
            events={isLiveTab ? events : []}
            reports={isLiveTab ? reports : []}
            recommendations={isLiveTab ? recommendations : []}
            activeFeedSource={activeFeedSource}
            activeDroneFeed={activeDroneFeed}
            onSelect={handleSelect}
            onApprove={handleApproveRecommendation}
            onReject={handleRejectRecommendation}
            onModify={handleModifyRecommendation}
          />
        </div>
      </main>

      <ObjectDrawer
        open={drawerOpen}
        object={selected}
        onClose={() => setDrawerOpen(false)}
        onSelect={handleSelect}
        onApprove={handleApproveRecommendation}
        onReject={handleRejectRecommendation}
        onModify={handleModifyRecommendation}
      />
    </div>
  );
}

function WorkspaceRail({
  active,
  onSelect,
}: {
  active: WorkspaceSectionId;
  onSelect: (id: WorkspaceSectionId) => void;
}) {
  return (
    <nav className="bg-background order-4 flex min-h-[72px] overflow-x-auto border-t lg:order-none lg:min-h-0 lg:flex-col lg:overflow-x-hidden lg:border-r lg:border-t-0">
      {WORKSPACES.map((item) => {
        const Icon = item.icon;
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={[
              'border-border flex min-w-[88px] flex-1 flex-col items-center justify-center gap-1 border-r px-2 py-2 text-center transition-colors lg:min-w-0 lg:flex-none lg:border-b lg:border-r-0 lg:py-3',
              selected
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
            ].join(' ')}
            aria-label={item.label}
          >
            <Icon className="size-4" />
            <span className="font-mono text-[10px] font-semibold">
              {item.short}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function formatElapsed(startIso: string, now: Date) {
  const started = new Date(startIso).getTime();
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - started) / 1000)
  );
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return `T+${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function entitiesCount(entities: Entity[], affiliation: Entity['affiliation']) {
  return entities.filter((entity) => entity.affiliation === affiliation).length;
}

function objectNameForAnswer(object: AnyObject) {
  if (object._type === 'Entity') return object.name ?? object._id;
  if (object._type === 'Unit') return object.callsign;
  if (object._type === 'Report') return object._source_ref ?? object._id;
  if (object._type === 'Event') return object.verb ?? object._subtype;
  if (object._type === 'Recommendation')
    return `${object.verb} ${object.short}`;
  if (object._type === 'MissionObjective') return object.title;
  if (object._type === 'Plan') return object.title;
  if (object._type === 'Mission') return object.intent;
  return object.command_type;
}

