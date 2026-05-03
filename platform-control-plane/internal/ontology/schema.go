package ontology

import (
	"context"
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"go.uber.org/zap"
)

// ddl is one CREATE TABLE statement, idempotent via IF NOT EXISTS.
type ddl struct {
	name string
	stmt string
}

// allDDLs is the ordered list of CREATE TABLE statements applied by Migrate.
// Order is not strictly required (CH has no FK enforcement), but kept stable
// for log readability.
var allDDLs = []ddl{
	{name: "entity", stmt: ddlEntity},
	{name: "event", stmt: ddlEvent},
	{name: "report", stmt: ddlReport},
	{name: "unit", stmt: ddlUnit},
	{name: "recommendation", stmt: ddlRecommendation},
	{name: "mission_objective", stmt: ddlMissionObjective},
	{name: "plan", stmt: ddlPlan},
	{name: "mission", stmt: ddlMission},
	{name: "tasking_order", stmt: ddlTaskingOrder},
	{name: "link_entity_observed_by_unit", stmt: ddlLinkEntityObservedByUnit},
	{name: "link_report_references_entity", stmt: ddlLinkReportReferencesEntity},

	// In-place column adds for tables created before the column existed.
	// Safe to run on fresh tables (CREATE TABLE above already includes
	// the column) — ALTER ... ADD COLUMN IF NOT EXISTS is idempotent.
	{name: "entity.affiliation", stmt: ddlEntityAffiliationAlter},
}

// Migrate applies all CREATE TABLE statements. Idempotent; safe to run on
// every boot.
func Migrate(ctx context.Context, conn driver.Conn, log *zap.Logger) error {
	log.Info("applying ontology migrations", zap.Int("count", len(allDDLs)))
	for _, d := range allDDLs {
		if err := conn.Exec(ctx, d.stmt); err != nil {
			return fmt.Errorf("migrate %q: %w", d.name, err)
		}
		log.Debug("migration applied", zap.String("table", d.name))
	}
	log.Info("ontology migrations complete")
	return nil
}

// ----------------------------------------------------------------------------
// DDL — Object Type tables.
// ----------------------------------------------------------------------------

const ddlEntity = `
CREATE TABLE IF NOT EXISTS entity (
    _id              String,
    _version         UInt64,
    _observed_at     DateTime64(3),
    _ingested_at     DateTime64(3),
    _source          LowCardinality(String),
    _source_ref      Nullable(String),
    _subtype         LowCardinality(String),
    name             Nullable(String),
    lat              Float64,
    lon              Float64,
    altitude_m       Nullable(Float64),
    heading_deg      Nullable(Float64),
    speed_mps        Nullable(Float64),
    course_deg       Nullable(Float64),
    confidence       Float32,
    threat_level     LowCardinality(String),
    affiliation      LowCardinality(String) DEFAULT '',
    attributes       Map(LowCardinality(String), String),
    INDEX idx_lat         lat           TYPE minmax  GRANULARITY 4,
    INDEX idx_lon         lon           TYPE minmax  GRANULARITY 4,
    INDEX idx_observed    _observed_at  TYPE minmax  GRANULARITY 4,
    INDEX idx_subtype     _subtype      TYPE set(64) GRANULARITY 4,
    INDEX idx_affiliation affiliation   TYPE set(8)  GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY _id
`

// ddlEntityAffiliationAlter back-fills the affiliation column on existing
// entity tables that were created before the column was added. Idempotent
// via IF NOT EXISTS. Drop this once all envs have been migrated.
const ddlEntityAffiliationAlter = `
ALTER TABLE entity ADD COLUMN IF NOT EXISTS affiliation LowCardinality(String) DEFAULT ''
`

const ddlEvent = `
CREATE TABLE IF NOT EXISTS event (
    _id              String,
    _version         UInt64,
    _observed_at     DateTime64(3),
    _ingested_at     DateTime64(3),
    _source          LowCardinality(String),
    _source_ref      Nullable(String),
    _subtype         LowCardinality(String),
    entity_id        Nullable(String),
    unit_id          Nullable(String),
    lat              Nullable(Float64),
    lon              Nullable(Float64),
    severity         LowCardinality(String),
    description      String,
    payload          String,
    INDEX idx_observed  _observed_at  TYPE minmax  GRANULARITY 4,
    INDEX idx_subtype   _subtype      TYPE set(64) GRANULARITY 4,
    INDEX idx_entity    entity_id     TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY _id
`

const ddlReport = `
CREATE TABLE IF NOT EXISTS report (
    _id              String,
    _version         UInt64,
    _observed_at     DateTime64(3),
    _ingested_at     DateTime64(3),
    _source          LowCardinality(String),
    _source_ref      Nullable(String),
    _subtype         LowCardinality(String),
    author           Nullable(String),
    channel          Nullable(String),
    text             String,
    text_embedding   Array(Float32),
    entity_refs      Array(String),
    classification   LowCardinality(String),
    INDEX idx_observed  _observed_at  TYPE minmax  GRANULARITY 4,
    INDEX idx_subtype   _subtype      TYPE set(64) GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY _id
`

const ddlUnit = `
CREATE TABLE IF NOT EXISTS unit (
    _id              String,
    _version         UInt64,
    _observed_at     DateTime64(3),
    _ingested_at     DateTime64(3),
    _source          LowCardinality(String),
    _source_ref      Nullable(String),
    _subtype         LowCardinality(String),
    callsign         String,
    lat              Float64,
    lon              Float64,
    altitude_m       Nullable(Float64),
    heading_deg      Nullable(Float64),
    speed_mps        Nullable(Float64),
    status           LowCardinality(String),
    battery_pct      Nullable(Float32),
    fuel_pct         Nullable(Float32),
    capabilities     Array(LowCardinality(String)),
    INDEX idx_lat       lat           TYPE minmax  GRANULARITY 4,
    INDEX idx_lon       lon           TYPE minmax  GRANULARITY 4,
    INDEX idx_status    status        TYPE set(8)  GRANULARITY 4,
    INDEX idx_callsign  callsign      TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY _id
`

const ddlRecommendation = `
CREATE TABLE IF NOT EXISTS recommendation (
    _id                   String,
    _version              UInt64,
    _observed_at          DateTime64(3),
    _ingested_at          DateTime64(3),
    _source               LowCardinality(String),
    subject_entity_id     Nullable(String),
    subject_event_id      Nullable(String),
    objective_id          Nullable(String),
    proposed_action_type  LowCardinality(String),
    proposed_params       String,
    rationale             String,
    confidence            Float32,
    evidence_refs         Array(String),
    status                LowCardinality(String),
    decided_by            Nullable(String),
    decided_at            Nullable(DateTime64(3)),
    INDEX idx_observed  _observed_at  TYPE minmax  GRANULARITY 4,
    INDEX idx_status    status        TYPE set(8)  GRANULARITY 4,
    INDEX idx_subj_ent  subject_entity_id TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY _id
`

const ddlMissionObjective = `
CREATE TABLE IF NOT EXISTS mission_objective (
    _id                String,
    _version           UInt64,
    _observed_at       DateTime64(3),
    _ingested_at       DateTime64(3),
    _source            LowCardinality(String),
    title              String,
    description        String,
    priority           LowCardinality(String),
    target_entity_id   Nullable(String),
    target_area        Array(Tuple(Float64, Float64)),
    deadline           Nullable(DateTime64(3)),
    status             LowCardinality(String),
    INDEX idx_observed  _observed_at  TYPE minmax  GRANULARITY 4,
    INDEX idx_status    status        TYPE set(8)  GRANULARITY 4,
    INDEX idx_priority  priority      TYPE set(4)  GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY _id
`

const ddlPlan = `
CREATE TABLE IF NOT EXISTS plan (
    _id             String,
    _version        UInt64,
    _observed_at    DateTime64(3),
    _ingested_at    DateTime64(3),
    _source         LowCardinality(String),
    objective_id    Nullable(String),
    title           String,
    summary         String,
    status          LowCardinality(String),
    confidence      Float32,
    evidence_refs   Array(String),
    approved_by     Nullable(String),
    approved_at     Nullable(DateTime64(3)),
    INDEX idx_observed  _observed_at  TYPE minmax  GRANULARITY 4,
    INDEX idx_status    status        TYPE set(8)  GRANULARITY 4,
    INDEX idx_objective objective_id  TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY _id
`

const ddlMission = `
CREATE TABLE IF NOT EXISTS mission (
    _id                String,
    _version           UInt64,
    _observed_at       DateTime64(3),
    _ingested_at       DateTime64(3),
    _source            LowCardinality(String),
    plan_id            String,
    assigned_unit_id   String,
    target_entity_id   Nullable(String),
    intent             String,
    waypoints          Array(Tuple(Float64, Float64)),
    status             LowCardinality(String),
    started_at         Nullable(DateTime64(3)),
    completed_at       Nullable(DateTime64(3)),
    INDEX idx_observed  _observed_at      TYPE minmax  GRANULARITY 4,
    INDEX idx_status    status            TYPE set(8)  GRANULARITY 4,
    INDEX idx_plan      plan_id           TYPE bloom_filter GRANULARITY 4,
    INDEX idx_unit      assigned_unit_id  TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY _id
`

const ddlTaskingOrder = `
CREATE TABLE IF NOT EXISTS tasking_order (
    _id              String,
    _version         UInt64,
    _observed_at     DateTime64(3),
    _ingested_at     DateTime64(3),
    _source          LowCardinality(String),
    mission_id       String,
    unit_id          String,
    command_type     LowCardinality(String),
    params           String,
    status           LowCardinality(String),
    issued_by        String,
    issued_at        DateTime64(3),
    acknowledged_at  Nullable(DateTime64(3)),
    result           Nullable(String),
    INDEX idx_issued    issued_at     TYPE minmax  GRANULARITY 4,
    INDEX idx_status    status        TYPE set(8)  GRANULARITY 4,
    INDEX idx_mission   mission_id    TYPE bloom_filter GRANULARITY 4,
    INDEX idx_unit      unit_id       TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY _id
`

// ----------------------------------------------------------------------------
// DDL — Link tables (M:M).
// ----------------------------------------------------------------------------

const ddlLinkEntityObservedByUnit = `
CREATE TABLE IF NOT EXISTS link_entity_observed_by_unit (
    _from_id            String,
    _to_id              String,
    _version            UInt64,
    _first_seen_at      DateTime64(3),
    _last_seen_at       DateTime64(3),
    _observation_count  UInt64,
    _ingested_at        DateTime64(3),
    INDEX idx_from  _from_id  TYPE bloom_filter GRANULARITY 4,
    INDEX idx_to    _to_id    TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY (_from_id, _to_id)
`

const ddlLinkReportReferencesEntity = `
CREATE TABLE IF NOT EXISTS link_report_references_entity (
    _from_id     String,
    _to_id       String,
    _version     UInt64,
    _confidence  Float32,
    _ingested_at DateTime64(3),
    INDEX idx_from  _from_id  TYPE bloom_filter GRANULARITY 4,
    INDEX idx_to    _to_id    TYPE bloom_filter GRANULARITY 4
) ENGINE = ReplacingMergeTree(_version)
ORDER BY (_from_id, _to_id)
`
