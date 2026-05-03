package agent

// dataCatalog is the canonical, hand-curated description of the ontology
// schema that the LLM uses to author SQL. It mirrors internal/ontology/schema.go
// in plain English with ClickHouse-flavored hints (FINAL, argMax-by-version).
//
// Keep this in sync with schema.go when columns / tables change. The LLM
// will hallucinate columns that don't exist if this drifts.
const dataCatalog = `
DATABASE CATALOG (ClickHouse)
─────────────────────────────────────────────────────────────────────
All tables are ReplacingMergeTree(_version) keyed on _id. To get the
latest version of a row use either ` + "`" + `SELECT ... FROM <table> FINAL` + "`" + `
or ` + "`" + `argMax(<col>, _version) ... GROUP BY _id` + "`" + `. Default to FINAL.

Common columns on every row (envelope):
  _id           String                    object identifier (e.g. "unit_rook1")
  _version      UInt64                    monotonic version (use FINAL to dedupe)
  _observed_at  DateTime64(3)             when the source observed it (UTC)
  _ingested_at  DateTime64(3)             when CP wrote it (UTC)
  _source       LowCardinality(String)    "fixture" | "mavlink:..." | "agent:azure-openai" | ...
  _source_ref   Nullable(String)          source-specific external id

──── entity ────────────────── anything observable on the map
  _subtype       LowCardinality(String)  "Vessel" | "Aircraft" | "Vehicle" | "Person" | "Threat" | "Unknown"
  name           Nullable(String)        e.g. "BOGEY-7"
  lat, lon       Float64                 WGS84 degrees
  altitude_m     Nullable(Float64)
  heading_deg    Nullable(Float64)       0=N, 90=E
  speed_mps      Nullable(Float64)
  course_deg     Nullable(Float64)
  confidence     Float32                 0.0 – 1.0
  threat_level   LowCardinality(String)  "none" | "low" | "med" | "high"
  attributes     Map(String,String)      free-form tags

──── event ─────────────────── discrete occurrences
  _subtype     LowCardinality(String)  open-vocabulary tag, NOT a closed enum.
                                       Real values seen include: detection, deviation,
                                       rf_ping, ais_gap, anomaly, report_link,
                                       thermal_signature, sigint_intercept, fpv_strike,
                                       unit_destroyed, unit_damaged, position_report,
                                       track_acquired, track_lost, missile_launch,
                                       comms_outage, geotagged_social_post,
                                       visual_detection, withdrawal, defensive_consolidation.
                                       When in doubt, query without _subtype filter
                                       OR use LIKE (e.g. _subtype LIKE 'thermal%').
  entity_id    Nullable(String)        which entity it concerns (FK to entity._id)
  unit_id      Nullable(String)        which unit observed it (FK to unit._id)
  lat, lon     Nullable(Float64)
  severity     LowCardinality(String)  "info" | "warn" | "critical"
  description  String                  human-readable text
  payload      String                  arbitrary JSON blob

──── unit ──────────────────── friendly assets under our control
  _subtype       LowCardinality(String)  "drone" | "vehicle" | "infantry" | "boat" | "command_post"
  callsign       String                  e.g. "ROOK-1"
  lat, lon       Float64
  altitude_m, heading_deg, speed_mps  Nullable(Float64)
  status         LowCardinality(String)  "idle" | "en_route" | "on_station" | "returning" | "offline"
  battery_pct    Nullable(Float32)
  fuel_pct       Nullable(Float32)
  capabilities   Array(LowCardinality(String))   ["optical","ir","sigint","eo","kinetic"]

──── recommendation ────────── AI-generated proposed actions
  subject_entity_id    Nullable(String)
  subject_event_id     Nullable(String)
  objective_id         Nullable(String)
  proposed_action_type LowCardinality(String)  "vectorUnit" | "loiterUnit" | "launchSwarm" | "reTaskUnit"
  proposed_params      String                  JSON-encoded params
  rationale            String
  confidence           Float32
  evidence_refs        Array(String)
  status               LowCardinality(String)  "pending" | "accepted" | "rejected" | "expired"
  decided_by           Nullable(String)
  decided_at           Nullable(DateTime64(3))

──── report ────────────────── intel / OSINT / radio reports
  _subtype       LowCardinality(String)  "intel" | "osint" | "radio" | "allied"
  author         Nullable(String)
  channel        Nullable(String)
  text           String                  the body
  text_embedding Array(Float32)
  entity_refs    Array(String)
  classification LowCardinality(String)

──── mission_objective ─────── what the commander cares about
  title, description  String
  priority            LowCardinality(String)   "P0" | "P1" | "P2"
  target_entity_id    Nullable(String)
  status              LowCardinality(String)   "open" | "active" | "completed" | "cancelled"

──── plan, mission, tasking_order ─── higher-level orchestration objects
  (only query when explicitly asked about plans/missions/tasking — usually
   the operator is asking about live picture, units, events, or entities)

──── link tables (relationships) ───────────────
  link_entity_observed_by_unit:    entity_id, unit_id, observed_at, confidence
  link_report_references_entity:   report_id, entity_id

QUERY EXAMPLES (good shape):
  SELECT callsign, status, battery_pct FROM unit FINAL ORDER BY callsign;
  SELECT _id, name, threat_level, lat, lon FROM entity FINAL WHERE threat_level IN ('high','med');
  SELECT _observed_at, severity, description FROM event FINAL
    WHERE _observed_at > now() - INTERVAL 1 HOUR ORDER BY _observed_at DESC LIMIT 20;
  SELECT proposed_action_type, status, confidence FROM recommendation FINAL WHERE status='pending';

NEVER write INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT,
RENAME, REPLACE, OPTIMIZE, SYSTEM, KILL — those will be rejected.
`
