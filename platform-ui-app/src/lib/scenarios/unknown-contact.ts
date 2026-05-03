// unknown-contact scenario
//
// Scripted, end-to-end ISR demo that ties together every column of the
// home view. An unknown contact pops onto the map, the recommendation
// engine fires a `vector_isr` proposal, the operator approves, the
// assigned drone walks to the contact and scans it, an upgraded
// classification + SITREP land in the mission graph.
//
// Every milestone is persisted to the control plane via the existing
// /api/v1/ingest/* endpoints so the agent can later SELECT against the
// resulting rows when the operator asks "what did ROOK-1 find?". The
// UI state setters are also called optimistically so the operator
// doesn't have to wait on the next 5s poll to see the change.
//
// Phases:
//   1. detect          — Entity + visual_detection Event + sigint Report
//   2. recommend       — Recommendation (vector_isr, status=pending)
//   3. approve         — wait for operator decision; mark accepted
//   4. transit         — interpolate drone position toward target on a
//                        TICK_MS cadence, posting a new Unit row each
//                        tick with _version + n
//   5. arrive_analyze  — upgrade Entity (subtype / affiliation / threat
//                        level / confidence), emit track_acquired +
//                        classification_upgrade Events, attach SITREP
//                        Report

import { putEntities } from '@/services/cp/entities/entities-api';
import { putEvents } from '@/services/cp/events/events-api';
import { putRecommendations } from '@/services/cp/recommendations/recommendations-api';
import { putReports } from '@/services/cp/reports/reports-api';
import { putUnits } from '@/services/cp/units/units-api';
import type {
  Entity,
  Event,
  LatLon,
  Recommendation,
  Report,
  Unit,
} from '@/types/ontology';

const TICK_MS = 1000;
// Total transit budget (ms). Tuned to keep the whole demo (10s
// pre-trigger delay + detect/recommend + operator decision +
// transit + analyze) under ~60s on a typical operator approval
// rhythm — long enough for the camera follow to read as motion,
// short enough not to feel laggy.
const TRANSIT_DURATION_MS = 22_000;
const ARRIVAL_RADIUS_M = 180;
const SOURCE = 'scenario:unknown-contact';

export interface ScenarioHooks {
  setEntities: React.Dispatch<React.SetStateAction<Entity[]>>;
  setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setReports: React.Dispatch<React.SetStateAction<Report[]>>;
  setRecommendations: React.Dispatch<React.SetStateAction<Recommendation[]>>;
  /**
   * Optional — when set, the scenario flips the UAS tab's active
   * camera feed to the dispatched drone the moment transit starts so
   * the operator can pop over to UAS and see the camera follow the
   * drone in to the target.
   */
  setActiveDroneFeed?: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export interface ScenarioConfig {
  drone: Unit;
  target: LatLon;
  contactName?: string;
  hooks: ScenarioHooks;
  // Called when the recommendation lands so the UI can highlight it.
  onRecommendation?: (rec: Recommendation) => void;
  // Called as the scenario advances; useful for HUD / status-line copy.
  onPhase?: (phase: ScenarioPhase) => void;
}

export type ScenarioPhase =
  | 'idle'
  | 'detected'
  | 'recommended'
  | 'approved'
  | 'transit'
  | 'arrived'
  | 'completed'
  | 'aborted';

export interface ScenarioHandle {
  /** Called by the UI when the operator approves the scenario's rec. */
  approve: () => void;
  /** Cancel timers; safe to call after the scenario has already completed. */
  abort: () => void;
  /** Best-effort introspection for tests / debugging. */
  phase: () => ScenarioPhase;
}

export function startUnknownContactScenario(
  cfg: ScenarioConfig,
): ScenarioHandle {
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const contactName =
    cfg.contactName ?? `UNK-${nonce.slice(-4).toUpperCase()}`;
  const entityId = `ent_unknown_${nonce}`;
  const recId = `rec_vector_isr_${nonce}`;
  const detectionEventId = `evt_visual_detection_${nonce}`;
  const sigintReportId = `rep_sigint_cue_${nonce}`;

  let phase: ScenarioPhase = 'idle';
  let aborted = false;
  let transitTimer: ReturnType<typeof setInterval> | null = null;
  let unitVersion = (cfg.drone._version ?? 1) + 1;
  let entityVersion = 1;
  const startPos = cfg.drone.position;
  const transitStartedAt = { value: 0 };

  const setPhase = (next: ScenarioPhase) => {
    if (aborted && next !== 'aborted') return;
    phase = next;
    cfg.onPhase?.(next);
  };

  const fail = (label: string, err: unknown) => {
    // CP write failures shouldn't break the optimistic UI; log + carry on.
    // Operator will still see the local state mutation; reconciliation
    // happens (or doesn't) on the next CP poll.
    // eslint-disable-next-line no-console
    console.error(`[scenario] ${label} failed`, err);
  };

  // ── Phase 1: detect ─────────────────────────────────────────────
  const detect = async () => {
    if (aborted) return;
    const observedAt = new Date().toISOString();
    const newEntity: Entity = {
      _type: 'Entity',
      _id: entityId,
      _version: entityVersion,
      _source: SOURCE,
      _source_ref: `unknown-contact-${nonce}`,
      _observed_at: observedAt,
      _ingested_at: observedAt,
      _subtype: 'Unknown',
      affiliation: 'unknown',
      name: contactName,
      position: cfg.target,
      heading_deg: 90,
      speed_mps: 0,
      confidence: 0.42,
      threat_level: 'low',
      attributes: {
        status: 'unresolved',
        cue: 'multi-source convergence',
        first_seen: observedAt,
      },
    };
    const detectionEvent: Event = {
      _type: 'Event',
      _id: detectionEventId,
      _version: 1,
      _source: SOURCE,
      _source_ref: `visual-detection-${nonce}`,
      _observed_at: observedAt,
      _ingested_at: observedAt,
      _subtype: 'visual_detection',
      severity: 'warn',
      entity_id: entityId,
      position: cfg.target,
      description: `New unresolved contact ${contactName} detected near ${cfg.target[0].toFixed(3)}°N ${cfg.target[1].toFixed(3)}°E. Multi-source cue (FALCON-1 EO + SIG-A RF). Awaiting drone ISR confirmation.`,
      verb: 'Detected.',
      payload: { scenario: 'unknown-contact', nonce, contact: contactName },
    };
    const sigintReport: Report = {
      _type: 'Report',
      _id: sigintReportId,
      _version: 1,
      _source: SOURCE,
      _source_ref: `sigint-cue-${nonce}`,
      _observed_at: observedAt,
      _ingested_at: observedAt,
      _subtype: 'sigint',
      author: 'SIG-A',
      text: `RF cue at ${cfg.target[0].toFixed(4)}°N ${cfg.target[1].toFixed(4)}°E — short UHF burst, signature unmatched. Cross-correlated with FALCON-1 EO clutter pickup. Recommend ROOK-1 vector for visual confirmation.`,
      classification: 'cui',
      entity_refs: [entityId],
    };

    cfg.hooks.setEntities((cur) => [newEntity, ...cur]);
    cfg.hooks.setEvents((cur) => [detectionEvent, ...cur]);
    cfg.hooks.setReports((cur) => [sigintReport, ...cur]);
    setPhase('detected');

    try {
      await Promise.all([
        putEntities([newEntity]),
        putEvents([detectionEvent]),
        putReports([sigintReport]),
      ]);
    } catch (err) {
      fail('detect', err);
    }
    if (!aborted) recommend();
  };

  // ── Phase 2: recommend ─────────────────────────────────────────
  const recommend = async () => {
    if (aborted) return;
    const observedAt = new Date().toISOString();
    const proposedParams = {
      asset: cfg.drone._id,
      asset_callsign: cfg.drone.callsign,
      target_entity_id: entityId,
      target_position: cfg.target,
      pattern: 'standoff orbit',
      eta_seconds: Math.round(TRANSIT_DURATION_MS / 1000),
    };
    const rec: Recommendation = {
      _type: 'Recommendation',
      _id: recId,
      _version: 1,
      _source: SOURCE,
      _source_ref: `vector-isr-${nonce}`,
      _observed_at: observedAt,
      _ingested_at: observedAt,
      proposed_action_type: 'vector_isr',
      proposed_params: proposedParams,
      rationale: `Unknown contact ${contactName} at ${cfg.target[0].toFixed(3)}°N ${cfg.target[1].toFixed(3)}°E corroborated by RF + EO. ${cfg.drone.callsign} is closest camera-equipped asset and within fuel envelope; vector for visual ID before threat assessment.`,
      confidence: 0.83,
      evidence_refs: [detectionEventId, sigintReportId],
      status: 'pending',
      // UI-only display helpers — stripped on the wire by the
      // recommendations-api denormalizer, surfaced in the local rec
      // card immediately so we don't have to wait for the read-side
      // normalizer to fill them in.
      verb: 'Vector',
      short: `${cfg.drone.callsign} → ${contactName}`,
      gating: 'confirm',
      why: [
        'multi-source RF + EO',
        'unresolved contact',
        'visual ID required',
      ],
      eta: `${Math.round(TRANSIT_DURATION_MS / 1000)}s ETA`,
      asset_callsign: cfg.drone.callsign,
      subject_entity_id: entityId,
    };
    cfg.hooks.setRecommendations((cur) => [rec, ...cur]);
    cfg.onRecommendation?.(rec);
    setPhase('recommended');
    try {
      await putRecommendations([rec]);
    } catch (err) {
      fail('recommend', err);
    }
    // Phase 3 (approve) is operator-driven — wait for handle.approve().
  };

  // ── Phase 3: approve (operator-triggered) ──────────────────────
  const approve = async () => {
    if (aborted || phase !== 'recommended') return;
    const observedAt = new Date().toISOString();
    cfg.hooks.setRecommendations((cur) =>
      cur.map((r) =>
        r._id === recId
          ? {
              ...r,
              status: 'accepted',
              decided_by: 'operator',
              decided_at: observedAt,
              _version: 2,
              _ingested_at: observedAt,
            }
          : r,
      ),
    );
    const approvalEvent: Event = {
      _type: 'Event',
      _id: `evt_approval_${nonce}`,
      _version: 1,
      _source: 'operator-action',
      _source_ref: `approval-${nonce}`,
      _observed_at: observedAt,
      _ingested_at: observedAt,
      _subtype: 'report_link',
      severity: 'info',
      entity_id: entityId,
      unit_id: cfg.drone._id,
      description: `Operator approved vector_isr: ${cfg.drone.callsign} dispatched to investigate unknown contact ${contactName}.`,
      verb: 'Approved.',
      payload: {
        recommendation_id: recId,
        proposed_action_type: 'vector_isr',
        scenario: 'unknown-contact',
      },
    };
    cfg.hooks.setEvents((cur) => [approvalEvent, ...cur]);

    const acceptedRec: Recommendation = {
      _type: 'Recommendation',
      _id: recId,
      _version: 2,
      _source: SOURCE,
      _source_ref: `vector-isr-${nonce}`,
      _observed_at: observedAt,
      _ingested_at: observedAt,
      proposed_action_type: 'vector_isr',
      proposed_params: {
        asset: cfg.drone._id,
        asset_callsign: cfg.drone.callsign,
        target_entity_id: entityId,
      },
      rationale: 'Approved by operator.',
      confidence: 0.83,
      evidence_refs: [detectionEventId, sigintReportId],
      status: 'accepted',
      decided_by: 'operator',
      decided_at: observedAt,
      // UI-only display helpers preserved through the accept path.
      verb: 'Vector',
      short: `${cfg.drone.callsign} → unknown contact`,
      gating: 'confirm',
      why: ['operator approved', 'transit started'],
      eta: `${Math.round(TRANSIT_DURATION_MS / 1000)}s ETA`,
      asset_callsign: cfg.drone.callsign,
      subject_entity_id: entityId,
    };
    setPhase('approved');
    try {
      await Promise.all([
        putRecommendations([acceptedRec]),
        putEvents([approvalEvent]),
      ]);
    } catch (err) {
      fail('approve', err);
    }
    if (!aborted) startTransit();
  };

  // ── Phase 4: transit ───────────────────────────────────────────
  const startTransit = () => {
    if (aborted) return;
    setPhase('transit');
    transitStartedAt.value = Date.now();
    cfg.hooks.setActiveDroneFeed?.(cfg.drone._id);
    transitTimer = setInterval(transitTick, TICK_MS);
    // Fire one tick immediately so the drone starts moving without
    // waiting TICK_MS for the first interval frame.
    void transitTick();
  };

  const transitTick = async () => {
    if (aborted) return;
    const elapsed = Date.now() - transitStartedAt.value;
    const t = Math.min(1, elapsed / TRANSIT_DURATION_MS);
    const lat = startPos[0] + (cfg.target[0] - startPos[0]) * t;
    const lon = startPos[1] + (cfg.target[1] - startPos[1]) * t;
    const heading = bearingDegrees(startPos, cfg.target);
    const observedAt = new Date().toISOString();
    const updated: Unit = {
      ...cfg.drone,
      position: [lat, lon],
      heading_deg: heading,
      status: 'en_route',
      _version: unitVersion,
      _observed_at: observedAt,
      _ingested_at: observedAt,
    };
    unitVersion += 1;
    cfg.hooks.setUnits((cur) =>
      cur.map((u) => (u._id === cfg.drone._id ? updated : u)),
    );
    try {
      await putUnits([updated]);
    } catch (err) {
      fail('transit-tick', err);
    }

    if (
      t >= 1 ||
      haversineMeters([lat, lon], cfg.target) <= ARRIVAL_RADIUS_M
    ) {
      if (transitTimer) {
        clearInterval(transitTimer);
        transitTimer = null;
      }
      setPhase('arrived');
      void analyze();
    }
  };

  // ── Phase 5: arrive + analyze ──────────────────────────────────
  const analyze = async () => {
    if (aborted) return;
    const observedAt = new Date().toISOString();
    const sitrepText = `${cfg.drone.callsign} EO/IR on station over ${cfg.target[0].toFixed(4)}°N ${cfg.target[1].toFixed(4)}°E. Visual: tracked-vehicle signature, ~14m hull length, hot engine compartment, no friendly markings. Reclassifying contact ${entityId} as hostile motorized element. Confidence 0.86.`;

    const upgraded: Entity = {
      _type: 'Entity',
      _id: entityId,
      _version: entityVersion + 1,
      _source: SOURCE,
      _source_ref: `unknown-contact-${nonce}`,
      _observed_at: observedAt,
      _ingested_at: observedAt,
      _subtype: 'Vehicle',
      affiliation: 'hostile',
      name: contactName,
      position: cfg.target,
      heading_deg: 90,
      speed_mps: 0,
      confidence: 0.86,
      threat_level: 'med',
      attributes: {
        status: 'classified',
        cue: 'rook ISR pass',
        platform: 'tracked vehicle (T-72/MT-LB class)',
        platform_role: 'motorized element forward line',
      },
    };
    entityVersion += 1;

    const trackEvent: Event = {
      _type: 'Event',
      _id: `evt_track_acquired_${nonce}`,
      _version: 1,
      _source: SOURCE,
      _source_ref: `track-acquired-${nonce}`,
      _observed_at: observedAt,
      _ingested_at: observedAt,
      _subtype: 'track_acquired',
      severity: 'warn',
      entity_id: entityId,
      unit_id: cfg.drone._id,
      position: cfg.target,
      description: `${cfg.drone.callsign} EO acquires hard track on contact ${contactName}. Confidence 0.86.`,
      verb: 'Acquired.',
      payload: { scenario: 'unknown-contact', nonce },
    };
    const upgradeEvent: Event = {
      _type: 'Event',
      _id: `evt_classification_upgrade_${nonce}`,
      _version: 1,
      _source: SOURCE,
      _source_ref: `classification-upgrade-${nonce}`,
      _observed_at: observedAt,
      _ingested_at: observedAt,
      _subtype: 'classification_upgrade',
      severity: 'critical',
      entity_id: entityId,
      unit_id: cfg.drone._id,
      position: cfg.target,
      description: `Fusion: EO confirms tracked-vehicle hull + thermal signature + RF cue match → hostile motorized. Contact ${contactName} reclassified Unknown → Vehicle, hostile, threat_level=med.`,
      verb: 'Reclassified.',
      payload: {
        scenario: 'unknown-contact',
        from: { _subtype: 'Unknown', affiliation: 'unknown' },
        to: { _subtype: 'Vehicle', affiliation: 'hostile' },
      },
    };
    const sitrep: Report = {
      _type: 'Report',
      _id: `rep_sitrep_${nonce}`,
      _version: 1,
      _source: SOURCE,
      _source_ref: `sitrep-${nonce}`,
      _observed_at: observedAt,
      _ingested_at: observedAt,
      _subtype: 'operator',
      author: cfg.drone.callsign,
      text: sitrepText,
      classification: 'cui',
      entity_refs: [entityId],
    };

    cfg.hooks.setEntities((cur) =>
      cur.map((e) => (e._id === entityId ? upgraded : e)),
    );
    cfg.hooks.setEvents((cur) => [upgradeEvent, trackEvent, ...cur]);
    cfg.hooks.setReports((cur) => [sitrep, ...cur]);
    cfg.hooks.setUnits((cur) =>
      cur.map((u) =>
        u._id === cfg.drone._id
          ? {
              ...u,
              status: 'on_station',
              speed_mps: 0,
              _version: unitVersion,
              _observed_at: observedAt,
              _ingested_at: observedAt,
            }
          : u,
      ),
    );
    unitVersion += 1;

    setPhase('completed');
    try {
      await Promise.all([
        putEntities([upgraded]),
        putEvents([trackEvent, upgradeEvent]),
        putReports([sitrep]),
      ]);
    } catch (err) {
      fail('analyze', err);
    }
  };

  // Kick off Phase 1.
  void detect();

  return {
    approve,
    abort: () => {
      aborted = true;
      if (transitTimer) {
        clearInterval(transitTimer);
        transitTimer = null;
      }
      setPhase('aborted');
    },
    phase: () => phase,
  };
}

// Bearing in degrees from a → b (great-circle initial bearing, but for
// the small intra-AO distances we deal with the equirectangular form is
// indistinguishable and a lot cheaper).
function bearingDegrees(a: LatLon, b: LatLon): number {
  const dy = b[0] - a[0];
  const dx = (b[1] - a[1]) * Math.cos(((a[0] + b[0]) / 2) * (Math.PI / 180));
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

function haversineMeters(a: LatLon, b: LatLon): number {
  const R = 6_371_000;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
