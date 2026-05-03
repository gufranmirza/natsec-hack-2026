// Ontology types — TypeScript shapes mirroring
// platform-control-plane/docs/0002-ontology-object-specs.md.
//
// Every Object Type extends OntologyEnvelope and carries the
// `_type` discriminator that lets the UI render Object handles as
// {_type, _id, ...} chips (the OAG visible signature).

export type LatLon = [number, number];

export type Priority = 'P0' | 'P1' | 'P2';

export type Affiliation = 'friendly' | 'hostile' | 'unknown' | 'neutral';

// ──────────────────────────────────────────────────────────────────
// Common envelope (ADR 0002 §4)
// ──────────────────────────────────────────────────────────────────

export interface OntologyEnvelope {
  _type:
    | 'Entity'
    | 'Event'
    | 'Report'
    | 'Unit'
    | 'Recommendation'
    | 'MissionObjective'
    | 'Plan'
    | 'Mission'
    | 'TaskingOrder';
  _id: string;
  _version: number;
  _observed_at: string; // ISO-8601
  _ingested_at: string;
  _source: string;
  _source_ref?: string;
}

// ──────────────────────────────────────────────────────────────────
// Entity (ADR 0002 §5.1)
// ──────────────────────────────────────────────────────────────────

export type EntitySubtype =
  | 'Vessel'
  | 'Aircraft'
  | 'Vehicle'
  | 'Person'
  | 'Threat'
  | 'Unknown';

export type ThreatLevel = 'none' | 'low' | 'med' | 'high';

export interface Entity extends OntologyEnvelope {
  _type: 'Entity';
  _subtype: EntitySubtype;
  affiliation: Affiliation; // not in ADR but needed for glyph rendering
  name?: string;
  position: LatLon;
  altitude_m?: number;
  heading_deg?: number;
  speed_mps?: number;
  course_deg?: number;
  confidence: number; // 0..1
  threat_level: ThreatLevel;
  attributes?: Record<string, string>;
}

// ──────────────────────────────────────────────────────────────────
// Event (ADR 0002 §5.2)
// ──────────────────────────────────────────────────────────────────

// Subtypes are grouped by category; all are wire-compatible since
// control-plane ADR 0002 §5.2 accepts free-form `_subtype` strings.
// New values added per UI ADR 0002 §12 (OP SILENT EYE scenario).
export type EventSubtype =
  // legacy / generic
  | 'detection'
  | 'deviation'
  | 'rf_ping'
  | 'ais_gap'
  | 'anomaly'
  | 'report_link'
  // ISR
  | 'visual_detection'
  | 'cued_search'
  | 'track_acquired'
  | 'track_lost'
  | 'regained_track'
  | 'classification_upgrade'
  // C2 / comms
  | 'sigint_intercept'
  | 'comms_outage'
  | 'jam_pulse'
  | 'gps_denied_zone'
  | 'position_report'
  // kinetic
  | 'artillery_impact'
  | 'missile_launch'
  | 'air_strike'
  | 'fpv_strike'
  | 'loitering_munition_engage'
  | 'small_arms_contact'
  // ISR (additional — multi-source fusion)
  | 'thermal_signature'
  // maneuver
  | 'ground_advance'
  | 'withdrawal'
  | 'breach_attempt'
  | 'defensive_consolidation'
  | 'smoke_screen'
  | 'terrain_obscuration'
  // logistics & lifecycle
  | 'casevac_request'
  | 'medevac_dispatched'
  | 'unit_destroyed'
  | 'unit_damaged'
  // OSINT
  | 'geotagged_social_post';

export type EventSeverity = 'info' | 'warn' | 'critical';

export interface Event extends OntologyEnvelope {
  _type: 'Event';
  _subtype: EventSubtype;
  entity_id?: string;
  unit_id?: string;
  position?: LatLon;
  severity: EventSeverity;
  description: string;
  payload?: Record<string, unknown>;
  // UI-only convenience: serif verb for the change feed.
  verb?: string;
}

// ──────────────────────────────────────────────────────────────────
// Report (ADR 0002 §5.3)
// ──────────────────────────────────────────────────────────────────

export type ReportSubtype =
  | 'operator'
  | 'radio'
  | 'sigint'
  | 'osint'
  | 'unknown';

export type Classification = 'unclass' | 'cui' | 'confidential';

export interface Report extends OntologyEnvelope {
  _type: 'Report';
  _subtype: ReportSubtype;
  author?: string;
  channel?: string;
  text: string;
  text_embedding?: number[]; // omitted in fixtures
  entity_refs?: string[];
  classification: Classification;
}

// ──────────────────────────────────────────────────────────────────
// Unit (ADR 0002 §5.4)
// ──────────────────────────────────────────────────────────────────

// Original 5 plus finer-grained values per UI ADR 0002 §12 — kept
// in lockstep with the Go const block in
// platform-control-plane/internal/ontology/objects.go.
export type UnitSubtype =
  // legacy / generic
  | 'drone'
  | 'vehicle'
  | 'infantry'
  | 'boat'
  | 'command_post'
  // finer-grained, used by OP SILENT EYE
  | 'drone_isr'
  | 'drone_strike'
  | 'infantry_team'
  | 'infantry_recon'
  | 'infantry_kinetic'
  | 'vehicle_mech'
  | 'vehicle_recon'
  | 'vehicle_himars'
  | 'vehicle_mortar'
  | 'vehicle_medical'
  | 'vehicle_logistic';

export type UnitStatus =
  | 'idle'
  | 'en_route'
  | 'on_station'
  | 'returning'
  | 'offline';

// Stoplight tri-state derived from the underlying status — used
// in col 2's asset roster (Skydio convention).
export type UnitHealth = 'healthy' | 'limited' | 'inoperable';

export type UnitCapability = 'optical' | 'ir' | 'sigint' | 'eo' | 'kinetic';

export interface Unit extends OntologyEnvelope {
  _type: 'Unit';
  _subtype: UnitSubtype;
  callsign: string;
  position: LatLon;
  altitude_m?: number;
  heading_deg?: number;
  speed_mps?: number;
  status: UnitStatus;
  health: UnitHealth; // tri-state derived
  battery_pct?: number;
  fuel_pct?: number;
  capabilities: UnitCapability[];
  assigned_mission_id?: string;
}

// ──────────────────────────────────────────────────────────────────
// Recommendation (ADR 0002 §5.5)
// ──────────────────────────────────────────────────────────────────

export type RecommendationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired';

// Action gating tier from control-plane ADR 0001 §7.
export type ActionGating = 'auto' | 'confirm' | 'forbid-llm';

export interface Recommendation extends OntologyEnvelope {
  _type: 'Recommendation';
  subject_entity_id?: string;
  subject_event_id?: string;
  objective_id?: string;
  proposed_action_type: string;
  proposed_params: Record<string, unknown>;
  rationale: string;
  confidence: number; // 0..1
  evidence_refs: string[];
  status: RecommendationStatus;
  decided_by?: string;
  decided_at?: string;
  // UI-only display helpers.
  gating: ActionGating;
  verb: string; // serif verb prefix ("Vector", "Re-task", "Hand-off")
  short: string; // sentence body after the verb
  asset_callsign?: string;
  eta?: string;
  why?: string[]; // short evidence chips
}

// ──────────────────────────────────────────────────────────────────
// MissionObjective (ADR 0002 §5.6)
// ──────────────────────────────────────────────────────────────────

export type MissionObjectiveStatus =
  | 'open'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface MissionObjective extends OntologyEnvelope {
  _type: 'MissionObjective';
  title: string;
  description: string;
  priority: Priority;
  target_entity_id?: string;
  target_area?: LatLon[];
  deadline?: string;
  status: MissionObjectiveStatus;
}

// ──────────────────────────────────────────────────────────────────
// Plan (ADR 0002 §5.7)
// ──────────────────────────────────────────────────────────────────

export type PlanStatus =
  | 'draft'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'aborted';

export interface Plan extends OntologyEnvelope {
  _type: 'Plan';
  objective_id?: string;
  title: string;
  summary: string;
  status: PlanStatus;
  confidence: number;
  evidence_refs: string[];
  approved_by?: string;
  approved_at?: string;
}

// ──────────────────────────────────────────────────────────────────
// Mission (ADR 0002 §5.8)
// ──────────────────────────────────────────────────────────────────

export type MissionStatus =
  | 'queued'
  | 'en_route'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'aborted';

export interface Mission extends OntologyEnvelope {
  _type: 'Mission';
  plan_id: string;
  assigned_unit_id: string;
  target_entity_id?: string;
  intent: string;
  waypoints: LatLon[];
  status: MissionStatus;
  started_at?: string;
  completed_at?: string;
}

// ──────────────────────────────────────────────────────────────────
// TaskingOrder (ADR 0002 §5.9)
// ──────────────────────────────────────────────────────────────────

export type TaskingCommand =
  | 'goto'
  | 'hover'
  | 'return_to_base'
  | 'observe'
  | 'loiter'
  | 'abort';

export type TaskingStatus =
  | 'pending'
  | 'sent'
  | 'acknowledged'
  | 'executing'
  | 'completed'
  | 'failed';

export interface TaskingOrder extends OntologyEnvelope {
  _type: 'TaskingOrder';
  mission_id: string;
  unit_id: string;
  command_type: TaskingCommand;
  params: Record<string, unknown>;
  status: TaskingStatus;
  issued_by: string;
  issued_at: string;
  acknowledged_at?: string;
  result?: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────
// Union of any Object — for typed Object handles in the AI stream.
// ──────────────────────────────────────────────────────────────────

export type AnyObject =
  | Entity
  | Event
  | Report
  | Unit
  | Recommendation
  | MissionObjective
  | Plan
  | Mission
  | TaskingOrder;

// ──────────────────────────────────────────────────────────────────
// Map projection helpers — fictional grid centred on the Aegean.
// ──────────────────────────────────────────────────────────────────

export const MAP_VIEWBOX = { w: 1000, h: 700 } as const;

// Bounds of the demo's visible area (rough Aegean window).
export const MAP_BOUNDS = {
  lat_min: 38.46,
  lat_max: 38.96,
  lon_min: 23.15,
  lon_max: 23.85,
} as const;

export function latLonToSvg(pos: LatLon): { x: number; y: number } {
  const [lat, lon] = pos;
  const x =
    ((lon - MAP_BOUNDS.lon_min) / (MAP_BOUNDS.lon_max - MAP_BOUNDS.lon_min)) *
    MAP_VIEWBOX.w;
  // y is flipped — north is up (smaller y), south is down.
  const y =
    ((MAP_BOUNDS.lat_max - lat) / (MAP_BOUNDS.lat_max - MAP_BOUNDS.lat_min)) *
    MAP_VIEWBOX.h;
  return { x, y };
}
