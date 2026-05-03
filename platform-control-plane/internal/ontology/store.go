package ontology

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"go.uber.org/zap"
)

// ErrNotFound is returned by Get* when the requested Object id has no row.
var ErrNotFound = errors.New("ontology: not found")

// Store is the typed CRUD layer over ClickHouse for all 9 Object Types.
// All writes go through Upsert*; reads always project the latest version
// per `_id` via the `FINAL` modifier.
type Store struct {
	pool driver.Conn
	log  *zap.Logger
}

// New creates a Store backed by the given ClickHouse connection.
func New(pool driver.Conn, log *zap.Logger) *Store {
	return &Store{pool: pool, log: log}
}

// ----------------------------------------------------------------------------
// Helpers.
// ----------------------------------------------------------------------------

// positionsToTuples flattens a slice of Position into a slice of `[]any{lat, lon}`
// suitable for clickhouse-go's Array(Tuple(Float64, Float64)) batch append.
func positionsToTuples(ps []Position) [][]any {
	out := make([][]any, len(ps))
	for i, p := range ps {
		out[i] = []any{p.Lat, p.Lon}
	}
	return out
}

// tuplesToPositions reverses positionsToTuples for SELECT results.
func tuplesToPositions(raw [][]any) []Position {
	out := make([]Position, 0, len(raw))
	for _, t := range raw {
		if len(t) < 2 {
			continue
		}
		lat, _ := t[0].(float64)
		lon, _ := t[1].(float64)
		out = append(out, Position{Lat: lat, Lon: lon})
	}
	return out
}

// notFound translates clickhouse-go's row-not-found error into ErrNotFound.
func notFound(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// ----------------------------------------------------------------------------
// Entity.
// ----------------------------------------------------------------------------

const entityCols = `_id, _version, _observed_at, _ingested_at, _source, _source_ref, _subtype,
		name, lat, lon, altitude_m, heading_deg, speed_mps, course_deg,
		confidence, threat_level, affiliation, attributes`

// GetEntity returns the latest Entity by id, or ErrNotFound.
func (s *Store) GetEntity(ctx context.Context, id string) (*Entity, error) {
	var e Entity
	row := s.pool.QueryRow(ctx,
		"SELECT "+entityCols+" FROM entity FINAL WHERE _id = ?", id)
	if err := row.ScanStruct(&e); err != nil {
		return nil, notFound(fmt.Errorf("scan entity: %w", err))
	}
	return &e, nil
}

// UpsertEntity validates and writes an Entity. The envelope is stamped if
// not pre-populated.
func (s *Store) UpsertEntity(ctx context.Context, e *Entity) error {
	e.stamp(time.Now().UTC())
	if err := ValidateEntity(e); err != nil {
		return err
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO entity ("+entityCols+")")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	if err := batch.Append(
		e.ID, e.Version, e.ObservedAt, e.IngestedAt, e.Source, e.SourceRef, e.Subtype,
		e.Name, e.Lat, e.Lon, e.AltitudeM, e.HeadingDeg, e.SpeedMps, e.CourseDeg,
		e.Confidence, e.ThreatLevel, e.Affiliation, e.Attributes,
	); err != nil {
		_ = batch.Abort()
		return fmt.Errorf("append entity: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send entity: %w", err)
	}
	return nil
}

// ----------------------------------------------------------------------------
// Event.
// ----------------------------------------------------------------------------

const eventCols = `_id, _version, _observed_at, _ingested_at, _source, _source_ref, _subtype,
		entity_id, unit_id, lat, lon, severity, description, payload`

func (s *Store) GetEvent(ctx context.Context, id string) (*Event, error) {
	var e Event
	row := s.pool.QueryRow(ctx,
		"SELECT "+eventCols+" FROM event FINAL WHERE _id = ?", id)
	if err := row.ScanStruct(&e); err != nil {
		return nil, notFound(fmt.Errorf("scan event: %w", err))
	}
	return &e, nil
}

func (s *Store) UpsertEvent(ctx context.Context, e *Event) error {
	e.stamp(time.Now().UTC())
	if err := ValidateEvent(e); err != nil {
		return err
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO event ("+eventCols+")")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	if err := batch.Append(
		e.ID, e.Version, e.ObservedAt, e.IngestedAt, e.Source, e.SourceRef, e.Subtype,
		e.EntityID, e.UnitID, e.Lat, e.Lon, e.Severity, e.Description, e.Payload,
	); err != nil {
		_ = batch.Abort()
		return fmt.Errorf("append event: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send event: %w", err)
	}
	return nil
}

// ----------------------------------------------------------------------------
// Report.
// ----------------------------------------------------------------------------

const reportCols = `_id, _version, _observed_at, _ingested_at, _source, _source_ref, _subtype,
		author, channel, text, text_embedding, entity_refs, classification`

func (s *Store) GetReport(ctx context.Context, id string) (*Report, error) {
	var r Report
	row := s.pool.QueryRow(ctx,
		"SELECT "+reportCols+" FROM report FINAL WHERE _id = ?", id)
	if err := row.ScanStruct(&r); err != nil {
		return nil, notFound(fmt.Errorf("scan report: %w", err))
	}
	return &r, nil
}

func (s *Store) UpsertReport(ctx context.Context, r *Report) error {
	r.stamp(time.Now().UTC())
	if err := ValidateReport(r); err != nil {
		return err
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO report ("+reportCols+")")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	emb := r.TextEmbedding
	if emb == nil {
		emb = []float32{}
	}
	refs := r.EntityRefs
	if refs == nil {
		refs = []string{}
	}
	if err := batch.Append(
		r.ID, r.Version, r.ObservedAt, r.IngestedAt, r.Source, r.SourceRef, r.Subtype,
		r.Author, r.Channel, r.Text, emb, refs, r.Classification,
	); err != nil {
		_ = batch.Abort()
		return fmt.Errorf("append report: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send report: %w", err)
	}
	return nil
}

// ----------------------------------------------------------------------------
// Unit.
// ----------------------------------------------------------------------------

const unitCols = `_id, _version, _observed_at, _ingested_at, _source, _source_ref, _subtype,
		callsign, lat, lon, altitude_m, heading_deg, speed_mps, status,
		battery_pct, fuel_pct, capabilities`

func (s *Store) GetUnit(ctx context.Context, id string) (*Unit, error) {
	var u Unit
	row := s.pool.QueryRow(ctx,
		"SELECT "+unitCols+" FROM unit FINAL WHERE _id = ?", id)
	if err := row.ScanStruct(&u); err != nil {
		return nil, notFound(fmt.Errorf("scan unit: %w", err))
	}
	return &u, nil
}

func (s *Store) UpsertUnit(ctx context.Context, u *Unit) error {
	u.stamp(time.Now().UTC())
	if err := ValidateUnit(u); err != nil {
		return err
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO unit ("+unitCols+")")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	caps := u.Capabilities
	if caps == nil {
		caps = []string{}
	}
	if err := batch.Append(
		u.ID, u.Version, u.ObservedAt, u.IngestedAt, u.Source, u.SourceRef, u.Subtype,
		u.Callsign, u.Lat, u.Lon, u.AltitudeM, u.HeadingDeg, u.SpeedMps, u.Status,
		u.BatteryPct, u.FuelPct, caps,
	); err != nil {
		_ = batch.Abort()
		return fmt.Errorf("append unit: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send unit: %w", err)
	}
	return nil
}

// ----------------------------------------------------------------------------
// Recommendation.
// ----------------------------------------------------------------------------

const recommendationCols = `_id, _version, _observed_at, _ingested_at, _source,
		subject_entity_id, subject_event_id, objective_id,
		proposed_action_type, proposed_params, rationale, confidence, evidence_refs,
		status, decided_by, decided_at`

func (s *Store) GetRecommendation(ctx context.Context, id string) (*Recommendation, error) {
	var r Recommendation
	row := s.pool.QueryRow(ctx,
		"SELECT "+recommendationCols+" FROM recommendation FINAL WHERE _id = ?", id)
	if err := row.ScanStruct(&r); err != nil {
		return nil, notFound(fmt.Errorf("scan recommendation: %w", err))
	}
	return &r, nil
}

func (s *Store) UpsertRecommendation(ctx context.Context, r *Recommendation) error {
	r.stamp(time.Now().UTC())
	if err := ValidateRecommendation(r); err != nil {
		return err
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO recommendation ("+recommendationCols+")")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	refs := r.EvidenceRefs
	if refs == nil {
		refs = []string{}
	}
	if err := batch.Append(
		r.ID, r.Version, r.ObservedAt, r.IngestedAt, r.Source,
		r.SubjectEntityID, r.SubjectEventID, r.ObjectiveID,
		r.ProposedActionType, r.ProposedParams, r.Rationale, r.Confidence, refs,
		r.Status, r.DecidedBy, r.DecidedAt,
	); err != nil {
		_ = batch.Abort()
		return fmt.Errorf("append recommendation: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send recommendation: %w", err)
	}
	return nil
}

// ----------------------------------------------------------------------------
// MissionObjective.
// ----------------------------------------------------------------------------

const missionObjectiveCols = `_id, _version, _observed_at, _ingested_at, _source,
		title, description, priority, target_entity_id, target_area, deadline, status`

func (s *Store) GetMissionObjective(ctx context.Context, id string) (*MissionObjective, error) {
	var (
		o      MissionObjective
		areaRaw [][]any
	)
	row := s.pool.QueryRow(ctx,
		"SELECT "+missionObjectiveCols+" FROM mission_objective FINAL WHERE _id = ?", id)
	if err := row.Scan(
		&o.ID, &o.Version, &o.ObservedAt, &o.IngestedAt, &o.Source,
		&o.Title, &o.Description, &o.Priority, &o.TargetEntityID, &areaRaw, &o.Deadline, &o.Status,
	); err != nil {
		return nil, notFound(fmt.Errorf("scan mission_objective: %w", err))
	}
	if len(areaRaw) > 0 {
		o.TargetArea = Polygon(tuplesToPositions(areaRaw))
	}
	return &o, nil
}

func (s *Store) UpsertMissionObjective(ctx context.Context, o *MissionObjective) error {
	o.stamp(time.Now().UTC())
	if err := ValidateMissionObjective(o); err != nil {
		return err
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO mission_objective ("+missionObjectiveCols+")")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	area := positionsToTuples([]Position(o.TargetArea))
	if err := batch.Append(
		o.ID, o.Version, o.ObservedAt, o.IngestedAt, o.Source,
		o.Title, o.Description, o.Priority, o.TargetEntityID, area, o.Deadline, o.Status,
	); err != nil {
		_ = batch.Abort()
		return fmt.Errorf("append mission_objective: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send mission_objective: %w", err)
	}
	return nil
}

// ----------------------------------------------------------------------------
// Plan.
// ----------------------------------------------------------------------------

const planCols = `_id, _version, _observed_at, _ingested_at, _source,
		objective_id, title, summary, status, confidence, evidence_refs, approved_by, approved_at`

func (s *Store) GetPlan(ctx context.Context, id string) (*Plan, error) {
	var p Plan
	row := s.pool.QueryRow(ctx,
		"SELECT "+planCols+" FROM plan FINAL WHERE _id = ?", id)
	if err := row.ScanStruct(&p); err != nil {
		return nil, notFound(fmt.Errorf("scan plan: %w", err))
	}
	return &p, nil
}

func (s *Store) UpsertPlan(ctx context.Context, p *Plan) error {
	p.stamp(time.Now().UTC())
	if err := ValidatePlan(p); err != nil {
		return err
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO plan ("+planCols+")")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	refs := p.EvidenceRefs
	if refs == nil {
		refs = []string{}
	}
	if err := batch.Append(
		p.ID, p.Version, p.ObservedAt, p.IngestedAt, p.Source,
		p.ObjectiveID, p.Title, p.Summary, p.Status, p.Confidence, refs, p.ApprovedBy, p.ApprovedAt,
	); err != nil {
		_ = batch.Abort()
		return fmt.Errorf("append plan: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send plan: %w", err)
	}
	return nil
}

// ----------------------------------------------------------------------------
// Mission.
// ----------------------------------------------------------------------------

const missionCols = `_id, _version, _observed_at, _ingested_at, _source,
		plan_id, assigned_unit_id, target_entity_id, intent, waypoints, status, started_at, completed_at`

func (s *Store) GetMission(ctx context.Context, id string) (*Mission, error) {
	var (
		m       Mission
		wpsRaw  [][]any
	)
	row := s.pool.QueryRow(ctx,
		"SELECT "+missionCols+" FROM mission FINAL WHERE _id = ?", id)
	if err := row.Scan(
		&m.ID, &m.Version, &m.ObservedAt, &m.IngestedAt, &m.Source,
		&m.PlanID, &m.AssignedUnitID, &m.TargetEntityID, &m.Intent, &wpsRaw, &m.Status, &m.StartedAt, &m.CompletedAt,
	); err != nil {
		return nil, notFound(fmt.Errorf("scan mission: %w", err))
	}
	if len(wpsRaw) > 0 {
		m.Waypoints = Waypoints(tuplesToPositions(wpsRaw))
	}
	return &m, nil
}

func (s *Store) UpsertMission(ctx context.Context, m *Mission) error {
	m.stamp(time.Now().UTC())
	if err := ValidateMission(m); err != nil {
		return err
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO mission ("+missionCols+")")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	wps := positionsToTuples([]Position(m.Waypoints))
	if err := batch.Append(
		m.ID, m.Version, m.ObservedAt, m.IngestedAt, m.Source,
		m.PlanID, m.AssignedUnitID, m.TargetEntityID, m.Intent, wps, m.Status, m.StartedAt, m.CompletedAt,
	); err != nil {
		_ = batch.Abort()
		return fmt.Errorf("append mission: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send mission: %w", err)
	}
	return nil
}

// ----------------------------------------------------------------------------
// TaskingOrder.
// ----------------------------------------------------------------------------

const taskingOrderCols = `_id, _version, _observed_at, _ingested_at, _source,
		mission_id, unit_id, command_type, params, status, issued_by, issued_at, acknowledged_at, result`

func (s *Store) GetTaskingOrder(ctx context.Context, id string) (*TaskingOrder, error) {
	var t TaskingOrder
	row := s.pool.QueryRow(ctx,
		"SELECT "+taskingOrderCols+" FROM tasking_order FINAL WHERE _id = ?", id)
	if err := row.ScanStruct(&t); err != nil {
		return nil, notFound(fmt.Errorf("scan tasking_order: %w", err))
	}
	return &t, nil
}

func (s *Store) UpsertTaskingOrder(ctx context.Context, t *TaskingOrder) error {
	t.stamp(time.Now().UTC())
	if err := ValidateTaskingOrder(t); err != nil {
		return err
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO tasking_order ("+taskingOrderCols+")")
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}
	if err := batch.Append(
		t.ID, t.Version, t.ObservedAt, t.IngestedAt, t.Source,
		t.MissionID, t.UnitID, t.CommandType, t.Params, t.Status, t.IssuedBy, t.IssuedAt, t.AcknowledgedAt, t.Result,
	); err != nil {
		_ = batch.Abort()
		return fmt.Errorf("append tasking_order: %w", err)
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send tasking_order: %w", err)
	}
	return nil
}
