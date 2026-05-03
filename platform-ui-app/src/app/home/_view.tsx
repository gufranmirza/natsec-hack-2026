'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Entity,
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

const SOURCE_SHORT_LABELS: Record<DataSourceId, string> = {
  radio: 'radio traffic',
  satellite: 'satellite imagery',
  intel: 'intelligence reports',
  social: 'public OSINT',
  allies: 'allied communications',
  drone_video: 'drone video',
};

export function HomeView() {
  const [activeMissionId, setActiveMissionId] =
    useState<string>(ACTIVE_MISSION_ID);
  const [workspace, setWorkspace] = useState<WorkspaceSectionId>('awareness');
  const [entities, setEntities] = useState<Entity[]>(ENTITIES);
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
  const [aiAnswer, setAiAnswer] = useState<MissionAnswer | undefined>();
  const [now, setNow] = useState(() => new Date());

  const activeMission =
    MISSIONS.find((m) => m._id === activeMissionId) ?? MISSIONS[0];
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
      setAiAnswer({
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
      setAiAnswer({
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
    setAiAnswer({
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
      setAiAnswer({
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
    setAiAnswer({
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
    setAiAnswer({
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
        setAiAnswer({
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
      setAiAnswer({
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

  const submitMissionQuery = useCallback(
    (rawQuery: string, fromVoice = false) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) return;

      const lower = trimmed.toLowerCase();
      const answer = buildMissionAnswer(trimmed, fromVoice);
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
      setAiAnswer(answer);
      setVoiceTranscript(trimmed);
    },
    [
      appendEvent,
      buildMissionAnswer,
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
                onClick={handleVoiceCommand}
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
            <div className="text-muted-foreground flex min-w-0 items-center gap-2 font-mono text-[10px]">
              <span
                className={[
                  'size-1.5 shrink-0',
                  voiceListening
                    ? 'bg-warning animate-pulse'
                    : voiceArmed
                      ? 'bg-primary'
                      : 'bg-muted-foreground',
                ].join(' ')}
              />
              <span className="truncate">Voice command: {voiceTranscript}</span>
              {aiAnswer ? (
                <span className="text-primary ml-auto hidden min-w-0 max-w-[45%] truncate lg:block">
                  Answer {_timeLabel(aiAnswer.generatedAt)}: {aiAnswer.response}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </form>

      <LiveFeedStrip events={events} onSelect={handleSelect} />

      <main className="bg-border grid min-h-0 flex-1 grid-cols-1 gap-px overflow-y-auto lg:grid-cols-[76px_320px_minmax(0,1fr)_360px] lg:grid-rows-1 lg:overflow-hidden">
        <WorkspaceRail
          active={workspace}
          onSelect={setWorkspace}
          voiceArmed={voiceArmed}
          voiceListening={voiceListening}
          voiceTranscript={voiceTranscript}
          onVoiceCommand={handleVoiceCommand}
        />

        {/* LEFT — orient (status surfaces, objective at top) */}
        <div className="order-2 min-h-[430px] overflow-hidden lg:order-1 lg:min-h-0">
          <ColStatus
            workspace={workspace}
            objective={activeMission}
            units={isLiveTab ? units : []}
            entities={isLiveTab ? entities : []}
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
            missions={MISSIONS}
            activeMissionId={activeMissionId}
            entities={isLiveTab ? entities : []}
            units={isLiveTab ? units : []}
            events={isLiveTab ? events : []}
            reports={isLiveTab ? reports : []}
            recommendations={isLiveTab ? recommendations : []}
            aiAnswer={aiAnswer}
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
          />
        </div>

        {/* RIGHT — decide + act (copilot) */}
        <div className="order-3 min-h-[560px] overflow-hidden lg:min-h-0">
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
      />
    </div>
  );
}

function WorkspaceRail({
  active,
  onSelect,
  voiceArmed,
  voiceListening,
  voiceTranscript,
  onVoiceCommand,
}: {
  active: WorkspaceSectionId;
  onSelect: (id: WorkspaceSectionId) => void;
  voiceArmed: boolean;
  voiceListening: boolean;
  voiceTranscript: string;
  onVoiceCommand: () => void;
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
        <button
          type="button"
          onClick={onVoiceCommand}
          className={[
            'w-full border px-1.5 py-1 text-center font-mono text-[10px] transition-colors',
            voiceListening
              ? 'border-warning bg-warning text-background'
              : voiceArmed
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-secondary',
          ].join(' ')}
        >
          {voiceListening ? 'LIVE' : voiceArmed ? 'ARMED' : 'STBY'}
        </button>
        <div className="text-muted-foreground mt-1 line-clamp-3 font-mono text-[9px] leading-snug">
          {voiceTranscript}
        </div>
      </div>
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

function _timeLabel(iso: string) {
  return iso.split('T')[1]?.slice(0, 8) ?? iso;
}
