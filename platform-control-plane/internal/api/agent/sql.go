package agent

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"strings"
	"time"

	chdriver "github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// SQLRunner executes a single read-only SQL query and returns the rows
// as []map[string]any so the LLM can synthesize a natural-language answer.
type SQLRunner interface {
	QueryRows(ctx context.Context, sql string, limit int) (QueryResult, error)
}

// QueryResult is the shape returned to the LLM.
type QueryResult struct {
	Columns      []string         `json:"columns"`
	Rows         []map[string]any `json:"rows"`
	RowCount     int              `json:"row_count"`
	Truncated    bool             `json:"truncated"`
	ExecutedSQL  string           `json:"executed_sql"`
	WarningNotes string           `json:"warning_notes,omitempty"`
}

// ClickHouseSQLRunner is the production implementation backed by the existing
// CP ClickHouse pool. Read-only by construction — only SELECT statements are
// permitted; everything else is rejected before reaching ClickHouse.
type ClickHouseSQLRunner struct {
	pool        chdriver.Conn
	defaultRows int // applied if the LLM forgets to LIMIT
	maxRows     int // hard cap regardless of LIMIT in SQL
}

// NewClickHouseSQLRunner wires the runner to the existing CH pool.
func NewClickHouseSQLRunner(pool chdriver.Conn) *ClickHouseSQLRunner {
	return &ClickHouseSQLRunner{
		pool:        pool,
		defaultRows: 50,
		maxRows:     200,
	}
}

// QueryRows executes a SELECT and returns the rows.
//
// Safety:
//   - Only SELECT/WITH (CTE) statements are accepted.
//   - Forbidden keywords (INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE,
//     CREATE, GRANT, RENAME, REPLACE, OPTIMIZE, SYSTEM, KILL) cause an error.
//   - Row count is capped at runner.maxRows even if SQL says LIMIT 1000.
func (r *ClickHouseSQLRunner) QueryRows(ctx context.Context, sql string, limit int) (QueryResult, error) {
	cleaned := strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(sql), ";"))
	if cleaned == "" {
		return QueryResult{}, errors.New("empty SQL")
	}
	if err := validateReadOnly(cleaned); err != nil {
		return QueryResult{}, err
	}

	cap := limit
	if cap <= 0 {
		cap = r.defaultRows
	}
	if cap > r.maxRows {
		cap = r.maxRows
	}
	finalSQL := ensureLimit(cleaned, cap)

	rows, err := r.pool.Query(ctx, finalSQL)
	if err != nil {
		return QueryResult{}, fmt.Errorf("clickhouse query: %w", err)
	}
	defer rows.Close()

	colTypes := rows.ColumnTypes()
	cols := make([]string, len(colTypes))
	for i, ct := range colTypes {
		cols[i] = ct.Name()
	}

	// Build one correctly-typed destination per column via reflection on
	// ColumnType.ScanType. clickhouse-go v2 requires the dest pointer to
	// match the column's native Go scan type — generic *interface{}
	// destinations do NOT work for nullable / LowCardinality / decimal /
	// array / map columns, only for raw scalars. Reflect-new gets it right.
	out := QueryResult{Columns: cols, Rows: make([]map[string]any, 0, cap), ExecutedSQL: finalSQL}
	for rows.Next() {
		dests := make([]any, len(colTypes))
		for i, ct := range colTypes {
			st := ct.ScanType()
			if st == nil {
				// Fall back to interface for unknown columns (e.g., expressions).
				var v any
				dests[i] = &v
				continue
			}
			dests[i] = reflect.New(st).Interface()
		}
		if err := rows.Scan(dests...); err != nil {
			return out, fmt.Errorf("scan row: %w", err)
		}
		row := make(map[string]any, len(cols))
		for i, name := range cols {
			row[name] = normalize(reflect.ValueOf(dests[i]).Elem().Interface())
		}
		out.Rows = append(out.Rows, row)
		if len(out.Rows) >= cap {
			out.Truncated = true
			break
		}
	}
	if err := rows.Err(); err != nil {
		return out, fmt.Errorf("rows err: %w", err)
	}
	out.RowCount = len(out.Rows)
	return out, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Safety + helpers
// ─────────────────────────────────────────────────────────────────────────────

var forbiddenKeywords = []string{
	"insert", "update", "delete", "drop", "alter", "truncate",
	"create", "grant", "rename", "replace", "optimize", "system",
	"kill", "attach", "detach", "exchange", "freeze",
}

var leadingClause = regexp.MustCompile(`(?is)^\s*(select|with)\b`)

func validateReadOnly(sql string) error {
	if !leadingClause.MatchString(sql) {
		return errors.New("only SELECT or WITH (CTE) statements are allowed")
	}
	lower := strings.ToLower(sql)
	for _, kw := range forbiddenKeywords {
		if containsWord(lower, kw) {
			return fmt.Errorf("forbidden keyword %q in SQL", kw)
		}
	}
	return nil
}

// containsWord checks for kw as a whole word in lower-cased haystack.
func containsWord(haystack, kw string) bool {
	re := regexp.MustCompile(`\b` + regexp.QuoteMeta(kw) + `\b`)
	return re.MatchString(haystack)
}

// ensureLimit appends `LIMIT n` if the SQL doesn't already contain one. We
// don't rewrite an explicit LIMIT — but the runner's row-counting cap is the
// real defense in depth.
var hasLimit = regexp.MustCompile(`(?i)\blimit\s+\d+`)

func ensureLimit(sql string, n int) string {
	if hasLimit.MatchString(sql) {
		return sql
	}
	return sql + fmt.Sprintf(" LIMIT %d", n)
}

// normalize cleans up scan results before they go to JSON. It dereferences
// nullable pointers, formats time.Time as RFC3339 strings, widens narrow
// numeric types so the LLM sees consistent JSON, and recursively descends
// into arrays / maps.
func normalize(v any) any {
	if v == nil {
		return nil
	}
	switch x := v.(type) {
	case nil:
		return nil
	case time.Time:
		if x.IsZero() {
			return nil
		}
		return x.UTC().Format(time.RFC3339)
	case *time.Time:
		if x == nil || x.IsZero() {
			return nil
		}
		return x.UTC().Format(time.RFC3339)
	case *string:
		if x == nil {
			return nil
		}
		return *x
	case *int8, *int16, *int32, *int64, *uint8, *uint16, *uint32, *uint64,
		*float32, *float64, *bool:
		rv := reflect.ValueOf(x)
		if rv.IsNil() {
			return nil
		}
		return normalize(rv.Elem().Interface())
	case int8:
		return int64(x)
	case int16:
		return int64(x)
	case int32:
		return int64(x)
	case uint8:
		return uint64(x)
	case uint16:
		return uint64(x)
	case uint32:
		return uint64(x)
	case float32:
		return float64(x)
	}

	// Arrays / slices and maps: recurse so nested nullable elements unwrap.
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Ptr:
		if rv.IsNil() {
			return nil
		}
		return normalize(rv.Elem().Interface())
	case reflect.Slice, reflect.Array:
		if rv.Type().Elem().Kind() == reflect.Uint8 {
			// []byte → string for readability
			return string(rv.Bytes())
		}
		out := make([]any, rv.Len())
		for i := 0; i < rv.Len(); i++ {
			out[i] = normalize(rv.Index(i).Interface())
		}
		return out
	case reflect.Map:
		out := make(map[string]any, rv.Len())
		iter := rv.MapRange()
		for iter.Next() {
			out[fmt.Sprint(iter.Key().Interface())] = normalize(iter.Value().Interface())
		}
		return out
	}
	return v
}
