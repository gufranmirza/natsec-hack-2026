// Package ontology defines the typed Object model — Entities, Events,
// Reports, Units, Recommendations, MissionObjectives, Plans, Missions,
// TaskingOrders — and their persistence layer over ClickHouse.
//
// The contract is: every Object carries a canonical envelope (id, version,
// observed_at, ingested_at, source); the ontology layer is the only writer
// to the typed tables; queries always project the latest version per id.
//
// See docs/0002-ontology-object-specs.md for the full spec.
package ontology

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ObjectType is the canonical PascalCase type name as exposed to the LLM
// and the UI (e.g., `"Entity"`, `"Mission"`). It matches the JSON `_type`
// field on every Object handle.
type ObjectType string

const (
	TypeEntity           ObjectType = "Entity"
	TypeEvent            ObjectType = "Event"
	TypeReport           ObjectType = "Report"
	TypeUnit             ObjectType = "Unit"
	TypeRecommendation   ObjectType = "Recommendation"
	TypeMissionObjective ObjectType = "MissionObjective"
	TypePlan             ObjectType = "Plan"
	TypeMission          ObjectType = "Mission"
	TypeTaskingOrder     ObjectType = "TaskingOrder"
)

// AllObjectTypes is the canonical ordered list. Used by Migrate and by
// downstream services that iterate types.
var AllObjectTypes = []ObjectType{
	TypeEntity,
	TypeEvent,
	TypeReport,
	TypeUnit,
	TypeRecommendation,
	TypeMissionObjective,
	TypePlan,
	TypeMission,
	TypeTaskingOrder,
}

// Source prefixes — see docs/0002 §11.3 actor naming.
const (
	SourceSystemPrefix   = "system:"
	SourceOperatorPrefix = "operator:"
	SourceIngestPrefix   = "ingest:"
	SourceAgentPrefix    = "agent:"
)

// Envelope holds the universal fields every Object Type carries.
type Envelope struct {
	ID         string    `ch:"_id"          json:"_id"`
	Version    uint64    `ch:"_version"     json:"_version"`
	ObservedAt time.Time `ch:"_observed_at" json:"_observed_at"`
	IngestedAt time.Time `ch:"_ingested_at" json:"_ingested_at"`
	Source     string    `ch:"_source"      json:"_source"`
}

// Position is a (lat, lon) pair.
type Position struct {
	Lat float64 `ch:"lat" json:"lat"`
	Lon float64 `ch:"lon" json:"lon"`
}

// Valid reports whether p is within (-90..90, -180..180).
func (p Position) Valid() bool {
	return p.Lat >= -90 && p.Lat <= 90 && p.Lon >= -180 && p.Lon <= 180
}

// BBox is a bounding box. Inclusive on both corners. NOT safe across the
// antimeridian; see docs/0002 §11.2.
type BBox struct {
	MinLat, MinLon float64
	MaxLat, MaxLon float64
}

// Contains reports whether p is inside b (inclusive). Antimeridian-naive.
func (b BBox) Contains(p Position) bool {
	return p.Lat >= b.MinLat && p.Lat <= b.MaxLat &&
		p.Lon >= b.MinLon && p.Lon <= b.MaxLon
}

// Polygon is a closed ring; first point equals last point. CCW for interior.
type Polygon []Position

// IsClosed reports whether the polygon is non-empty and the first point
// equals the last point.
func (p Polygon) IsClosed() bool {
	if len(p) < 4 {
		return false
	}
	return p[0] == p[len(p)-1]
}

// Waypoints is a planned route as an ordered sequence of positions. Open
// (first != last); closure is not required.
type Waypoints []Position

// NewID returns a fresh UUIDv7 string suitable for an Object `_id`.
// UUIDv7 is time-ordered, which keeps CH range scans on `_id` cheap.
func NewID() string {
	id, err := uuid.NewV7()
	if err != nil {
		// uuid.NewV7 only fails if crypto/rand fails, which is unrecoverable.
		panic(fmt.Errorf("ontology: NewID: %w", err))
	}
	return id.String()
}

// VersionFromTime returns the `_version` value for an observation made at t,
// expressed as nanoseconds since the Unix epoch. Used everywhere the writer
// needs to set `_version` from a known `_observed_at`.
func VersionFromTime(t time.Time) uint64 {
	return uint64(t.UnixNano())
}

// NowVersion returns a `_version` for "right now," for cases where the
// caller doesn't have an observation timestamp from a source.
func NowVersion() uint64 {
	return VersionFromTime(time.Now().UTC())
}

// stamp fills the envelope's IngestedAt and Version fields. Call it on the
// write path after the caller has populated ID, ObservedAt, Source.
// If Version is already set, it is left alone (allows ingesters to mint
// versions ahead of write).
func (e *Envelope) stamp(now time.Time) {
	if e.IngestedAt.IsZero() {
		e.IngestedAt = now
	}
	if e.Version == 0 {
		if e.ObservedAt.IsZero() {
			e.ObservedAt = now
		}
		e.Version = VersionFromTime(e.ObservedAt)
	}
}
