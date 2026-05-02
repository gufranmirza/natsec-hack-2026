package ontology

import "time"

// LinkType identifies a Link Type by its canonical snake_case verb name.
type LinkType string

const (
	LinkEntityObservedByUnitT  LinkType = "entity_observed_by_unit"
	LinkReportReferencesEntityT LinkType = "report_references_entity"
)

// LinkEntityObservedByUnit records that a Unit has observed an Entity.
// Many-to-many; one row per (entity, unit) pair, deduped on the natural key.
type LinkEntityObservedByUnit struct {
	FromID            string    `ch:"_from_id"           json:"_from_id"`            // Entity._id
	ToID              string    `ch:"_to_id"             json:"_to_id"`              // Unit._id
	Version           uint64    `ch:"_version"           json:"_version"`
	FirstSeenAt       time.Time `ch:"_first_seen_at"     json:"_first_seen_at"`
	LastSeenAt        time.Time `ch:"_last_seen_at"      json:"_last_seen_at"`
	ObservationCount  uint64    `ch:"_observation_count" json:"_observation_count"`
	IngestedAt        time.Time `ch:"_ingested_at"       json:"_ingested_at"`
}

// LinkReportReferencesEntity records that a Report mentions an Entity.
type LinkReportReferencesEntity struct {
	FromID     string    `ch:"_from_id"    json:"_from_id"` // Report._id
	ToID       string    `ch:"_to_id"      json:"_to_id"`   // Entity._id
	Version    uint64    `ch:"_version"    json:"_version"`
	Confidence float32   `ch:"_confidence" json:"_confidence"`
	IngestedAt time.Time `ch:"_ingested_at" json:"_ingested_at"`
}
