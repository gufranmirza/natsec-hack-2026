// Package ingest serves the typed write surface defined by ADR 0003.
//
// One POST route per Object Type. Each route accepts a JSON array, stamps
// the canonical envelope (_id derived from _source/_source_ref, _ingested_at,
// _version), validates per-row, and persists accepted rows in a single
// ClickHouse batch. Per-row failures are reported in the response body
// alongside the accepted count; HTTP status stays 200 for partial success.
package ingest

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/bus"
	"github.com/nsh-2026/platform-control-plane/internal/ontology"
)

// Locked limits per ADR 0003 I-002.
const (
	maxBatchRows  = 1000
	maxBatchBytes = 10 * 1024 * 1024
)

// ontologyNS is the UUIDv5 namespace for deterministic _id derivation from
// (_source, _source_ref). Locked per ADR 0003 §9. Do not change.
var ontologyNS = uuid.MustParse("01927e72-feed-7000-8000-000000000001")

// Handler owns the 9 typed ingest routes.
type Handler struct {
	store *ontology.Store
	bus   bus.Bus
	log   *zap.Logger
}

// New creates an ingest Handler.
func New(store *ontology.Store, b bus.Bus, log *zap.Logger) *Handler {
	return &Handler{store: store, bus: b, log: log}
}

// rowError is one per-row failure entry in the response.
type rowError struct {
	Index     int      `json:"index"`
	SourceRef *string  `json:"_source_ref"`
	Errors    []string `json:"errors"`
}

// batchResponse is the JSON body of every successful ingest call.
type batchResponse struct {
	Accepted int        `json:"accepted"`
	Rejected int        `json:"rejected"`
	Errors   []rowError `json:"errors"`
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// readBody reads an ingest body capped at maxBatchBytes.
func readBody(r *http.Request) ([]byte, error) {
	r.Body = http.MaxBytesReader(nil, r.Body, maxBatchBytes)
	b, err := io.ReadAll(r.Body)
	if err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			return nil, fmt.Errorf("body exceeds %d bytes", maxBatchBytes)
		}
		return nil, fmt.Errorf("read body: %w", err)
	}
	return b, nil
}

// deriveID returns the Object _id following ADR 0003 I-004:
//  1. preset id wins (UUID format checked by caller via validation)
//  2. UUIDv5 of "_source|_source_ref" within the locked ontologyNS
//  3. fresh UUIDv7
func deriveID(presetID, source, sourceRef string) string {
	if presetID != "" {
		return presetID
	}
	if sourceRef != "" {
		return uuid.NewSHA1(ontologyNS, []byte(source+"|"+sourceRef)).String()
	}
	return ontology.NewID()
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// explodeErrs unwraps an ontology.ValidationError into a flat list of strings.
func explodeErrs(err error) []string {
	if err == nil {
		return nil
	}
	var ve *ontology.ValidationError
	if errors.As(err, &ve) {
		out := make([]string, 0, len(ve.Errs))
		for _, e := range ve.Errs {
			out = append(out, e.Error())
		}
		return out
	}
	return []string{err.Error()}
}

// stampEnvelope sets the server-owned envelope fields per ADR 0003 §7.4.
// Producer values for these fields are silently overwritten.
func stampEnvelope(env *ontology.Envelope, presetID, source, sourceRef string, observedAt time.Time, now time.Time) {
	env.ID = deriveID(presetID, source, sourceRef)
	env.IngestedAt = now
	if !observedAt.IsZero() {
		env.Version = ontology.VersionFromTime(observedAt)
	}
}

// HandleEntities handles POST /api/v1/ingest/entities.
func (h *Handler) HandleEntities(w http.ResponseWriter, r *http.Request) {
	body, err := readBody(r)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, err.Error())
		return
	}
	var rows []ontology.Entity
	if err := json.Unmarshal(body, &rows); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON array: %v", err))
		return
	}
	if len(rows) > maxBatchRows {
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("batch size %d exceeds %d rows", len(rows), maxBatchRows))
		return
	}

	now := time.Now().UTC()
	accepted := make([]*ontology.Entity, 0, len(rows))
	events := make([]bus.ChangelogEvent, 0, len(rows))
	rejected := make([]rowError, 0)

	for i := range rows {
		row := &rows[i]
		stampEnvelope(&row.Envelope, row.ID, row.Source, ptrStr(row.SourceRef), row.ObservedAt, now)
		if err := ontology.ValidateEntity(row); err != nil {
			rejected = append(rejected, rowError{Index: i, SourceRef: row.SourceRef, Errors: explodeErrs(err)})
			continue
		}
		accepted = append(accepted, row)
		events = append(events, bus.ChangelogEvent{
			Type:       ontology.TypeEntity,
			ID:         row.ID,
			Subtype:    row.Subtype,
			Source:     row.Source,
			ObservedAt: row.ObservedAt,
			IngestedAt: row.IngestedAt,
			Op:         bus.OpUpsert,
			Position:   &bus.Position{Lat: row.Lat, Lon: row.Lon},
		})
	}
	h.persistAndPublish(w, r, "entity", func() error { return h.store.UpsertEntityBatch(r.Context(), accepted) }, events, len(accepted), rejected)
}

// HandleEvents handles POST /api/v1/ingest/events.
func (h *Handler) HandleEvents(w http.ResponseWriter, r *http.Request) {
	body, err := readBody(r)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, err.Error())
		return
	}
	var rows []ontology.Event
	if err := json.Unmarshal(body, &rows); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON array: %v", err))
		return
	}
	if len(rows) > maxBatchRows {
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("batch size %d exceeds %d rows", len(rows), maxBatchRows))
		return
	}

	now := time.Now().UTC()
	accepted := make([]*ontology.Event, 0, len(rows))
	events := make([]bus.ChangelogEvent, 0, len(rows))
	rejected := make([]rowError, 0)

	for i := range rows {
		row := &rows[i]
		stampEnvelope(&row.Envelope, row.ID, row.Source, ptrStr(row.SourceRef), row.ObservedAt, now)
		if err := ontology.ValidateEvent(row); err != nil {
			rejected = append(rejected, rowError{Index: i, SourceRef: row.SourceRef, Errors: explodeErrs(err)})
			continue
		}
		accepted = append(accepted, row)
		var pos *bus.Position
		if row.Lat != nil && row.Lon != nil {
			pos = &bus.Position{Lat: *row.Lat, Lon: *row.Lon}
		}
		events = append(events, bus.ChangelogEvent{
			Type: ontology.TypeEvent, ID: row.ID, Subtype: row.Subtype, Source: row.Source,
			ObservedAt: row.ObservedAt, IngestedAt: row.IngestedAt, Op: bus.OpUpsert, Position: pos,
		})
	}
	h.persistAndPublish(w, r, "event", func() error { return h.store.UpsertEventBatch(r.Context(), accepted) }, events, len(accepted), rejected)
}

// HandleReports handles POST /api/v1/ingest/reports.
func (h *Handler) HandleReports(w http.ResponseWriter, r *http.Request) {
	body, err := readBody(r)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, err.Error())
		return
	}
	var rows []ontology.Report
	if err := json.Unmarshal(body, &rows); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON array: %v", err))
		return
	}
	if len(rows) > maxBatchRows {
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("batch size %d exceeds %d rows", len(rows), maxBatchRows))
		return
	}

	now := time.Now().UTC()
	accepted := make([]*ontology.Report, 0, len(rows))
	events := make([]bus.ChangelogEvent, 0, len(rows))
	rejected := make([]rowError, 0)

	for i := range rows {
		row := &rows[i]
		stampEnvelope(&row.Envelope, row.ID, row.Source, ptrStr(row.SourceRef), row.ObservedAt, now)
		if err := ontology.ValidateReport(row); err != nil {
			rejected = append(rejected, rowError{Index: i, SourceRef: row.SourceRef, Errors: explodeErrs(err)})
			continue
		}
		accepted = append(accepted, row)
		events = append(events, bus.ChangelogEvent{
			Type: ontology.TypeReport, ID: row.ID, Subtype: row.Subtype, Source: row.Source,
			ObservedAt: row.ObservedAt, IngestedAt: row.IngestedAt, Op: bus.OpUpsert,
		})
	}
	h.persistAndPublish(w, r, "report", func() error { return h.store.UpsertReportBatch(r.Context(), accepted) }, events, len(accepted), rejected)
}

// HandleUnits handles POST /api/v1/ingest/units.
func (h *Handler) HandleUnits(w http.ResponseWriter, r *http.Request) {
	body, err := readBody(r)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, err.Error())
		return
	}
	var rows []ontology.Unit
	if err := json.Unmarshal(body, &rows); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON array: %v", err))
		return
	}
	if len(rows) > maxBatchRows {
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("batch size %d exceeds %d rows", len(rows), maxBatchRows))
		return
	}

	now := time.Now().UTC()
	accepted := make([]*ontology.Unit, 0, len(rows))
	events := make([]bus.ChangelogEvent, 0, len(rows))
	rejected := make([]rowError, 0)

	for i := range rows {
		row := &rows[i]
		stampEnvelope(&row.Envelope, row.ID, row.Source, ptrStr(row.SourceRef), row.ObservedAt, now)
		if err := ontology.ValidateUnit(row); err != nil {
			rejected = append(rejected, rowError{Index: i, SourceRef: row.SourceRef, Errors: explodeErrs(err)})
			continue
		}
		accepted = append(accepted, row)
		events = append(events, bus.ChangelogEvent{
			Type: ontology.TypeUnit, ID: row.ID, Subtype: row.Subtype, Source: row.Source,
			ObservedAt: row.ObservedAt, IngestedAt: row.IngestedAt, Op: bus.OpUpsert,
			Position: &bus.Position{Lat: row.Lat, Lon: row.Lon},
		})
	}
	h.persistAndPublish(w, r, "unit", func() error { return h.store.UpsertUnitBatch(r.Context(), accepted) }, events, len(accepted), rejected)
}

// HandleRecommendations handles POST /api/v1/ingest/recommendations.
func (h *Handler) HandleRecommendations(w http.ResponseWriter, r *http.Request) {
	body, err := readBody(r)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, err.Error())
		return
	}
	var rows []ontology.Recommendation
	if err := json.Unmarshal(body, &rows); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON array: %v", err))
		return
	}
	if len(rows) > maxBatchRows {
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("batch size %d exceeds %d rows", len(rows), maxBatchRows))
		return
	}

	now := time.Now().UTC()
	accepted := make([]*ontology.Recommendation, 0, len(rows))
	events := make([]bus.ChangelogEvent, 0, len(rows))
	rejected := make([]rowError, 0)

	for i := range rows {
		row := &rows[i]
		// Recommendations have no _source_ref column; pass empty.
		stampEnvelope(&row.Envelope, row.ID, row.Source, "", row.ObservedAt, now)
		if err := ontology.ValidateRecommendation(row); err != nil {
			rejected = append(rejected, rowError{Index: i, Errors: explodeErrs(err)})
			continue
		}
		accepted = append(accepted, row)
		events = append(events, bus.ChangelogEvent{
			Type: ontology.TypeRecommendation, ID: row.ID, Source: row.Source,
			ObservedAt: row.ObservedAt, IngestedAt: row.IngestedAt, Op: bus.OpUpsert,
		})
	}
	h.persistAndPublish(w, r, "recommendation", func() error { return h.store.UpsertRecommendationBatch(r.Context(), accepted) }, events, len(accepted), rejected)
}

// HandleMissionObjectives handles POST /api/v1/ingest/mission-objectives.
func (h *Handler) HandleMissionObjectives(w http.ResponseWriter, r *http.Request) {
	body, err := readBody(r)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, err.Error())
		return
	}
	var rows []ontology.MissionObjective
	if err := json.Unmarshal(body, &rows); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON array: %v", err))
		return
	}
	if len(rows) > maxBatchRows {
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("batch size %d exceeds %d rows", len(rows), maxBatchRows))
		return
	}

	now := time.Now().UTC()
	accepted := make([]*ontology.MissionObjective, 0, len(rows))
	events := make([]bus.ChangelogEvent, 0, len(rows))
	rejected := make([]rowError, 0)

	for i := range rows {
		row := &rows[i]
		stampEnvelope(&row.Envelope, row.ID, row.Source, "", row.ObservedAt, now)
		if err := ontology.ValidateMissionObjective(row); err != nil {
			rejected = append(rejected, rowError{Index: i, Errors: explodeErrs(err)})
			continue
		}
		accepted = append(accepted, row)
		events = append(events, bus.ChangelogEvent{
			Type: ontology.TypeMissionObjective, ID: row.ID, Source: row.Source,
			ObservedAt: row.ObservedAt, IngestedAt: row.IngestedAt, Op: bus.OpUpsert,
		})
	}
	h.persistAndPublish(w, r, "mission_objective", func() error { return h.store.UpsertMissionObjectiveBatch(r.Context(), accepted) }, events, len(accepted), rejected)
}

// HandlePlans handles POST /api/v1/ingest/plans.
func (h *Handler) HandlePlans(w http.ResponseWriter, r *http.Request) {
	body, err := readBody(r)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, err.Error())
		return
	}
	var rows []ontology.Plan
	if err := json.Unmarshal(body, &rows); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON array: %v", err))
		return
	}
	if len(rows) > maxBatchRows {
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("batch size %d exceeds %d rows", len(rows), maxBatchRows))
		return
	}

	now := time.Now().UTC()
	accepted := make([]*ontology.Plan, 0, len(rows))
	events := make([]bus.ChangelogEvent, 0, len(rows))
	rejected := make([]rowError, 0)

	for i := range rows {
		row := &rows[i]
		stampEnvelope(&row.Envelope, row.ID, row.Source, "", row.ObservedAt, now)
		if err := ontology.ValidatePlan(row); err != nil {
			rejected = append(rejected, rowError{Index: i, Errors: explodeErrs(err)})
			continue
		}
		accepted = append(accepted, row)
		events = append(events, bus.ChangelogEvent{
			Type: ontology.TypePlan, ID: row.ID, Source: row.Source,
			ObservedAt: row.ObservedAt, IngestedAt: row.IngestedAt, Op: bus.OpUpsert,
		})
	}
	h.persistAndPublish(w, r, "plan", func() error { return h.store.UpsertPlanBatch(r.Context(), accepted) }, events, len(accepted), rejected)
}

// HandleMissions handles POST /api/v1/ingest/missions.
func (h *Handler) HandleMissions(w http.ResponseWriter, r *http.Request) {
	body, err := readBody(r)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, err.Error())
		return
	}
	var rows []ontology.Mission
	if err := json.Unmarshal(body, &rows); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON array: %v", err))
		return
	}
	if len(rows) > maxBatchRows {
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("batch size %d exceeds %d rows", len(rows), maxBatchRows))
		return
	}

	now := time.Now().UTC()
	accepted := make([]*ontology.Mission, 0, len(rows))
	events := make([]bus.ChangelogEvent, 0, len(rows))
	rejected := make([]rowError, 0)

	for i := range rows {
		row := &rows[i]
		stampEnvelope(&row.Envelope, row.ID, row.Source, "", row.ObservedAt, now)
		if err := ontology.ValidateMission(row); err != nil {
			rejected = append(rejected, rowError{Index: i, Errors: explodeErrs(err)})
			continue
		}
		accepted = append(accepted, row)
		events = append(events, bus.ChangelogEvent{
			Type: ontology.TypeMission, ID: row.ID, Source: row.Source,
			ObservedAt: row.ObservedAt, IngestedAt: row.IngestedAt, Op: bus.OpUpsert,
		})
	}
	h.persistAndPublish(w, r, "mission", func() error { return h.store.UpsertMissionBatch(r.Context(), accepted) }, events, len(accepted), rejected)
}

// HandleTaskingOrders handles POST /api/v1/ingest/tasking-orders.
func (h *Handler) HandleTaskingOrders(w http.ResponseWriter, r *http.Request) {
	body, err := readBody(r)
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, err.Error())
		return
	}
	var rows []ontology.TaskingOrder
	if err := json.Unmarshal(body, &rows); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid JSON array: %v", err))
		return
	}
	if len(rows) > maxBatchRows {
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("batch size %d exceeds %d rows", len(rows), maxBatchRows))
		return
	}

	now := time.Now().UTC()
	accepted := make([]*ontology.TaskingOrder, 0, len(rows))
	events := make([]bus.ChangelogEvent, 0, len(rows))
	rejected := make([]rowError, 0)

	for i := range rows {
		row := &rows[i]
		stampEnvelope(&row.Envelope, row.ID, row.Source, "", row.ObservedAt, now)
		if err := ontology.ValidateTaskingOrder(row); err != nil {
			rejected = append(rejected, rowError{Index: i, Errors: explodeErrs(err)})
			continue
		}
		accepted = append(accepted, row)
		events = append(events, bus.ChangelogEvent{
			Type: ontology.TypeTaskingOrder, ID: row.ID, Source: row.Source,
			ObservedAt: row.ObservedAt, IngestedAt: row.IngestedAt, Op: bus.OpUpsert,
		})
	}
	h.persistAndPublish(w, r, "tasking_order", func() error { return h.store.UpsertTaskingOrderBatch(r.Context(), accepted) }, events, len(accepted), rejected)
}

// persistAndPublish runs the batch upsert callback and publishes one bus
// event per accepted row on success. On store error, returns 503 with
// Retry-After. On success, writes the partial-success batch response with
// HTTP 200, even if rejected > 0 (per ADR 0003 I-005).
func (h *Handler) persistAndPublish(
	w http.ResponseWriter, r *http.Request, label string,
	persist func() error, events []bus.ChangelogEvent, acceptedCount int, rejected []rowError,
) {
	if acceptedCount > 0 {
		if err := persist(); err != nil {
			h.log.Error("ingest persist failed", zap.String("type", label), zap.Error(err))
			w.Header().Set("Retry-After", "1")
			writeError(w, http.StatusServiceUnavailable, fmt.Sprintf("persist failed: %v", err))
			return
		}
		for _, ev := range events {
			h.bus.Publish(r.Context(), ev)
		}
	}
	writeJSON(w, http.StatusOK, batchResponse{
		Accepted: acceptedCount,
		Rejected: len(rejected),
		Errors:   rejected,
	})
}
