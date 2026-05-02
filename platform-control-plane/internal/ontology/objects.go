package ontology

import "time"

// ----------------------------------------------------------------------------
// Entity — anything on the map.
// ----------------------------------------------------------------------------

// Entity subtypes.
const (
	EntitySubtypeVessel   = "Vessel"
	EntitySubtypeAircraft = "Aircraft"
	EntitySubtypeVehicle  = "Vehicle"
	EntitySubtypePerson   = "Person"
	EntitySubtypeThreat   = "Threat"
	EntitySubtypeUnknown  = "Unknown"
)

// EntityThreatLevel values.
const (
	ThreatLevelNone = "none"
	ThreatLevelLow  = "low"
	ThreatLevelMed  = "med"
	ThreatLevelHigh = "high"
)

// Entity is anything observable on the map. One table, discriminated by
// Subtype.
type Entity struct {
	Envelope
	Subtype     string  `ch:"_subtype"     json:"_subtype"`
	SourceRef   *string `ch:"_source_ref"  json:"_source_ref,omitempty"`
	Name        *string `ch:"name"         json:"name,omitempty"`
	Lat         float64 `ch:"lat"          json:"lat"`
	Lon         float64 `ch:"lon"          json:"lon"`
	AltitudeM   *float64 `ch:"altitude_m"  json:"altitude_m,omitempty"`
	HeadingDeg  *float64 `ch:"heading_deg" json:"heading_deg,omitempty"`
	SpeedMps    *float64 `ch:"speed_mps"   json:"speed_mps,omitempty"`
	CourseDeg   *float64 `ch:"course_deg"  json:"course_deg,omitempty"`
	Confidence  float32 `ch:"confidence"   json:"confidence"`
	ThreatLevel string  `ch:"threat_level" json:"threat_level"`
	Attributes  map[string]string `ch:"attributes" json:"attributes,omitempty"`
}

// Position returns the lat/lon as a Position value.
func (e *Entity) Position() Position { return Position{Lat: e.Lat, Lon: e.Lon} }

// SetPosition sets the entity's lat/lon from a Position value.
func (e *Entity) SetPosition(p Position) { e.Lat, e.Lon = p.Lat, p.Lon }

// ----------------------------------------------------------------------------
// Event — discrete occurrences.
// ----------------------------------------------------------------------------

// Event subtypes.
const (
	EventSubtypeDetection  = "detection"
	EventSubtypeDeviation  = "deviation"
	EventSubtypeRFPing     = "rf_ping"
	EventSubtypeAISGap     = "ais_gap"
	EventSubtypeAnomaly    = "anomaly"
	EventSubtypeReportLink = "report_link"
)

// Severity values.
const (
	SeverityInfo     = "info"
	SeverityWarn     = "warn"
	SeverityCritical = "critical"
)

// Event is a discrete occurrence — detection, deviation, RF ping, etc.
type Event struct {
	Envelope
	Subtype     string   `ch:"_subtype"     json:"_subtype"`
	SourceRef   *string  `ch:"_source_ref"  json:"_source_ref,omitempty"`
	EntityID    *string  `ch:"entity_id"    json:"entity_id,omitempty"`
	UnitID      *string  `ch:"unit_id"      json:"unit_id,omitempty"`
	Lat         *float64 `ch:"lat"          json:"lat,omitempty"`
	Lon         *float64 `ch:"lon"          json:"lon,omitempty"`
	Severity    string   `ch:"severity"     json:"severity"`
	Description string   `ch:"description"  json:"description"`
	Payload     string   `ch:"payload"      json:"payload"`
}

// ----------------------------------------------------------------------------
// Report — textual report.
// ----------------------------------------------------------------------------

// Report subtypes.
const (
	ReportSubtypeOperator = "operator"
	ReportSubtypeRadio    = "radio"
	ReportSubtypeSigint   = "sigint"
	ReportSubtypeOSINT    = "osint"
	ReportSubtypeUnknown  = "unknown"
)

// Classification values.
const (
	ClassificationUnclass      = "unclass"
	ClassificationCUI          = "cui"
	ClassificationConfidential = "confidential"
)

// EmbeddingDim is the locked vector dimension. Matches Voyage voyage-3.
const EmbeddingDim = 1024

// Report is a textual report — operator narrative, radio chatter, intel.
type Report struct {
	Envelope
	Subtype        string    `ch:"_subtype"        json:"_subtype"`
	SourceRef      *string   `ch:"_source_ref"     json:"_source_ref,omitempty"`
	Author         *string   `ch:"author"          json:"author,omitempty"`
	Channel        *string   `ch:"channel"         json:"channel,omitempty"`
	Text           string    `ch:"text"            json:"text"`
	TextEmbedding  []float32 `ch:"text_embedding"  json:"-"`
	EntityRefs     []string  `ch:"entity_refs"     json:"entity_refs,omitempty"`
	Classification string    `ch:"classification"  json:"classification"`
}

// ----------------------------------------------------------------------------
// Unit — friendly asset.
// ----------------------------------------------------------------------------

// Unit subtypes.
const (
	UnitSubtypeDrone       = "drone"
	UnitSubtypeVehicle     = "vehicle"
	UnitSubtypeInfantry    = "infantry"
	UnitSubtypeBoat        = "boat"
	UnitSubtypeCommandPost = "command_post"
)

// Unit status values.
const (
	UnitStatusIdle      = "idle"
	UnitStatusEnRoute   = "en_route"
	UnitStatusOnStation = "on_station"
	UnitStatusReturning = "returning"
	UnitStatusOffline   = "offline"
)

// Unit is a friendly asset under our control or coordination.
type Unit struct {
	Envelope
	Subtype      string   `ch:"_subtype"     json:"_subtype"`
	SourceRef    *string  `ch:"_source_ref"  json:"_source_ref,omitempty"`
	Callsign     string   `ch:"callsign"     json:"callsign"`
	Lat          float64  `ch:"lat"          json:"lat"`
	Lon          float64  `ch:"lon"          json:"lon"`
	AltitudeM    *float64 `ch:"altitude_m"   json:"altitude_m,omitempty"`
	HeadingDeg   *float64 `ch:"heading_deg"  json:"heading_deg,omitempty"`
	SpeedMps     *float64 `ch:"speed_mps"    json:"speed_mps,omitempty"`
	Status       string   `ch:"status"       json:"status"`
	BatteryPct   *float32 `ch:"battery_pct"  json:"battery_pct,omitempty"`
	FuelPct      *float32 `ch:"fuel_pct"     json:"fuel_pct,omitempty"`
	Capabilities []string `ch:"capabilities" json:"capabilities,omitempty"`
}

// Position returns the unit's lat/lon as a Position value.
func (u *Unit) Position() Position { return Position{Lat: u.Lat, Lon: u.Lon} }

// SetPosition sets the unit's lat/lon from a Position value.
func (u *Unit) SetPosition(p Position) { u.Lat, u.Lon = p.Lat, p.Lon }

// ----------------------------------------------------------------------------
// Recommendation — AI-generated proposal.
// ----------------------------------------------------------------------------

// Recommendation status values.
const (
	RecStatusPending  = "pending"
	RecStatusAccepted = "accepted"
	RecStatusRejected = "rejected"
	RecStatusExpired  = "expired"
)

// Recommendation is an AI-generated proposal that always cites Objects.
type Recommendation struct {
	Envelope
	SubjectEntityID    *string    `ch:"subject_entity_id"    json:"subject_entity_id,omitempty"`
	SubjectEventID     *string    `ch:"subject_event_id"     json:"subject_event_id,omitempty"`
	ObjectiveID        *string    `ch:"objective_id"         json:"objective_id,omitempty"`
	ProposedActionType string     `ch:"proposed_action_type" json:"proposed_action_type"`
	ProposedParams     string     `ch:"proposed_params"      json:"proposed_params"`
	Rationale          string     `ch:"rationale"            json:"rationale"`
	Confidence         float32    `ch:"confidence"           json:"confidence"`
	EvidenceRefs       []string   `ch:"evidence_refs"        json:"evidence_refs"`
	Status             string     `ch:"status"               json:"status"`
	DecidedBy          *string    `ch:"decided_by"           json:"decided_by,omitempty"`
	DecidedAt          *time.Time `ch:"decided_at"           json:"decided_at,omitempty"`
}

// ----------------------------------------------------------------------------
// MissionObjective — what the commander cares about.
// ----------------------------------------------------------------------------

// MissionObjective priority values.
const (
	PriorityP0 = "P0"
	PriorityP1 = "P1"
	PriorityP2 = "P2"
)

// MissionObjective status values.
const (
	ObjStatusOpen      = "open"
	ObjStatusActive    = "active"
	ObjStatusCompleted = "completed"
	ObjStatusCancelled = "cancelled"
)

// MissionObjective expresses operator intent.
type MissionObjective struct {
	Envelope
	Title          string     `ch:"title"            json:"title"`
	Description    string     `ch:"description"      json:"description"`
	Priority       string     `ch:"priority"         json:"priority"`
	TargetEntityID *string    `ch:"target_entity_id" json:"target_entity_id,omitempty"`
	TargetArea     Polygon    `ch:"target_area"      json:"target_area,omitempty"`
	Deadline       *time.Time `ch:"deadline"         json:"deadline,omitempty"`
	Status         string     `ch:"status"           json:"status"`
}

// ----------------------------------------------------------------------------
// Plan — commander-level intent realization.
// ----------------------------------------------------------------------------

// Plan status values.
const (
	PlanStatusDraft      = "draft"
	PlanStatusApproved   = "approved"
	PlanStatusExecuting  = "executing"
	PlanStatusCompleted  = "completed"
	PlanStatusAborted    = "aborted"
	PlanStatusSuperseded = "superseded"
)

// Plan is a coordinated sequence of Missions in service of an objective.
type Plan struct {
	Envelope
	ObjectiveID  *string    `ch:"objective_id"  json:"objective_id,omitempty"`
	Title        string     `ch:"title"         json:"title"`
	Summary      string     `ch:"summary"       json:"summary"`
	Status       string     `ch:"status"        json:"status"`
	Confidence   float32    `ch:"confidence"    json:"confidence"`
	EvidenceRefs []string   `ch:"evidence_refs" json:"evidence_refs"`
	ApprovedBy   *string    `ch:"approved_by"   json:"approved_by,omitempty"`
	ApprovedAt   *time.Time `ch:"approved_at"   json:"approved_at,omitempty"`
}

// ----------------------------------------------------------------------------
// Mission — one Unit's part of a Plan.
// ----------------------------------------------------------------------------

// Mission status values.
const (
	MissionStatusQueued    = "queued"
	MissionStatusEnRoute   = "en_route"
	MissionStatusExecuting = "executing"
	MissionStatusCompleted = "completed"
	MissionStatusFailed    = "failed"
	MissionStatusAborted   = "aborted"
)

// Mission is what one specific Unit does.
type Mission struct {
	Envelope
	PlanID          string     `ch:"plan_id"           json:"plan_id"`
	AssignedUnitID  string     `ch:"assigned_unit_id"  json:"assigned_unit_id"`
	TargetEntityID  *string    `ch:"target_entity_id"  json:"target_entity_id,omitempty"`
	Intent          string     `ch:"intent"            json:"intent"`
	Waypoints       Waypoints  `ch:"waypoints"         json:"waypoints,omitempty"`
	Status          string     `ch:"status"            json:"status"`
	StartedAt       *time.Time `ch:"started_at"        json:"started_at,omitempty"`
	CompletedAt     *time.Time `ch:"completed_at"      json:"completed_at,omitempty"`
}

// ----------------------------------------------------------------------------
// TaskingOrder — atomic command sent to a Unit.
// ----------------------------------------------------------------------------

// TaskingOrder command types. Mirror MAV_CMD families loosely.
const (
	CommandGoto         = "goto"
	CommandHover        = "hover"
	CommandReturnToBase = "return_to_base"
	CommandObserve      = "observe"
	CommandLoiter       = "loiter"
	CommandAbort        = "abort"
)

// TaskingOrder status values.
const (
	OrderStatusPending      = "pending"
	OrderStatusSent          = "sent"
	OrderStatusAcknowledged = "acknowledged"
	OrderStatusExecuting    = "executing"
	OrderStatusCompleted    = "completed"
	OrderStatusFailed       = "failed"
)

// TaskingOrder is the atomic command sent to a Unit.
type TaskingOrder struct {
	Envelope
	MissionID      string     `ch:"mission_id"      json:"mission_id"`
	UnitID         string     `ch:"unit_id"         json:"unit_id"`
	CommandType    string     `ch:"command_type"    json:"command_type"`
	Params         string     `ch:"params"          json:"params"`
	Status         string     `ch:"status"          json:"status"`
	IssuedBy       string     `ch:"issued_by"       json:"issued_by"`
	IssuedAt       time.Time  `ch:"issued_at"       json:"issued_at"`
	AcknowledgedAt *time.Time `ch:"acknowledged_at" json:"acknowledged_at,omitempty"`
	Result         *string    `ch:"result"          json:"result,omitempty"`
}
