package ontology

import (
	"errors"
	"fmt"
	"slices"
	"strings"
)

// ValidationError carries a list of invariant violations.
type ValidationError struct {
	Type ObjectType
	ID   string
	Errs []error
}

func (e *ValidationError) Error() string {
	parts := make([]string, 0, len(e.Errs))
	for _, err := range e.Errs {
		parts = append(parts, err.Error())
	}
	return fmt.Sprintf("ontology: %s %q invalid: %s", e.Type, e.ID, strings.Join(parts, "; "))
}

func (e *ValidationError) Unwrap() []error { return e.Errs }

// Allowed value sets.
var (
	entitySubtypes      = []string{EntitySubtypeVessel, EntitySubtypeAircraft, EntitySubtypeVehicle, EntitySubtypePerson, EntitySubtypeThreat, EntitySubtypeUnknown}
	threatLevels        = []string{ThreatLevelNone, ThreatLevelLow, ThreatLevelMed, ThreatLevelHigh}
	// affiliations: empty string is also accepted on validate (legacy rows
	// pre-affiliation-column have it empty; reads project empty → "unknown"
	// at the UI layer).
	affiliations = []string{AffiliationFriendly, AffiliationHostile, AffiliationUnknown, AffiliationNeutral, ""}
	// eventSubtypes — keep in lockstep with the const block in objects.go.
	// Extended per UI ADR 0002 §12 to cover realistic warfare event taxonomy.
	eventSubtypes = []string{
		// legacy / generic
		EventSubtypeDetection, EventSubtypeDeviation, EventSubtypeRFPing,
		EventSubtypeAISGap, EventSubtypeAnomaly, EventSubtypeReportLink,
		// ISR
		EventSubtypeVisualDetection, EventSubtypeCuedSearch,
		EventSubtypeTrackAcquired, EventSubtypeTrackLost, EventSubtypeRegainedTrack,
		EventSubtypeClassificationUpgrade, EventSubtypeThermalSignature,
		// C2 / comms
		EventSubtypeSigintIntercept, EventSubtypeCommsOutage, EventSubtypeJamPulse,
		EventSubtypeGPSDeniedZone, EventSubtypePositionReport,
		// kinetic
		EventSubtypeArtilleryImpact, EventSubtypeMissileLaunch, EventSubtypeAirStrike,
		EventSubtypeFPVStrike, EventSubtypeLoiteringMunitionEngage,
		EventSubtypeSmallArmsContact, EventSubtypeCounterBatteryFire,
		// maneuver
		EventSubtypeGroundAdvance, EventSubtypeWithdrawal, EventSubtypeBreachAttempt,
		EventSubtypeDefensiveConsolidation, EventSubtypeSmokeScreen,
		EventSubtypeTerrainObscuration,
		// logistics & lifecycle
		EventSubtypeCasevacRequest, EventSubtypeMedevacDispatched,
		EventSubtypeUnitDestroyed, EventSubtypeUnitDamaged,
		// OSINT
		EventSubtypeGeotaggedSocialPost,
	}
	severities          = []string{SeverityInfo, SeverityWarn, SeverityCritical}
	reportSubtypes      = []string{ReportSubtypeOperator, ReportSubtypeRadio, ReportSubtypeSigint, ReportSubtypeOSINT, ReportSubtypeUnknown}
	classifications     = []string{ClassificationUnclass, ClassificationCUI, ClassificationConfidential}
	unitSubtypes        = []string{UnitSubtypeDrone, UnitSubtypeVehicle, UnitSubtypeInfantry, UnitSubtypeBoat, UnitSubtypeCommandPost}
	unitStatuses        = []string{UnitStatusIdle, UnitStatusEnRoute, UnitStatusOnStation, UnitStatusReturning, UnitStatusOffline}
	recStatuses         = []string{RecStatusPending, RecStatusAccepted, RecStatusRejected, RecStatusExpired}
	priorities          = []string{PriorityP0, PriorityP1, PriorityP2}
	objStatuses         = []string{ObjStatusOpen, ObjStatusActive, ObjStatusCompleted, ObjStatusCancelled}
	planStatuses        = []string{PlanStatusDraft, PlanStatusApproved, PlanStatusExecuting, PlanStatusCompleted, PlanStatusAborted, PlanStatusSuperseded}
	missionStatuses     = []string{MissionStatusQueued, MissionStatusEnRoute, MissionStatusExecuting, MissionStatusCompleted, MissionStatusFailed, MissionStatusAborted}
	commandTypes        = []string{CommandGoto, CommandHover, CommandReturnToBase, CommandObserve, CommandLoiter, CommandAbort}
	taskingOrderStatuses = []string{OrderStatusPending, OrderStatusSent, OrderStatusAcknowledged, OrderStatusExecuting, OrderStatusCompleted, OrderStatusFailed}
)

// validateEnvelope checks invariants V-1, V-2 (id/observed_at non-empty, version
// derives from observed_at).
func validateEnvelope(env Envelope) []error {
	var errs []error
	if env.ID == "" {
		errs = append(errs, errors.New("_id is empty"))
	}
	if env.ObservedAt.IsZero() {
		errs = append(errs, errors.New("_observed_at is zero"))
	}
	if env.Version == 0 {
		errs = append(errs, errors.New("_version is zero"))
	}
	if env.Source == "" {
		errs = append(errs, errors.New("_source is empty"))
	}
	return errs
}

func mustBeOneOf(label, value string, allowed []string) error {
	if !slices.Contains(allowed, value) {
		return fmt.Errorf("%s %q is not one of %v", label, value, allowed)
	}
	return nil
}

func confidenceValid(c float32) error {
	if c < 0 || c > 1 {
		return fmt.Errorf("confidence %v out of [0,1]", c)
	}
	return nil
}

func positionValid(lat, lon float64) error {
	if lat < -90 || lat > 90 {
		return fmt.Errorf("lat %v out of [-90,90]", lat)
	}
	if lon < -180 || lon > 180 {
		return fmt.Errorf("lon %v out of [-180,180]", lon)
	}
	return nil
}

// Validate runs all V-* invariants for an Entity.
func ValidateEntity(e *Entity) error {
	errs := validateEnvelope(e.Envelope)
	if err := mustBeOneOf("_subtype", e.Subtype, entitySubtypes); err != nil {
		errs = append(errs, err)
	}
	if err := mustBeOneOf("threat_level", e.ThreatLevel, threatLevels); err != nil {
		errs = append(errs, err)
	}
	if err := mustBeOneOf("affiliation", e.Affiliation, affiliations); err != nil {
		errs = append(errs, err)
	}
	if err := positionValid(e.Lat, e.Lon); err != nil {
		errs = append(errs, err)
	}
	if err := confidenceValid(e.Confidence); err != nil {
		errs = append(errs, err)
	}
	return wrap(TypeEntity, e.ID, errs)
}

// ValidateEvent runs all V-* invariants for an Event.
func ValidateEvent(e *Event) error {
	errs := validateEnvelope(e.Envelope)
	if err := mustBeOneOf("_subtype", e.Subtype, eventSubtypes); err != nil {
		errs = append(errs, err)
	}
	if err := mustBeOneOf("severity", e.Severity, severities); err != nil {
		errs = append(errs, err)
	}
	if e.Lat != nil && e.Lon != nil {
		if err := positionValid(*e.Lat, *e.Lon); err != nil {
			errs = append(errs, err)
		}
	}
	return wrap(TypeEvent, e.ID, errs)
}

// ValidateReport runs all V-* invariants for a Report.
func ValidateReport(r *Report) error {
	errs := validateEnvelope(r.Envelope)
	if err := mustBeOneOf("_subtype", r.Subtype, reportSubtypes); err != nil {
		errs = append(errs, err)
	}
	if err := mustBeOneOf("classification", r.Classification, classifications); err != nil {
		errs = append(errs, err)
	}
	if r.Text == "" {
		errs = append(errs, errors.New("text is empty"))
	}
	if len(r.TextEmbedding) != 0 && len(r.TextEmbedding) != EmbeddingDim {
		errs = append(errs, fmt.Errorf("text_embedding length %d != %d", len(r.TextEmbedding), EmbeddingDim))
	}
	return wrap(TypeReport, r.ID, errs)
}

// ValidateUnit runs all V-* invariants for a Unit.
func ValidateUnit(u *Unit) error {
	errs := validateEnvelope(u.Envelope)
	if err := mustBeOneOf("_subtype", u.Subtype, unitSubtypes); err != nil {
		errs = append(errs, err)
	}
	if err := mustBeOneOf("status", u.Status, unitStatuses); err != nil {
		errs = append(errs, err)
	}
	if err := positionValid(u.Lat, u.Lon); err != nil {
		errs = append(errs, err)
	}
	if u.Callsign == "" {
		errs = append(errs, errors.New("callsign is empty"))
	}
	return wrap(TypeUnit, u.ID, errs)
}

// ValidateRecommendation runs all V-* invariants, including V-8 (evidence_refs
// non-empty) and V-9 (at least one subject FK non-null).
func ValidateRecommendation(r *Recommendation) error {
	errs := validateEnvelope(r.Envelope)
	if err := mustBeOneOf("status", r.Status, recStatuses); err != nil {
		errs = append(errs, err)
	}
	if err := confidenceValid(r.Confidence); err != nil {
		errs = append(errs, err)
	}
	if r.ProposedActionType == "" {
		errs = append(errs, errors.New("proposed_action_type is empty"))
	}
	if len(r.EvidenceRefs) == 0 {
		errs = append(errs, errors.New("evidence_refs is empty (V-8)"))
	}
	if r.SubjectEntityID == nil && r.SubjectEventID == nil && r.ObjectiveID == nil {
		errs = append(errs, errors.New("at least one of subject_entity_id, subject_event_id, objective_id must be non-null (V-9)"))
	}
	return wrap(TypeRecommendation, r.ID, errs)
}

// ValidateMissionObjective runs all V-* invariants for a MissionObjective.
func ValidateMissionObjective(o *MissionObjective) error {
	errs := validateEnvelope(o.Envelope)
	if err := mustBeOneOf("priority", o.Priority, priorities); err != nil {
		errs = append(errs, err)
	}
	if err := mustBeOneOf("status", o.Status, objStatuses); err != nil {
		errs = append(errs, err)
	}
	if o.Title == "" {
		errs = append(errs, errors.New("title is empty"))
	}
	if o.TargetArea != nil && !o.TargetArea.IsClosed() {
		errs = append(errs, errors.New("target_area polygon must be closed (first == last) and have at least 4 points"))
	}
	return wrap(TypeMissionObjective, o.ID, errs)
}

// ValidatePlan runs all V-* invariants, including V-8.
func ValidatePlan(p *Plan) error {
	errs := validateEnvelope(p.Envelope)
	if err := mustBeOneOf("status", p.Status, planStatuses); err != nil {
		errs = append(errs, err)
	}
	if err := confidenceValid(p.Confidence); err != nil {
		errs = append(errs, err)
	}
	if p.Title == "" {
		errs = append(errs, errors.New("title is empty"))
	}
	if len(p.EvidenceRefs) == 0 {
		errs = append(errs, errors.New("evidence_refs is empty (V-8)"))
	}
	return wrap(TypePlan, p.ID, errs)
}

// ValidateMission runs all V-* invariants for a Mission.
func ValidateMission(m *Mission) error {
	errs := validateEnvelope(m.Envelope)
	if err := mustBeOneOf("status", m.Status, missionStatuses); err != nil {
		errs = append(errs, err)
	}
	if m.PlanID == "" {
		errs = append(errs, errors.New("plan_id is empty"))
	}
	if m.AssignedUnitID == "" {
		errs = append(errs, errors.New("assigned_unit_id is empty"))
	}
	for i, w := range m.Waypoints {
		if err := positionValid(w.Lat, w.Lon); err != nil {
			errs = append(errs, fmt.Errorf("waypoint %d: %w", i, err))
		}
	}
	return wrap(TypeMission, m.ID, errs)
}

// ValidateTaskingOrder runs all V-* invariants for a TaskingOrder.
func ValidateTaskingOrder(t *TaskingOrder) error {
	errs := validateEnvelope(t.Envelope)
	if err := mustBeOneOf("command_type", t.CommandType, commandTypes); err != nil {
		errs = append(errs, err)
	}
	if err := mustBeOneOf("status", t.Status, taskingOrderStatuses); err != nil {
		errs = append(errs, err)
	}
	if t.MissionID == "" {
		errs = append(errs, errors.New("mission_id is empty"))
	}
	if t.UnitID == "" {
		errs = append(errs, errors.New("unit_id is empty"))
	}
	if t.IssuedBy == "" {
		errs = append(errs, errors.New("issued_by is empty"))
	}
	return wrap(TypeTaskingOrder, t.ID, errs)
}

func wrap(t ObjectType, id string, errs []error) error {
	if len(errs) == 0 {
		return nil
	}
	return &ValidationError{Type: t, ID: id, Errs: errs}
}
