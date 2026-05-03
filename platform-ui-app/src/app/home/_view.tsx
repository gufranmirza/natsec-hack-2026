'use client';

import { useCallback, useState } from 'react';
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
  WorkspaceCenter,
} from '@/components/_columns/workspace-center';
import { WorkspaceContextRail } from '@/components/_columns/workspace-context-rail';
import { ObjectDrawer } from '@/components/_layout/object-drawer';
import { OpStatusBar } from '@/components/_layout/op-status-bar';
import {
  ACTIVE_MISSION_ID,
  ENTITIES,
  EVENTS,
  MISSIONS,
  RECOMMENDATIONS,
  REPORTS,
  UNITS,
} from '@/lib/fixtures';
import type {
  AnyObject,
  Event,
  Recommendation,
  Report,
  Unit,
} from '@/types/ontology';

interface VoiceRecognitionResult {
  readonly results: {
    readonly [index: number]: {
      readonly [index: number]: { readonly transcript: string };
    };
  };
}

interface VoiceRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: VoiceRecognitionResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

type VoiceRecognitionCtor = new () => VoiceRecognition;

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

export function HomeView() {
  const [activeMissionId, setActiveMissionId] =
    useState<string>(ACTIVE_MISSION_ID);
  const [workspace, setWorkspace] = useState<WorkspaceSectionId>('awareness');
  const [units, setUnits] = useState<Unit[]>(UNITS);
  const [events, setEvents] = useState<Event[]>(EVENTS);
  const [reports, setReports] = useState<Report[]>(REPORTS);
  const [recommendations, setRecommendations] =
    useState<Recommendation[]>(RECOMMENDATIONS);
  const [selected, setSelected] = useState<AnyObject | null>(ENTITIES[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [voiceArmed, setVoiceArmed] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState(
    'Try: give me an update on the last 10 minutes'
  );
  const [activeFeedSource, setActiveFeedSource] =
    useState<DataSourceId>('radio');
  const [activeDroneFeed, setActiveDroneFeed] = useState<string | undefined>();

  const activeMission =
    MISSIONS.find((m) => m._id === activeMissionId) ?? MISSIONS[0];

  // For v1 only OP SILENT EYE has full fixture data. Switching to
  // another tab updates chrome (tab highlight, status bar Op code,
  // objective banner) but leaves the live-data columns populated
  // with the OP SILENT EYE picture. A real wiring will swap data
  // sources per tab.
  const isLiveTab = activeMissionId === ACTIVE_MISSION_ID;

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

  const handleApproveRecommendation = useCallback(
    (rec: Recommendation) => {
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
  }, [appendEvent]);

  const submitMissionQuery = useCallback(
    (rawQuery: string, fromVoice = false) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) return;

      const lower = trimmed.toLowerCase();
      if (lower.includes('swarm')) {
        handleLaunchSwarm();
      } else if (
        lower.includes('launch') &&
        (lower.includes('drone') || lower.includes('rook'))
      ) {
        handleLaunchDrone('unit_rook1');
      } else if (lower.includes('fuse') || lower.includes('data')) {
        setWorkspace('integrations');
      } else if (lower.includes('plan') || lower.includes('coa')) {
        handleGeneratePlan();
      } else {
        setWorkspace('intelligence');
      }

      appendEvent({
        _id: `evt_query_${Date.now()}`,
        _observed_at: new Date().toISOString(),
        _ingested_at: new Date().toISOString(),
        _source: fromVoice ? 'voice-query' : 'natural-language-query',
        _subtype: 'report_link',
        severity: 'info',
        description: `Commander query answered across ${units.length} units, ${reports.length} reports, ${events.length} events, DeepState terrain, and live recommendations: "${trimmed}"`,
        payload: {
          query: trimmed,
          voice: fromVoice,
          sources: [
            'drones',
            'radio',
            'satellite',
            'intel',
            'osint',
            'DeepState',
          ],
        },
        verb: 'Answered.',
      });
      setVoiceTranscript(trimmed);
    },
    [
      appendEvent,
      events.length,
      handleGeneratePlan,
      handleLaunchDrone,
      handleLaunchSwarm,
      reports.length,
      units.length,
    ]
  );

  const handleQuerySubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      submitMissionQuery(query, voiceArmed);
      setQuery('');
    },
    [query, submitMissionQuery, voiceArmed]
  );

  const handleVoiceCommand = useCallback(() => {
    setVoiceArmed(true);
    const speechWindow = window as unknown as {
      SpeechRecognition?: VoiceRecognitionCtor;
      webkitSpeechRecognition?: VoiceRecognitionCtor;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      const fallback =
        'Give me an update on everything that happened last 10 minutes';
      setVoiceTranscript(fallback);
      submitMissionQuery(fallback, true);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setVoiceTranscript(transcript);
        setQuery(transcript);
        submitMissionQuery(transcript, true);
      }
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      setVoiceTranscript('Voice capture failed. Try: launch ROOK-1.');
    };
    recognition.onend = () => setVoiceListening(false);
    setVoiceListening(true);
    recognition.start();
  }, [submitMissionQuery]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <OpStatusBar
        missions={MISSIONS}
        activeId={activeMissionId}
        onMissionSelect={setActiveMissionId}
        missionId={activeMission._source_ref ?? activeMission._id}
        utcTime="14:23:47Z"
        missionElapsed="T+02:14:09"
        commsLatencyMs={92}
        edgeState="synced"
        sensorCount={isLiveTab ? 9 : 0}
        threatCount={
          isLiveTab
            ? ENTITIES.filter((e) => e.affiliation === 'hostile').length
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
        <div className="bg-border grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_220px] gap-px">
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
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-8 items-center gap-1.5 px-3 font-mono text-[11px] font-semibold"
              >
                <Send className="size-3.5" />
                Ask
              </button>
            </div>
            <div className="flex min-w-0 gap-1 overflow-x-auto">
              {[
                'Give me an update on the last 10 minutes',
                'Launch ROOK-1 to investigate',
                'What evidence supports this recommendation?',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitMissionQuery(prompt, false)}
                  className="border-border bg-card hover:bg-secondary text-muted-foreground shrink-0 border px-2 py-1 font-mono text-[10px]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleVoiceCommand}
            className={[
              'flex flex-col items-start justify-center gap-1 px-3 text-left transition-colors',
              voiceListening
                ? 'bg-primary text-primary-foreground'
                : voiceArmed
                  ? 'bg-primary/15 text-primary hover:bg-primary/20'
                  : 'bg-card text-muted-foreground hover:bg-secondary',
            ].join(' ')}
            aria-label="Start voice command"
          >
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold">
              <Mic className="size-4" />
              {voiceListening ? 'LISTENING' : 'VOICE COMMAND'}
            </span>
            <span className="line-clamp-2 text-[10px] leading-snug">
              {voiceTranscript}
            </span>
          </button>
        </div>
      </form>

      <LiveFeedStrip events={events} onSelect={handleSelect} />

      <main className="bg-border grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto lg:grid-cols-[76px_320px_minmax(0,1fr)_360px] lg:grid-rows-1 lg:overflow-hidden">
        <WorkspaceRail
          active={workspace}
          onSelect={setWorkspace}
          voiceArmed={voiceArmed}
        />

        {/* LEFT — orient (status surfaces, objective at top) */}
        <div className="order-2 min-h-[430px] overflow-hidden lg:order-1 lg:min-h-0">
          <ColStatus
            workspace={workspace}
            objective={activeMission}
            units={isLiveTab ? units : []}
            entities={isLiveTab ? ENTITIES : []}
            events={isLiveTab ? events : []}
            reports={isLiveTab ? reports : []}
            selectedId={selected?._id}
            onSelect={handleSelect}
            onLaunchDrone={handleLaunchDrone}
            onLaunchSwarm={handleLaunchSwarm}
            onInjectFeed={handleInjectFeed}
            onGeneratePlan={handleGeneratePlan}
          />
        </div>

        {/* CENTER — observe (map, the hero) */}
        <div className="order-1 min-h-[480px] overflow-hidden lg:order-2 lg:min-h-0">
          <WorkspaceCenter
            workspace={workspace}
            objective={activeMission}
            entities={isLiveTab ? ENTITIES : []}
            units={isLiveTab ? units : []}
            events={isLiveTab ? events : []}
            reports={isLiveTab ? reports : []}
            recommendations={isLiveTab ? recommendations : []}
            selectedId={selected?._id}
            activeFeedSource={activeFeedSource}
            activeDroneFeed={activeDroneFeed}
            onSelect={handleSelect}
            onInjectFeed={handleInjectFeed}
            onLaunchDrone={handleLaunchDrone}
            onLaunchSwarm={handleLaunchSwarm}
            onGeneratePlan={handleGeneratePlan}
            onAsk={submitMissionQuery}
          />
        </div>

        {/* RIGHT — decide + act (copilot) */}
        <div className="order-3 min-h-[560px] overflow-hidden lg:min-h-0">
          <WorkspaceContextRail
            workspace={workspace}
            entities={isLiveTab ? ENTITIES : []}
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
      />
    </div>
  );
}

function WorkspaceRail({
  active,
  onSelect,
  voiceArmed,
}: {
  active: WorkspaceSectionId;
  onSelect: (id: WorkspaceSectionId) => void;
  voiceArmed: boolean;
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
      <div className="border-border mt-auto hidden border-t p-2 lg:block">
        <div className="text-muted-foreground label-cap-sm mb-1">Voice</div>
        <div
          className={[
            'border px-1.5 py-1 text-center font-mono text-[10px]',
            voiceArmed
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground',
          ].join(' ')}
        >
          {voiceArmed ? 'ARMED' : 'STBY'}
        </div>
      </div>
    </nav>
  );
}
