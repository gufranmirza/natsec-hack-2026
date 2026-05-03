package ontology

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// Filter is the locked v1 set of read filters per ADR 0003 §8.2. Zero values
// mean "no filter on this field." Repeated string filters use OR semantics.
type Filter struct {
	Subtypes       []string
	Sources        []string
	SourceRef      string
	BBox           *BBox
	ObservedAfter  time.Time
	ObservedBefore time.Time
	Statuses       []string
	Limit          int
	Cursor         *Cursor
}

// Cursor is the keyset position for read pagination. Ordered by
// (_ingested_at DESC, _id DESC); rows with (_ingested_at, _id) strictly
// less than the cursor come next.
type Cursor struct {
	IngestedAt time.Time `json:"ia"`
	ID         string    `json:"id"`
}

// EncodeCursor returns the opaque base64 form of a cursor.
func EncodeCursor(c Cursor) string {
	b, _ := json.Marshal(c)
	return base64.StdEncoding.EncodeToString(b)
}

// DecodeCursor parses an opaque base64 cursor string. Returns nil cursor on
// empty input. Empty input is the "first page" sentinel.
func DecodeCursor(s string) (*Cursor, error) {
	if s == "" {
		return nil, nil
	}
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, fmt.Errorf("cursor base64: %w", err)
	}
	var c Cursor
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, fmt.Errorf("cursor json: %w", err)
	}
	if c.ID == "" || c.IngestedAt.IsZero() {
		return nil, fmt.Errorf("cursor missing fields")
	}
	return &c, nil
}

// Page is a generic page result with an optional next cursor.
type Page[T any] struct {
	Items      []T
	NextCursor string
}

// defaultLimit and maxLimit cap pagination. Mirrors ADR 0003 R-003.
const (
	defaultLimit = 100
	maxLimit     = 1000
)

func clampLimit(n int) int {
	if n <= 0 {
		return defaultLimit
	}
	if n > maxLimit {
		return maxLimit
	}
	return n
}

// queryBuilder accumulates a SELECT with WHERE conjuncts and bound args.
type queryBuilder struct {
	sb   strings.Builder
	args []any
}

func (q *queryBuilder) writef(format string, args ...any) {
	fmt.Fprintf(&q.sb, format, args...)
}

func (q *queryBuilder) bind(arg any) string {
	q.args = append(q.args, arg)
	return "?"
}

// applyCommonFilters appends WHERE conjuncts for filters that are valid on
// every Object Type table. Caller is responsible for opening the WHERE clause.
func (q *queryBuilder) applyCommonFilters(f Filter, hasSubtype bool, hasSource bool, hasPosition bool, hasStatus bool, hasSourceRef bool) {
	if hasSubtype && len(f.Subtypes) > 0 {
		q.writef(" AND _subtype IN (")
		for i, s := range f.Subtypes {
			if i > 0 {
				q.sb.WriteString(",")
			}
			q.writef("%s", q.bind(s))
		}
		q.sb.WriteString(")")
	}
	if hasSource && len(f.Sources) > 0 {
		q.writef(" AND _source IN (")
		for i, s := range f.Sources {
			if i > 0 {
				q.sb.WriteString(",")
			}
			q.writef("%s", q.bind(s))
		}
		q.sb.WriteString(")")
	}
	if hasSourceRef && f.SourceRef != "" {
		q.writef(" AND _source_ref = %s", q.bind(f.SourceRef))
	}
	if hasPosition && f.BBox != nil {
		q.writef(" AND lat BETWEEN %s AND %s", q.bind(f.BBox.MinLat), q.bind(f.BBox.MaxLat))
		q.writef(" AND lon BETWEEN %s AND %s", q.bind(f.BBox.MinLon), q.bind(f.BBox.MaxLon))
	}
	if !f.ObservedAfter.IsZero() {
		q.writef(" AND _observed_at >= %s", q.bind(f.ObservedAfter))
	}
	if !f.ObservedBefore.IsZero() {
		q.writef(" AND _observed_at < %s", q.bind(f.ObservedBefore))
	}
	if hasStatus && len(f.Statuses) > 0 {
		q.writef(" AND status IN (")
		for i, s := range f.Statuses {
			if i > 0 {
				q.sb.WriteString(",")
			}
			q.writef("%s", q.bind(s))
		}
		q.sb.WriteString(")")
	}
}

func (q *queryBuilder) applyCursor(c *Cursor) {
	if c == nil {
		return
	}
	q.writef(" AND (_ingested_at, _id) < (%s, %s)", q.bind(c.IngestedAt), q.bind(c.ID))
}

func (q *queryBuilder) applyOrderAndLimit(limit int) {
	// LIMIT must be a literal in ClickHouse native SQL — not parameter-bound.
	// `limit` is server-clamped to [1, 1000] so direct formatting is safe.
	q.writef(" ORDER BY _ingested_at DESC, _id DESC LIMIT %d", limit)
}

// nextCursor returns the encoded cursor that points to the row *after* the
// last item in items. If items is shorter than limit, no next page exists.
func nextCursor[T any](items []T, limit int, key func(T) (time.Time, string)) string {
	if len(items) < limit || len(items) == 0 {
		return ""
	}
	last := items[len(items)-1]
	t, id := key(last)
	return EncodeCursor(Cursor{IngestedAt: t, ID: id})
}

// ----------------------------------------------------------------------------
// WhereEntity.
// ----------------------------------------------------------------------------

// WhereEntity returns the latest version per _id for entities matching f.
func (s *Store) WhereEntity(ctx context.Context, f Filter) (Page[*Entity], error) {
	limit := clampLimit(f.Limit)
	q := &queryBuilder{}
	q.writef("SELECT %s FROM entity FINAL WHERE 1=1", entityCols)
	q.applyCommonFilters(f, true, true, true, false, true)
	q.applyCursor(f.Cursor)
	q.applyOrderAndLimit(limit)
	return scanEntities(ctx, s.pool, q, limit)
}

func scanEntities(ctx context.Context, pool driver.Conn, q *queryBuilder, limit int) (Page[*Entity], error) {
	rows, err := pool.Query(ctx, q.sb.String(), q.args...)
	if err != nil {
		return Page[*Entity]{}, fmt.Errorf("query entity: %w", err)
	}
	defer rows.Close()

	out := make([]*Entity, 0, limit)
	for rows.Next() {
		var e Entity
		if err := rows.ScanStruct(&e); err != nil {
			return Page[*Entity]{}, fmt.Errorf("scan entity: %w", err)
		}
		out = append(out, &e)
	}
	if err := rows.Err(); err != nil {
		return Page[*Entity]{}, fmt.Errorf("rows entity: %w", err)
	}
	return Page[*Entity]{
		Items:      out,
		NextCursor: nextCursor(out, limit, func(e *Entity) (time.Time, string) { return e.IngestedAt, e.ID }),
	}, nil
}

// ----------------------------------------------------------------------------
// WhereEvent.
// ----------------------------------------------------------------------------

// WhereEvent returns matching Events with latest version per _id.
func (s *Store) WhereEvent(ctx context.Context, f Filter) (Page[*Event], error) {
	limit := clampLimit(f.Limit)
	q := &queryBuilder{}
	q.writef("SELECT %s FROM event FINAL WHERE 1=1", eventCols)
	q.applyCommonFilters(f, true, true, false, false, true)
	q.applyCursor(f.Cursor)
	q.applyOrderAndLimit(limit)

	rows, err := s.pool.Query(ctx, q.sb.String(), q.args...)
	if err != nil {
		return Page[*Event]{}, fmt.Errorf("query event: %w", err)
	}
	defer rows.Close()

	out := make([]*Event, 0, limit)
	for rows.Next() {
		var e Event
		if err := rows.ScanStruct(&e); err != nil {
			return Page[*Event]{}, fmt.Errorf("scan event: %w", err)
		}
		out = append(out, &e)
	}
	if err := rows.Err(); err != nil {
		return Page[*Event]{}, fmt.Errorf("rows event: %w", err)
	}
	return Page[*Event]{
		Items:      out,
		NextCursor: nextCursor(out, limit, func(e *Event) (time.Time, string) { return e.IngestedAt, e.ID }),
	}, nil
}

// ----------------------------------------------------------------------------
// WhereReport.
// ----------------------------------------------------------------------------

// WhereReport returns matching Reports.
func (s *Store) WhereReport(ctx context.Context, f Filter) (Page[*Report], error) {
	limit := clampLimit(f.Limit)
	q := &queryBuilder{}
	q.writef("SELECT %s FROM report FINAL WHERE 1=1", reportCols)
	q.applyCommonFilters(f, true, true, false, false, true)
	q.applyCursor(f.Cursor)
	q.applyOrderAndLimit(limit)

	rows, err := s.pool.Query(ctx, q.sb.String(), q.args...)
	if err != nil {
		return Page[*Report]{}, fmt.Errorf("query report: %w", err)
	}
	defer rows.Close()

	out := make([]*Report, 0, limit)
	for rows.Next() {
		var r Report
		if err := rows.ScanStruct(&r); err != nil {
			return Page[*Report]{}, fmt.Errorf("scan report: %w", err)
		}
		out = append(out, &r)
	}
	if err := rows.Err(); err != nil {
		return Page[*Report]{}, fmt.Errorf("rows report: %w", err)
	}
	return Page[*Report]{
		Items:      out,
		NextCursor: nextCursor(out, limit, func(r *Report) (time.Time, string) { return r.IngestedAt, r.ID }),
	}, nil
}

// ----------------------------------------------------------------------------
// WhereUnit.
// ----------------------------------------------------------------------------

// WhereUnit returns matching Units.
func (s *Store) WhereUnit(ctx context.Context, f Filter) (Page[*Unit], error) {
	limit := clampLimit(f.Limit)
	q := &queryBuilder{}
	q.writef("SELECT %s FROM unit FINAL WHERE 1=1", unitCols)
	q.applyCommonFilters(f, true, true, true, true, true)
	q.applyCursor(f.Cursor)
	q.applyOrderAndLimit(limit)

	rows, err := s.pool.Query(ctx, q.sb.String(), q.args...)
	if err != nil {
		return Page[*Unit]{}, fmt.Errorf("query unit: %w", err)
	}
	defer rows.Close()

	out := make([]*Unit, 0, limit)
	for rows.Next() {
		var u Unit
		if err := rows.ScanStruct(&u); err != nil {
			return Page[*Unit]{}, fmt.Errorf("scan unit: %w", err)
		}
		out = append(out, &u)
	}
	if err := rows.Err(); err != nil {
		return Page[*Unit]{}, fmt.Errorf("rows unit: %w", err)
	}
	return Page[*Unit]{
		Items:      out,
		NextCursor: nextCursor(out, limit, func(u *Unit) (time.Time, string) { return u.IngestedAt, u.ID }),
	}, nil
}

// ----------------------------------------------------------------------------
// WhereRecommendation.
// ----------------------------------------------------------------------------

// WhereRecommendation returns matching Recommendations.
func (s *Store) WhereRecommendation(ctx context.Context, f Filter) (Page[*Recommendation], error) {
	limit := clampLimit(f.Limit)
	q := &queryBuilder{}
	q.writef("SELECT %s FROM recommendation FINAL WHERE 1=1", recommendationCols)
	q.applyCommonFilters(f, false, true, false, true, false)
	q.applyCursor(f.Cursor)
	q.applyOrderAndLimit(limit)

	rows, err := s.pool.Query(ctx, q.sb.String(), q.args...)
	if err != nil {
		return Page[*Recommendation]{}, fmt.Errorf("query recommendation: %w", err)
	}
	defer rows.Close()

	out := make([]*Recommendation, 0, limit)
	for rows.Next() {
		var r Recommendation
		if err := rows.ScanStruct(&r); err != nil {
			return Page[*Recommendation]{}, fmt.Errorf("scan recommendation: %w", err)
		}
		out = append(out, &r)
	}
	if err := rows.Err(); err != nil {
		return Page[*Recommendation]{}, fmt.Errorf("rows recommendation: %w", err)
	}
	return Page[*Recommendation]{
		Items:      out,
		NextCursor: nextCursor(out, limit, func(r *Recommendation) (time.Time, string) { return r.IngestedAt, r.ID }),
	}, nil
}

// ----------------------------------------------------------------------------
// WhereMissionObjective.
// ----------------------------------------------------------------------------

// WhereMissionObjective returns matching MissionObjectives.
func (s *Store) WhereMissionObjective(ctx context.Context, f Filter) (Page[*MissionObjective], error) {
	limit := clampLimit(f.Limit)
	q := &queryBuilder{}
	q.writef("SELECT %s FROM mission_objective FINAL WHERE 1=1", missionObjectiveCols)
	q.applyCommonFilters(f, false, true, false, true, false)
	q.applyCursor(f.Cursor)
	q.applyOrderAndLimit(limit)

	rows, err := s.pool.Query(ctx, q.sb.String(), q.args...)
	if err != nil {
		return Page[*MissionObjective]{}, fmt.Errorf("query mission_objective: %w", err)
	}
	defer rows.Close()

	out := make([]*MissionObjective, 0, limit)
	for rows.Next() {
		var (
			o       MissionObjective
			areaRaw [][]any
		)
		if err := rows.Scan(
			&o.ID, &o.Version, &o.ObservedAt, &o.IngestedAt, &o.Source,
			&o.Title, &o.Description, &o.Priority, &o.TargetEntityID, &areaRaw, &o.Deadline, &o.Status,
		); err != nil {
			return Page[*MissionObjective]{}, fmt.Errorf("scan mission_objective: %w", err)
		}
		if len(areaRaw) > 0 {
			o.TargetArea = Polygon(tuplesToPositions(areaRaw))
		}
		out = append(out, &o)
	}
	if err := rows.Err(); err != nil {
		return Page[*MissionObjective]{}, fmt.Errorf("rows mission_objective: %w", err)
	}
	return Page[*MissionObjective]{
		Items:      out,
		NextCursor: nextCursor(out, limit, func(o *MissionObjective) (time.Time, string) { return o.IngestedAt, o.ID }),
	}, nil
}

// ----------------------------------------------------------------------------
// WherePlan.
// ----------------------------------------------------------------------------

// WherePlan returns matching Plans.
func (s *Store) WherePlan(ctx context.Context, f Filter) (Page[*Plan], error) {
	limit := clampLimit(f.Limit)
	q := &queryBuilder{}
	q.writef("SELECT %s FROM plan FINAL WHERE 1=1", planCols)
	q.applyCommonFilters(f, false, true, false, true, false)
	q.applyCursor(f.Cursor)
	q.applyOrderAndLimit(limit)

	rows, err := s.pool.Query(ctx, q.sb.String(), q.args...)
	if err != nil {
		return Page[*Plan]{}, fmt.Errorf("query plan: %w", err)
	}
	defer rows.Close()

	out := make([]*Plan, 0, limit)
	for rows.Next() {
		var p Plan
		if err := rows.ScanStruct(&p); err != nil {
			return Page[*Plan]{}, fmt.Errorf("scan plan: %w", err)
		}
		out = append(out, &p)
	}
	if err := rows.Err(); err != nil {
		return Page[*Plan]{}, fmt.Errorf("rows plan: %w", err)
	}
	return Page[*Plan]{
		Items:      out,
		NextCursor: nextCursor(out, limit, func(p *Plan) (time.Time, string) { return p.IngestedAt, p.ID }),
	}, nil
}

// ----------------------------------------------------------------------------
// WhereMission.
// ----------------------------------------------------------------------------

// WhereMission returns matching Missions.
func (s *Store) WhereMission(ctx context.Context, f Filter) (Page[*Mission], error) {
	limit := clampLimit(f.Limit)
	q := &queryBuilder{}
	q.writef("SELECT %s FROM mission FINAL WHERE 1=1", missionCols)
	q.applyCommonFilters(f, false, true, false, true, false)
	q.applyCursor(f.Cursor)
	q.applyOrderAndLimit(limit)

	rows, err := s.pool.Query(ctx, q.sb.String(), q.args...)
	if err != nil {
		return Page[*Mission]{}, fmt.Errorf("query mission: %w", err)
	}
	defer rows.Close()

	out := make([]*Mission, 0, limit)
	for rows.Next() {
		var (
			m      Mission
			wpsRaw [][]any
		)
		if err := rows.Scan(
			&m.ID, &m.Version, &m.ObservedAt, &m.IngestedAt, &m.Source,
			&m.PlanID, &m.AssignedUnitID, &m.TargetEntityID, &m.Intent, &wpsRaw, &m.Status, &m.StartedAt, &m.CompletedAt,
		); err != nil {
			return Page[*Mission]{}, fmt.Errorf("scan mission: %w", err)
		}
		if len(wpsRaw) > 0 {
			m.Waypoints = Waypoints(tuplesToPositions(wpsRaw))
		}
		out = append(out, &m)
	}
	if err := rows.Err(); err != nil {
		return Page[*Mission]{}, fmt.Errorf("rows mission: %w", err)
	}
	return Page[*Mission]{
		Items:      out,
		NextCursor: nextCursor(out, limit, func(m *Mission) (time.Time, string) { return m.IngestedAt, m.ID }),
	}, nil
}

// ----------------------------------------------------------------------------
// WhereTaskingOrder.
// ----------------------------------------------------------------------------

// WhereTaskingOrder returns matching TaskingOrders.
func (s *Store) WhereTaskingOrder(ctx context.Context, f Filter) (Page[*TaskingOrder], error) {
	limit := clampLimit(f.Limit)
	q := &queryBuilder{}
	q.writef("SELECT %s FROM tasking_order FINAL WHERE 1=1", taskingOrderCols)
	q.applyCommonFilters(f, false, true, false, true, false)
	q.applyCursor(f.Cursor)
	q.applyOrderAndLimit(limit)

	rows, err := s.pool.Query(ctx, q.sb.String(), q.args...)
	if err != nil {
		return Page[*TaskingOrder]{}, fmt.Errorf("query tasking_order: %w", err)
	}
	defer rows.Close()

	out := make([]*TaskingOrder, 0, limit)
	for rows.Next() {
		var t TaskingOrder
		if err := rows.ScanStruct(&t); err != nil {
			return Page[*TaskingOrder]{}, fmt.Errorf("scan tasking_order: %w", err)
		}
		out = append(out, &t)
	}
	if err := rows.Err(); err != nil {
		return Page[*TaskingOrder]{}, fmt.Errorf("rows tasking_order: %w", err)
	}
	return Page[*TaskingOrder]{
		Items:      out,
		NextCursor: nextCursor(out, limit, func(t *TaskingOrder) (time.Time, string) { return t.IngestedAt, t.ID }),
	}, nil
}

// ----------------------------------------------------------------------------
// Linked queries (M:M link tables).
// ----------------------------------------------------------------------------

// LinkedUnitsForEntity returns Units that have observed the given entity,
// folding the link metadata into a `_link` view alongside each Unit.
func (s *Store) LinkedUnitsForEntity(ctx context.Context, entityID string, limit int) ([]LinkedUnit, error) {
	limit = clampLimit(limit)
	// CH syntax requires alias *before* FINAL; LIMIT wants a literal int.
	q := fmt.Sprintf(`
		SELECT u._id, u._version, u._observed_at, u._ingested_at, u._source, u._source_ref, u._subtype,
		       u.callsign, u.lat, u.lon, u.altitude_m, u.heading_deg, u.speed_mps, u.status,
		       u.battery_pct, u.fuel_pct, u.capabilities,
		       l._first_seen_at, l._last_seen_at, l._observation_count
		FROM link_entity_observed_by_unit AS l FINAL
		INNER JOIN unit AS u FINAL ON u._id = l._to_id
		WHERE l._from_id = ?
		ORDER BY l._last_seen_at DESC
		LIMIT %d`, limit)
	rows, err := s.pool.Query(ctx, q, entityID)
	if err != nil {
		return nil, fmt.Errorf("query linked units: %w", err)
	}
	defer rows.Close()

	out := make([]LinkedUnit, 0, limit)
	for rows.Next() {
		var (
			u LinkedUnit
		)
		if err := rows.Scan(
			&u.ID, &u.Version, &u.ObservedAt, &u.IngestedAt, &u.Source, &u.SourceRef, &u.Subtype,
			&u.Callsign, &u.Lat, &u.Lon, &u.AltitudeM, &u.HeadingDeg, &u.SpeedMps, &u.Status,
			&u.BatteryPct, &u.FuelPct, &u.Capabilities,
			&u.Link.FirstSeenAt, &u.Link.LastSeenAt, &u.Link.ObservationCount,
		); err != nil {
			return nil, fmt.Errorf("scan linked unit: %w", err)
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// LinkedEntitiesForReport returns Entities referenced by the given report.
func (s *Store) LinkedEntitiesForReport(ctx context.Context, reportID string, limit int) ([]LinkedEntity, error) {
	limit = clampLimit(limit)
	q := fmt.Sprintf(`
		SELECT e._id, e._version, e._observed_at, e._ingested_at, e._source, e._source_ref, e._subtype,
		       e.name, e.lat, e.lon, e.altitude_m, e.heading_deg, e.speed_mps, e.course_deg,
		       e.confidence, e.threat_level, e.attributes,
		       l._confidence
		FROM link_report_references_entity AS l FINAL
		INNER JOIN entity AS e FINAL ON e._id = l._to_id
		WHERE l._from_id = ?
		LIMIT %d`, limit)
	rows, err := s.pool.Query(ctx, q, reportID)
	if err != nil {
		return nil, fmt.Errorf("query linked entities: %w", err)
	}
	defer rows.Close()

	out := make([]LinkedEntity, 0, limit)
	for rows.Next() {
		var e LinkedEntity
		if err := rows.Scan(
			&e.ID, &e.Version, &e.ObservedAt, &e.IngestedAt, &e.Source, &e.SourceRef, &e.Subtype,
			&e.Name, &e.Lat, &e.Lon, &e.AltitudeM, &e.HeadingDeg, &e.SpeedMps, &e.CourseDeg,
			&e.Confidence, &e.ThreatLevel, &e.Attributes,
			&e.Link.Confidence,
		); err != nil {
			return nil, fmt.Errorf("scan linked entity: %w", err)
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// LinkedUnit is a Unit projection that carries the link metadata for the
// `entity_observed_by_unit` Link Type.
type LinkedUnit struct {
	Unit
	Link struct {
		FirstSeenAt      time.Time `json:"_first_seen_at"`
		LastSeenAt       time.Time `json:"_last_seen_at"`
		ObservationCount uint64    `json:"_observation_count"`
	} `json:"_link"`
}

// LinkedEntity is an Entity projection that carries the link metadata for
// the `report_references_entity` Link Type.
type LinkedEntity struct {
	Entity
	Link struct {
		Confidence float32 `json:"_confidence"`
	} `json:"_link"`
}

// ----------------------------------------------------------------------------
// Changelog (cross-type recent change feed).
// ----------------------------------------------------------------------------

// ChangelogRow is one row of the cross-type changelog feed. Mirrors the
// `bus.ChangelogEvent` shape so HTTP clients and bus subscribers see the
// same projection. We keep this type ontology-local to avoid a bus->ontology
// import cycle; the HTTP read layer translates if needed.
type ChangelogRow struct {
	Type       ObjectType `json:"type"`
	ID         string     `json:"id"`
	Subtype    string     `json:"subtype,omitempty"`
	Source     string     `json:"source"`
	ObservedAt time.Time  `json:"observed_at"`
	IngestedAt time.Time  `json:"ingested_at"`
	Op         string     `json:"op"`
	Lat        *float64   `json:"-"`
	Lon        *float64   `json:"-"`
}

// ChangelogPosition projects (Lat, Lon) into the optional `position` JSON
// field, mirroring bus.ChangelogEvent.Position.
type ChangelogPosition struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

// changelogTypes selects which Object Types to UNION on Changelog. Empty
// means all 9.
func changelogTypes(types []ObjectType) []ObjectType {
	if len(types) == 0 {
		return AllObjectTypes
	}
	return types
}

// changelogQueryFor returns the SELECT for one Object Type with the columns
// projected into the cross-type ChangelogRow shape.
func changelogQueryFor(t ObjectType) string {
	switch t {
	case TypeEntity:
		return `SELECT 'Entity' AS type, _id, _subtype, _source, _observed_at, _ingested_at, 'upsert' AS op,
		        toNullable(lat) AS lat, toNullable(lon) AS lon
		        FROM entity`
	case TypeEvent:
		return `SELECT 'Event' AS type, _id, _subtype, _source, _observed_at, _ingested_at, 'upsert' AS op,
		        lat, lon
		        FROM event`
	case TypeReport:
		return `SELECT 'Report' AS type, _id, _subtype, _source, _observed_at, _ingested_at, 'upsert' AS op,
		        CAST(NULL AS Nullable(Float64)) AS lat, CAST(NULL AS Nullable(Float64)) AS lon
		        FROM report`
	case TypeUnit:
		return `SELECT 'Unit' AS type, _id, _subtype, _source, _observed_at, _ingested_at, 'upsert' AS op,
		        toNullable(lat) AS lat, toNullable(lon) AS lon
		        FROM unit`
	case TypeRecommendation:
		return `SELECT 'Recommendation' AS type, _id, '' AS subtype, _source, _observed_at, _ingested_at, 'upsert' AS op,
		        CAST(NULL AS Nullable(Float64)) AS lat, CAST(NULL AS Nullable(Float64)) AS lon
		        FROM recommendation`
	case TypeMissionObjective:
		return `SELECT 'MissionObjective' AS type, _id, '' AS subtype, _source, _observed_at, _ingested_at, 'upsert' AS op,
		        CAST(NULL AS Nullable(Float64)) AS lat, CAST(NULL AS Nullable(Float64)) AS lon
		        FROM mission_objective`
	case TypePlan:
		return `SELECT 'Plan' AS type, _id, '' AS subtype, _source, _observed_at, _ingested_at, 'upsert' AS op,
		        CAST(NULL AS Nullable(Float64)) AS lat, CAST(NULL AS Nullable(Float64)) AS lon
		        FROM plan`
	case TypeMission:
		return `SELECT 'Mission' AS type, _id, '' AS subtype, _source, _observed_at, _ingested_at, 'upsert' AS op,
		        CAST(NULL AS Nullable(Float64)) AS lat, CAST(NULL AS Nullable(Float64)) AS lon
		        FROM mission`
	case TypeTaskingOrder:
		return `SELECT 'TaskingOrder' AS type, _id, '' AS subtype, _source, _observed_at, _ingested_at, 'upsert' AS op,
		        CAST(NULL AS Nullable(Float64)) AS lat, CAST(NULL AS Nullable(Float64)) AS lon
		        FROM tasking_order`
	}
	return ""
}

// Changelog returns the most recent changes across the requested types,
// ordered by `_ingested_at DESC`. Filters: types (union), since (lower bound
// on `_ingested_at`), limit. Pagination is keyset on (_ingested_at, _id).
func (s *Store) Changelog(ctx context.Context, types []ObjectType, since time.Time, cursor *Cursor, limit int) (Page[ChangelogRow], error) {
	limit = clampLimit(limit)
	selected := changelogTypes(types)

	parts := make([]string, 0, len(selected))
	args := make([]any, 0)
	for _, t := range selected {
		sub := changelogQueryFor(t)
		if sub == "" {
			continue
		}
		// Each subquery shares the same since/cursor predicates; we wrap each
		// with WHERE so the UNION ALL is followed by a single ORDER+LIMIT.
		var preds strings.Builder
		preds.WriteString(" WHERE 1=1")
		if !since.IsZero() {
			preds.WriteString(" AND _ingested_at > ?")
			args = append(args, since)
		}
		if cursor != nil {
			preds.WriteString(" AND (_ingested_at, _id) < (?, ?)")
			args = append(args, cursor.IngestedAt, cursor.ID)
		}
		parts = append(parts, "SELECT * FROM ("+sub+preds.String()+")")
	}
	if len(parts) == 0 {
		return Page[ChangelogRow]{Items: []ChangelogRow{}}, nil
	}

	full := strings.Join(parts, " UNION ALL ") +
		fmt.Sprintf(" ORDER BY _ingested_at DESC, _id DESC LIMIT %d", limit)

	rows, err := s.pool.Query(ctx, full, args...)
	if err != nil {
		return Page[ChangelogRow]{}, fmt.Errorf("query changelog: %w", err)
	}
	defer rows.Close()

	out := make([]ChangelogRow, 0, limit)
	for rows.Next() {
		var r ChangelogRow
		var typeStr string
		if err := rows.Scan(&typeStr, &r.ID, &r.Subtype, &r.Source, &r.ObservedAt, &r.IngestedAt, &r.Op, &r.Lat, &r.Lon); err != nil {
			return Page[ChangelogRow]{}, fmt.Errorf("scan changelog: %w", err)
		}
		r.Type = ObjectType(typeStr)
		out = append(out, r)
	}
	if err := rows.Err(); err != nil {
		return Page[ChangelogRow]{}, fmt.Errorf("rows changelog: %w", err)
	}
	return Page[ChangelogRow]{
		Items:      out,
		NextCursor: nextCursor(out, limit, func(r ChangelogRow) (time.Time, string) { return r.IngestedAt, r.ID }),
	}, nil
}
