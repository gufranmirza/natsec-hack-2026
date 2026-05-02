// Package read serves the typed HTTP read surface defined by ADR 0003 §8.
//
// All reads return Object handles in the canonical
// `{"_type", "_id", ...properties}` shape so the UI and LLM data.* tools
// see the same projection. Pagination is keyset on (_ingested_at, _id).
package read

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/ontology"
)

// Handler owns the GET routes documented in ADR 0003 §8.
type Handler struct {
	store *ontology.Store
	log   *zap.Logger
}

// New creates a read Handler.
func New(store *ontology.Store, log *zap.Logger) *Handler {
	return &Handler{store: store, log: log}
}

// pageResponse is the JSON envelope returned by list / linked / changelog.
type pageResponse struct {
	Items      []map[string]any `json:"items"`
	NextCursor string           `json:"next_cursor,omitempty"`
	Count      int              `json:"count"`
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// resolveType maps the URL `:type` path parameter (PascalCase) to an
// ontology.ObjectType. Returns false if the type is unknown.
func resolveType(s string) (ontology.ObjectType, bool) {
	for _, t := range ontology.AllObjectTypes {
		if string(t) == s {
			return t, true
		}
	}
	return "", false
}

// HandleGet serves GET /api/v1/objects/:type/:id.
func (h *Handler) HandleGet(w http.ResponseWriter, r *http.Request) {
	typeStr := r.PathValue("type")
	id := r.PathValue("id")
	t, ok := resolveType(typeStr)
	if !ok {
		writeError(w, http.StatusNotFound, fmt.Sprintf("unknown type %q", typeStr))
		return
	}
	if id == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}
	obj, err := h.getOne(r, t, id)
	if err != nil {
		if errors.Is(err, ontology.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		h.log.Error("read get failed", zap.String("type", string(t)), zap.String("id", id), zap.Error(err))
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, obj)
}

func (h *Handler) getOne(r *http.Request, t ontology.ObjectType, id string) (map[string]any, error) {
	ctx := r.Context()
	switch t {
	case ontology.TypeEntity:
		v, err := h.store.GetEntity(ctx, id)
		if err != nil {
			return nil, err
		}
		return objectHandle(t, v), nil
	case ontology.TypeEvent:
		v, err := h.store.GetEvent(ctx, id)
		if err != nil {
			return nil, err
		}
		return objectHandle(t, v), nil
	case ontology.TypeReport:
		v, err := h.store.GetReport(ctx, id)
		if err != nil {
			return nil, err
		}
		return objectHandle(t, v), nil
	case ontology.TypeUnit:
		v, err := h.store.GetUnit(ctx, id)
		if err != nil {
			return nil, err
		}
		return objectHandle(t, v), nil
	case ontology.TypeRecommendation:
		v, err := h.store.GetRecommendation(ctx, id)
		if err != nil {
			return nil, err
		}
		return objectHandle(t, v), nil
	case ontology.TypeMissionObjective:
		v, err := h.store.GetMissionObjective(ctx, id)
		if err != nil {
			return nil, err
		}
		return objectHandle(t, v), nil
	case ontology.TypePlan:
		v, err := h.store.GetPlan(ctx, id)
		if err != nil {
			return nil, err
		}
		return objectHandle(t, v), nil
	case ontology.TypeMission:
		v, err := h.store.GetMission(ctx, id)
		if err != nil {
			return nil, err
		}
		return objectHandle(t, v), nil
	case ontology.TypeTaskingOrder:
		v, err := h.store.GetTaskingOrder(ctx, id)
		if err != nil {
			return nil, err
		}
		return objectHandle(t, v), nil
	}
	return nil, fmt.Errorf("unsupported type %s", t)
}

// HandleList serves GET /api/v1/objects/:type with filters.
func (h *Handler) HandleList(w http.ResponseWriter, r *http.Request) {
	typeStr := r.PathValue("type")
	t, ok := resolveType(typeStr)
	if !ok {
		writeError(w, http.StatusNotFound, fmt.Sprintf("unknown type %q", typeStr))
		return
	}
	filter, err := parseFilter(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	items, next, err := h.runList(r, t, filter)
	if err != nil {
		h.log.Error("read list failed", zap.String("type", string(t)), zap.Error(err))
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, pageResponse{
		Items:      items,
		NextCursor: next,
		Count:      len(items),
	})
}

// runList dispatches per Object Type. Returns handles + next cursor.
func (h *Handler) runList(r *http.Request, t ontology.ObjectType, f ontology.Filter) ([]map[string]any, string, error) {
	ctx := r.Context()
	switch t {
	case ontology.TypeEntity:
		page, err := h.store.WhereEntity(ctx, f)
		return handlesOf(t, page.Items), page.NextCursor, err
	case ontology.TypeEvent:
		page, err := h.store.WhereEvent(ctx, f)
		return handlesOf(t, page.Items), page.NextCursor, err
	case ontology.TypeReport:
		page, err := h.store.WhereReport(ctx, f)
		return handlesOf(t, page.Items), page.NextCursor, err
	case ontology.TypeUnit:
		page, err := h.store.WhereUnit(ctx, f)
		return handlesOf(t, page.Items), page.NextCursor, err
	case ontology.TypeRecommendation:
		page, err := h.store.WhereRecommendation(ctx, f)
		return handlesOf(t, page.Items), page.NextCursor, err
	case ontology.TypeMissionObjective:
		page, err := h.store.WhereMissionObjective(ctx, f)
		return handlesOf(t, page.Items), page.NextCursor, err
	case ontology.TypePlan:
		page, err := h.store.WherePlan(ctx, f)
		return handlesOf(t, page.Items), page.NextCursor, err
	case ontology.TypeMission:
		page, err := h.store.WhereMission(ctx, f)
		return handlesOf(t, page.Items), page.NextCursor, err
	case ontology.TypeTaskingOrder:
		page, err := h.store.WhereTaskingOrder(ctx, f)
		return handlesOf(t, page.Items), page.NextCursor, err
	}
	return nil, "", fmt.Errorf("unsupported type %s", t)
}

func handlesOf[T any](t ontology.ObjectType, items []T) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		out = append(out, objectHandle(t, it))
	}
	return out
}

// objectHandle serializes obj into the `{_type, _id, ...properties}` shape.
// We round-trip through json so that struct json tags drive the field names
// and `omitempty`/optional pointer fields behave as defined.
func objectHandle(t ontology.ObjectType, obj any) map[string]any {
	b, err := json.Marshal(obj)
	if err != nil {
		// json.Marshal of our typed structs is total; failure means a bug.
		return map[string]any{"_type": string(t), "_error": err.Error()}
	}
	m := make(map[string]any, 16)
	if err := json.Unmarshal(b, &m); err != nil {
		return map[string]any{"_type": string(t), "_error": err.Error()}
	}
	delete(m, "_version") // §8.7: omit internal storage detail
	out := make(map[string]any, len(m)+1)
	out["_type"] = string(t)
	for k, v := range m {
		out[k] = v
	}
	return out
}

// parseFilter pulls the locked v1 query parameters into an ontology.Filter.
func parseFilter(r *http.Request) (ontology.Filter, error) {
	q := r.URL.Query()
	f := ontology.Filter{
		Subtypes: q["subtype"],
		Sources:  q["source"],
		Statuses: q["status"],
	}
	f.SourceRef = q.Get("source_ref")

	if s := q.Get("bbox"); s != "" {
		bb, err := parseBBox(s)
		if err != nil {
			return f, fmt.Errorf("bbox: %w", err)
		}
		f.BBox = bb
	}
	if s := q.Get("observed_after"); s != "" {
		t, err := time.Parse(time.RFC3339, s)
		if err != nil {
			return f, fmt.Errorf("observed_after: %w", err)
		}
		f.ObservedAfter = t
	}
	if s := q.Get("observed_before"); s != "" {
		t, err := time.Parse(time.RFC3339, s)
		if err != nil {
			return f, fmt.Errorf("observed_before: %w", err)
		}
		f.ObservedBefore = t
	}
	if s := q.Get("limit"); s != "" {
		n, err := strconv.Atoi(s)
		if err != nil {
			return f, fmt.Errorf("limit: %w", err)
		}
		f.Limit = n
	}
	if s := q.Get("cursor"); s != "" {
		c, err := ontology.DecodeCursor(s)
		if err != nil {
			return f, fmt.Errorf("bad cursor")
		}
		f.Cursor = c
	}
	return f, nil
}

func parseBBox(s string) (*ontology.BBox, error) {
	parts := strings.Split(s, ",")
	if len(parts) != 4 {
		return nil, fmt.Errorf("expected lat1,lon1,lat2,lon2")
	}
	vals := make([]float64, 4)
	for i, p := range parts {
		v, err := strconv.ParseFloat(strings.TrimSpace(p), 64)
		if err != nil {
			return nil, fmt.Errorf("part %d: %w", i, err)
		}
		vals[i] = v
	}
	return &ontology.BBox{
		MinLat: vals[0], MinLon: vals[1],
		MaxLat: vals[2], MaxLon: vals[3],
	}, nil
}

// HandleLinked serves GET /api/v1/objects/:type/:id/linked/:link-type.
func (h *Handler) HandleLinked(w http.ResponseWriter, r *http.Request) {
	typeStr := r.PathValue("type")
	id := r.PathValue("id")
	linkType := r.PathValue("link_type")
	t, ok := resolveType(typeStr)
	if !ok {
		writeError(w, http.StatusNotFound, fmt.Sprintf("unknown type %q", typeStr))
		return
	}

	limit := 100
	if s := r.URL.Query().Get("limit"); s != "" {
		if n, err := strconv.Atoi(s); err == nil {
			limit = n
		}
	}

	switch ontology.LinkType(linkType) {
	case ontology.LinkEntityObservedByUnitT:
		if t != ontology.TypeEntity {
			writeError(w, http.StatusBadRequest, "link entity_observed_by_unit applies to Entity")
			return
		}
		linked, err := h.store.LinkedUnitsForEntity(r.Context(), id, limit)
		if err != nil {
			h.log.Error("linked units failed", zap.String("entity_id", id), zap.Error(err))
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		items := make([]map[string]any, 0, len(linked))
		for i := range linked {
			h := objectHandle(ontology.TypeUnit, &linked[i].Unit)
			h["_link"] = map[string]any{
				"_first_seen_at":     linked[i].Link.FirstSeenAt,
				"_last_seen_at":      linked[i].Link.LastSeenAt,
				"_observation_count": linked[i].Link.ObservationCount,
			}
			items = append(items, h)
		}
		writeJSON(w, http.StatusOK, pageResponse{Items: items, Count: len(items)})
	case ontology.LinkReportReferencesEntityT:
		if t != ontology.TypeReport {
			writeError(w, http.StatusBadRequest, "link report_references_entity applies to Report")
			return
		}
		linked, err := h.store.LinkedEntitiesForReport(r.Context(), id, limit)
		if err != nil {
			h.log.Error("linked entities failed", zap.String("report_id", id), zap.Error(err))
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		items := make([]map[string]any, 0, len(linked))
		for i := range linked {
			h := objectHandle(ontology.TypeEntity, &linked[i].Entity)
			h["_link"] = map[string]any{
				"_confidence": linked[i].Link.Confidence,
			}
			items = append(items, h)
		}
		writeJSON(w, http.StatusOK, pageResponse{Items: items, Count: len(items)})
	default:
		writeError(w, http.StatusBadRequest, fmt.Sprintf("unknown link type %q", linkType))
	}
}

// HandleChangelog serves GET /api/v1/changelog.
func (h *Handler) HandleChangelog(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	var since time.Time
	if s := q.Get("since"); s != "" {
		t, err := time.Parse(time.RFC3339, s)
		if err != nil {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("since: %v", err))
			return
		}
		since = t
	}

	var types []ontology.ObjectType
	if s := q.Get("types"); s != "" {
		for _, raw := range strings.Split(s, ",") {
			tt, ok := resolveType(strings.TrimSpace(raw))
			if !ok {
				writeError(w, http.StatusBadRequest, fmt.Sprintf("unknown type %q", raw))
				return
			}
			types = append(types, tt)
		}
	}

	limit := 200
	if s := q.Get("limit"); s != "" {
		if n, err := strconv.Atoi(s); err == nil {
			limit = n
		}
	}

	var cursor *ontology.Cursor
	if s := q.Get("cursor"); s != "" {
		c, err := ontology.DecodeCursor(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "bad cursor")
			return
		}
		cursor = c
	}

	page, err := h.store.Changelog(r.Context(), types, since, cursor, limit)
	if err != nil {
		h.log.Error("changelog query failed", zap.Error(err))
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	items := make([]map[string]any, 0, len(page.Items))
	for _, row := range page.Items {
		m := map[string]any{
			"type":        string(row.Type),
			"id":          row.ID,
			"source":      row.Source,
			"observed_at": row.ObservedAt,
			"ingested_at": row.IngestedAt,
			"op":          row.Op,
		}
		if row.Subtype != "" {
			m["subtype"] = row.Subtype
		}
		if row.Lat != nil && row.Lon != nil {
			m["position"] = map[string]float64{"lat": *row.Lat, "lon": *row.Lon}
		}
		items = append(items, m)
	}
	writeJSON(w, http.StatusOK, pageResponse{
		Items:      items,
		NextCursor: page.NextCursor,
		Count:      len(items),
	})
}

// HandleSearch serves GET /api/v1/search.
//
// v1: Reports only. Requires an embedding provider; this route returns 503
// until one is wired (ADR 0003 §13 Q-1: ingest accepts Reports with empty
// embeddings; a worker fills them later).
func (h *Handler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("type") != "" && r.URL.Query().Get("type") != string(ontology.TypeReport) {
		writeError(w, http.StatusBadRequest, "v1 search supports type=Report only")
		return
	}
	w.Header().Set("Retry-After", "60")
	writeError(w, http.StatusServiceUnavailable, "embedding provider not configured")
}
