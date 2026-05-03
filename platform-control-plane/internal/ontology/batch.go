package ontology

import (
	"context"
	"fmt"
)

// UpsertEntityBatch persists a slice of pre-validated, pre-stamped Entities
// in a single ClickHouse batch. The caller (the ingest layer) is responsible
// for stamping envelopes and running ValidateEntity on each row first.
func (s *Store) UpsertEntityBatch(ctx context.Context, rows []*Entity) error {
	if len(rows) == 0 {
		return nil
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO entity ("+entityCols+")")
	if err != nil {
		return fmt.Errorf("prepare entity batch: %w", err)
	}
	for _, e := range rows {
		if err := batch.Append(
			e.ID, e.Version, e.ObservedAt, e.IngestedAt, e.Source, e.SourceRef, e.Subtype,
			e.Name, e.Lat, e.Lon, e.AltitudeM, e.HeadingDeg, e.SpeedMps, e.CourseDeg,
			e.Confidence, e.ThreatLevel, e.Attributes,
		); err != nil {
			_ = batch.Abort()
			return fmt.Errorf("append entity row %s: %w", e.ID, err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send entity batch: %w", err)
	}
	return nil
}

// UpsertEventBatch persists a slice of pre-validated Events.
func (s *Store) UpsertEventBatch(ctx context.Context, rows []*Event) error {
	if len(rows) == 0 {
		return nil
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO event ("+eventCols+")")
	if err != nil {
		return fmt.Errorf("prepare event batch: %w", err)
	}
	for _, e := range rows {
		if err := batch.Append(
			e.ID, e.Version, e.ObservedAt, e.IngestedAt, e.Source, e.SourceRef, e.Subtype,
			e.EntityID, e.UnitID, e.Lat, e.Lon, e.Severity, e.Description, e.Payload,
		); err != nil {
			_ = batch.Abort()
			return fmt.Errorf("append event row %s: %w", e.ID, err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send event batch: %w", err)
	}
	return nil
}

// UpsertReportBatch persists a slice of pre-validated Reports. Empty
// embeddings are normalized to an empty slice so the CH array column is
// always written.
func (s *Store) UpsertReportBatch(ctx context.Context, rows []*Report) error {
	if len(rows) == 0 {
		return nil
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO report ("+reportCols+")")
	if err != nil {
		return fmt.Errorf("prepare report batch: %w", err)
	}
	for _, r := range rows {
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
			return fmt.Errorf("append report row %s: %w", r.ID, err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send report batch: %w", err)
	}
	return nil
}

// UpsertUnitBatch persists a slice of pre-validated Units.
func (s *Store) UpsertUnitBatch(ctx context.Context, rows []*Unit) error {
	if len(rows) == 0 {
		return nil
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO unit ("+unitCols+")")
	if err != nil {
		return fmt.Errorf("prepare unit batch: %w", err)
	}
	for _, u := range rows {
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
			return fmt.Errorf("append unit row %s: %w", u.ID, err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send unit batch: %w", err)
	}
	return nil
}

// UpsertRecommendationBatch persists a slice of pre-validated Recommendations.
func (s *Store) UpsertRecommendationBatch(ctx context.Context, rows []*Recommendation) error {
	if len(rows) == 0 {
		return nil
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO recommendation ("+recommendationCols+")")
	if err != nil {
		return fmt.Errorf("prepare recommendation batch: %w", err)
	}
	for _, r := range rows {
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
			return fmt.Errorf("append recommendation row %s: %w", r.ID, err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send recommendation batch: %w", err)
	}
	return nil
}

// UpsertMissionObjectiveBatch persists a slice of pre-validated objectives.
func (s *Store) UpsertMissionObjectiveBatch(ctx context.Context, rows []*MissionObjective) error {
	if len(rows) == 0 {
		return nil
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO mission_objective ("+missionObjectiveCols+")")
	if err != nil {
		return fmt.Errorf("prepare mission_objective batch: %w", err)
	}
	for _, o := range rows {
		area := positionsToTuples([]Position(o.TargetArea))
		if err := batch.Append(
			o.ID, o.Version, o.ObservedAt, o.IngestedAt, o.Source,
			o.Title, o.Description, o.Priority, o.TargetEntityID, area, o.Deadline, o.Status,
		); err != nil {
			_ = batch.Abort()
			return fmt.Errorf("append mission_objective row %s: %w", o.ID, err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send mission_objective batch: %w", err)
	}
	return nil
}

// UpsertPlanBatch persists a slice of pre-validated Plans.
func (s *Store) UpsertPlanBatch(ctx context.Context, rows []*Plan) error {
	if len(rows) == 0 {
		return nil
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO plan ("+planCols+")")
	if err != nil {
		return fmt.Errorf("prepare plan batch: %w", err)
	}
	for _, p := range rows {
		refs := p.EvidenceRefs
		if refs == nil {
			refs = []string{}
		}
		if err := batch.Append(
			p.ID, p.Version, p.ObservedAt, p.IngestedAt, p.Source,
			p.ObjectiveID, p.Title, p.Summary, p.Status, p.Confidence, refs, p.ApprovedBy, p.ApprovedAt,
		); err != nil {
			_ = batch.Abort()
			return fmt.Errorf("append plan row %s: %w", p.ID, err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send plan batch: %w", err)
	}
	return nil
}

// UpsertMissionBatch persists a slice of pre-validated Missions.
func (s *Store) UpsertMissionBatch(ctx context.Context, rows []*Mission) error {
	if len(rows) == 0 {
		return nil
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO mission ("+missionCols+")")
	if err != nil {
		return fmt.Errorf("prepare mission batch: %w", err)
	}
	for _, m := range rows {
		wps := positionsToTuples([]Position(m.Waypoints))
		if err := batch.Append(
			m.ID, m.Version, m.ObservedAt, m.IngestedAt, m.Source,
			m.PlanID, m.AssignedUnitID, m.TargetEntityID, m.Intent, wps, m.Status, m.StartedAt, m.CompletedAt,
		); err != nil {
			_ = batch.Abort()
			return fmt.Errorf("append mission row %s: %w", m.ID, err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send mission batch: %w", err)
	}
	return nil
}

// UpsertTaskingOrderBatch persists a slice of pre-validated TaskingOrders.
func (s *Store) UpsertTaskingOrderBatch(ctx context.Context, rows []*TaskingOrder) error {
	if len(rows) == 0 {
		return nil
	}
	batch, err := s.pool.PrepareBatch(ctx, "INSERT INTO tasking_order ("+taskingOrderCols+")")
	if err != nil {
		return fmt.Errorf("prepare tasking_order batch: %w", err)
	}
	for _, t := range rows {
		if err := batch.Append(
			t.ID, t.Version, t.ObservedAt, t.IngestedAt, t.Source,
			t.MissionID, t.UnitID, t.CommandType, t.Params, t.Status, t.IssuedBy, t.IssuedAt, t.AcknowledgedAt, t.Result,
		); err != nil {
			_ = batch.Abort()
			return fmt.Errorf("append tasking_order row %s: %w", t.ID, err)
		}
	}
	if err := batch.Send(); err != nil {
		return fmt.Errorf("send tasking_order batch: %w", err)
	}
	return nil
}
