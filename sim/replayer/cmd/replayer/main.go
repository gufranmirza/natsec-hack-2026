// Replayer paces the OP SILENT EYE world-state JSONL through the
// platform-control-plane ingest API at scaled wall-clock time.
//
// Per UI ADR 0002 §13 (Runtime architecture):
//   - JSONL = pre-baked world state (Entity spawns, sensor Events,
//     Reports, Unit telemetry, MissionObjective, Mission shells).
//   - Replayer reads it line-by-line, sleeps until each row's
//     _observed_at scaled by --speed, and POSTs to the matching
//     /api/v1/ingest/{type} endpoint per CP ADR 0003.
//   - Initial-condition rows (everything at the earliest timestamp)
//     are POSTed bulk per type before the temporal loop starts.
//
// Wire-format gotchas honored:
//   - position [lat, lon] → flat lat/lon fields (CP Go struct shape)
//   - target_area / waypoints [[lat,lon],...] → [{lat,lon},...] objects
//   - Event.payload object → JSON-encoded string (CP Payload is string)
//   - strip _type, _ingested_at, _version (server-stamped)
//   - strip affiliation (TS-only; computed UI-side from threat_level)
//   - strip TS-only Event.verb (UI display field)
//   - keep _id (CP ADR 0003 I-004: producer _id wins over UUIDv5 derive)
//
// Usage:
//   go run ./cmd/replayer \
//     --jsonl=../scenarios/silent-eye-20260502/silent-eye.events.jsonl \
//     --cp=http://localhost:8080 \
//     --speed=30
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
)

const userAgent = "silent-eye-replayer/1.0"

// typeToEndpoint maps the JSONL _type to the CP ingest path slug.
var typeToEndpoint = map[string]string{
	"Entity":           "entities",
	"Event":            "events",
	"Report":           "reports",
	"Unit":             "units",
	"Recommendation":   "recommendations",
	"MissionObjective": "mission-objectives",
	"Plan":             "plans",
	"Mission":          "missions",
	"TaskingOrder":     "tasking-orders",
}

// Per-type fields that are TS-only (not in Go ontology) and must be stripped.
// Affiliation moved out of this map after CP added entity.affiliation column.
var tsOnlyFields = map[string]map[string]bool{
	"Event":          {"verb": true},
	"Recommendation": {"verb": true, "short": true, "asset_callsign": true, "eta": true, "why": true, "gating": true},
}

// Server-stamped fields stripped from every type.
var stampedFields = []string{"_type", "_ingested_at", "_version"}

func main() {
	var (
		jsonlPath  = flag.String("jsonl", "", "path to silent-eye world-state JSONL")
		cpBaseURL  = flag.String("cp", "http://localhost:8080", "control-plane base URL")
		speed      = flag.Float64("speed", 30, "replay speed multiplier (1=realtime, 30=30x faster)")
		dryRun     = flag.Bool("dry-run", false, "log POSTs without sending")
		logBodies  = flag.Bool("log-bodies", false, "log full request/response bodies (chatty)")
	)
	flag.Parse()

	if *jsonlPath == "" {
		log.Fatal("--jsonl is required")
	}
	if *speed <= 0 {
		log.Fatal("--speed must be positive")
	}

	rows, err := loadJSONL(*jsonlPath)
	if err != nil {
		log.Fatalf("loading JSONL: %v", err)
	}
	log.Printf("loaded %d rows from %s", len(rows), *jsonlPath)

	// Sort by _observed_at ascending for chronological replay.
	sort.SliceStable(rows, func(i, j int) bool {
		return rowTime(rows[i]).Before(rowTime(rows[j]))
	})

	// Initial conditions = everything at the earliest timestamp. Bulk-POST
	// per type before starting the timed loop so the world has a populated
	// snapshot before the first temporal event arrives.
	startTS := rowTime(rows[0])
	var initial, temporal []map[string]any
	for _, r := range rows {
		if rowTime(r).Equal(startTS) {
			initial = append(initial, r)
		} else {
			temporal = append(temporal, r)
		}
	}
	log.Printf("startTS=%s · initial=%d rows · temporal=%d rows · speed=%.1fx",
		startTS.Format(time.RFC3339), len(initial), len(temporal), *speed)

	client := &http.Client{Timeout: 10 * time.Second}
	poster := &poster{
		baseURL:   strings.TrimRight(*cpBaseURL, "/"),
		client:    client,
		dryRun:    *dryRun,
		logBodies: *logBodies,
	}

	// 1. Bulk-POST initial conditions, batched by type.
	if err := poster.postBulk(initial); err != nil {
		log.Fatalf("initial conditions: %v", err)
	}

	// 2. Temporal loop. Anchor wall-clock: NOW corresponds to startTS in
	// scenario time. Each row's wall-clock deadline = NOW + (row_ts - startTS)/speed.
	wallStart := time.Now()
	for i, r := range temporal {
		deadline := wallStart.Add(time.Duration(float64(rowTime(r).Sub(startTS)) / *speed))
		if d := time.Until(deadline); d > 0 {
			time.Sleep(d)
		}
		if err := poster.postOne(r); err != nil {
			log.Printf("[row %d/%d %s] post failed: %v",
				i+1, len(temporal), r["_id"], err)
		}
	}
	log.Printf("replay complete · %d rows posted over %.1fs wall-clock", len(rows), time.Since(wallStart).Seconds())
}

// ──────────────────────────────────────────────────────────────────────
// JSONL loading
// ──────────────────────────────────────────────────────────────────────

func loadJSONL(path string) ([]map[string]any, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	data, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}
	var rows []map[string]any
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var r map[string]any
		if err := json.Unmarshal([]byte(line), &r); err != nil {
			return nil, fmt.Errorf("parse line %q: %w", line[:min(60, len(line))], err)
		}
		rows = append(rows, r)
	}
	return rows, nil
}

func rowTime(r map[string]any) time.Time {
	s, _ := r["_observed_at"].(string)
	t, _ := time.Parse(time.RFC3339Nano, s)
	return t
}

// ──────────────────────────────────────────────────────────────────────
// Wire-format transformation
// ──────────────────────────────────────────────────────────────────────

// transform converts a JSONL row into the wire shape the CP Go handlers
// expect. Mutates a defensive copy; original is left intact.
func transform(r map[string]any) map[string]any {
	t, _ := r["_type"].(string)

	out := make(map[string]any, len(r))
	for k, v := range r {
		out[k] = v
	}

	for _, f := range stampedFields {
		delete(out, f)
	}
	if extras, ok := tsOnlyFields[t]; ok {
		for f := range extras {
			delete(out, f)
		}
	}

	// position [lat, lon] → flat lat/lon (Entity, Unit, Event)
	if pos, ok := out["position"].([]any); ok && len(pos) == 2 {
		out["lat"] = pos[0]
		out["lon"] = pos[1]
		delete(out, "position")
	}

	// target_area [[lat,lon],...] → [{lat,lon},...] (MissionObjective)
	if area, ok := out["target_area"].([]any); ok {
		conv := make([]map[string]any, 0, len(area))
		for _, p := range area {
			pp, ok := p.([]any)
			if !ok || len(pp) != 2 {
				continue
			}
			conv = append(conv, map[string]any{"lat": pp[0], "lon": pp[1]})
		}
		out["target_area"] = conv
	}

	// waypoints [[lat,lon],...] → [{lat,lon},...] (Mission)
	if wp, ok := out["waypoints"].([]any); ok {
		conv := make([]map[string]any, 0, len(wp))
		for _, p := range wp {
			pp, ok := p.([]any)
			if !ok || len(pp) != 2 {
				continue
			}
			conv = append(conv, map[string]any{"lat": pp[0], "lon": pp[1]})
		}
		out["waypoints"] = conv
	}

	// Event.payload object → JSON-encoded string (Go Payload is string)
	if t == "Event" {
		if payload, ok := out["payload"]; ok && payload != nil {
			b, err := json.Marshal(payload)
			if err == nil {
				out["payload"] = string(b)
			}
		}
	}

	// Recommendation.proposed_params object → JSON-encoded string
	if t == "Recommendation" {
		if pp, ok := out["proposed_params"]; ok && pp != nil {
			b, err := json.Marshal(pp)
			if err == nil {
				out["proposed_params"] = string(b)
			}
		}
	}

	return out
}

// ──────────────────────────────────────────────────────────────────────
// HTTP poster
// ──────────────────────────────────────────────────────────────────────

type poster struct {
	baseURL   string
	client    *http.Client
	dryRun    bool
	logBodies bool
}

// postBulk groups rows by _type and POSTs one batch per type.
func (p *poster) postBulk(rows []map[string]any) error {
	byType := map[string][]map[string]any{}
	for _, r := range rows {
		t, _ := r["_type"].(string)
		byType[t] = append(byType[t], transform(r))
	}
	// Stable order so logs are reproducible.
	types := make([]string, 0, len(byType))
	for t := range byType {
		types = append(types, t)
	}
	sort.Strings(types)
	for _, t := range types {
		batch := byType[t]
		slug, ok := typeToEndpoint[t]
		if !ok {
			log.Printf("[bulk %s] no endpoint for type, skipping %d rows", t, len(batch))
			continue
		}
		if err := p.send(slug, batch); err != nil {
			return fmt.Errorf("bulk POST /%s: %w", slug, err)
		}
		log.Printf("[bulk] POST /api/v1/ingest/%-18s %d rows", slug, len(batch))
	}
	return nil
}

// postOne POSTs a single row as a 1-element array to its typed endpoint.
func (p *poster) postOne(r map[string]any) error {
	t, _ := r["_type"].(string)
	slug, ok := typeToEndpoint[t]
	if !ok {
		return fmt.Errorf("no endpoint for _type=%q", t)
	}
	id, _ := r["_id"].(string)
	if err := p.send(slug, []map[string]any{transform(r)}); err != nil {
		return err
	}
	log.Printf("[%-9s] %-20s %s", t, id, summarize(r))
	return nil
}

func (p *poster) send(slug string, batch []map[string]any) error {
	url := p.baseURL + "/api/v1/ingest/" + slug
	body, err := json.Marshal(batch)
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	if p.dryRun {
		log.Printf("[dry-run] POST %s · %d rows · %d bytes", url, len(batch), len(body))
		if p.logBodies {
			log.Printf("[dry-run] body: %s", string(body))
		}
		return nil
	}

	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", userAgent)

	res, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	respBody, _ := io.ReadAll(res.Body)

	if res.StatusCode >= 400 {
		return fmt.Errorf("HTTP %d: %s", res.StatusCode, truncate(string(respBody), 300))
	}

	if p.logBodies {
		log.Printf("→ POST /api/v1/ingest/%s · %d rows · resp: %s", slug, len(batch), truncate(string(respBody), 200))
	}
	return nil
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

func summarize(r map[string]any) string {
	if sub, ok := r["_subtype"].(string); ok && sub != "" {
		if desc, ok := r["description"].(string); ok && desc != "" {
			return fmt.Sprintf("%s — %s", sub, truncate(desc, 80))
		}
		return sub
	}
	if title, ok := r["title"].(string); ok && title != "" {
		return title
	}
	if cs, ok := r["callsign"].(string); ok && cs != "" {
		return cs
	}
	return ""
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
