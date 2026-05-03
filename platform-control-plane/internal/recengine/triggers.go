// Package recengine emits Recommendations as the ontology stream evolves.
//
// Per UI ADR 0002 §10 (Recommendations as expected CP outputs) and §13
// (Runtime architecture). Subscribes to the changelog bus; on each upsert,
// evaluates a small set of doctrinal triggers; when one fires, builds a
// Recommendation, writes it via the ontology store, and republishes it on
// the bus so the wsfeed SSE stream surfaces it to the UI in real time.
//
// Confidence + gating tiers per ADR §10 are deterministic shells; the
// rationale string is LLM-generated when ANTHROPIC_API_KEY is set, otherwise
// templated. Either way the Recommendation conforms to the OAG contract
// (CP ADR 0001 §7) — gating tier is fixed by trigger, never by the LLM.
package recengine

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/nsh-2026/platform-control-plane/internal/bus"
	"github.com/nsh-2026/platform-control-plane/internal/ontology"
)

// gating tiers per CP ADR 0001 §7.
const (
	GatingAuto      = "auto"
	GatingConfirm   = "confirm"
	GatingForbidLLM = "forbid-llm"
)

// recID is the deterministic _source_ref used so each rec is emitted once
// per scenario run (UUIDv5 dedup on retry).
const recSourceRefPrefix = "recengine:silent-eye:"

// trigger declares one doctrinal rule that maps an incoming event onto a
// Recommendation shell. The fire callback is invoked on the recengine after
// the predicate returns true.
type trigger struct {
	name      string
	predicate func(ev bus.ChangelogEvent, store storeReader, ctx context.Context) bool
	build     func(ev bus.ChangelogEvent, store storeReader, ctx context.Context) (*ontology.Recommendation, error)
	gating    string
}

// storeReader is the read surface recengine uses on the store. Kept tight
// so the engine can be tested with a fake.
type storeReader interface {
	GetEvent(ctx context.Context, id string) (*ontology.Event, error)
	GetEntity(ctx context.Context, id string) (*ontology.Entity, error)
	WhereEvent(ctx context.Context, f ontology.Filter) (ontology.Page[*ontology.Event], error)
}

// triggers are evaluated in order on every upsert event.
func defaultTriggers() []trigger {
	return []trigger{
		// rec_001 — vector ROOK-1 to confirm RED-ASSAULT-1 composition.
		// Trigger: classification_upgrade on ent_red_assault_co_01 to hostile.
		{
			name:   "rec_001_vector_rook1",
			gating: GatingConfirm,
			predicate: func(ev bus.ChangelogEvent, _ storeReader, _ context.Context) bool {
				if ev.Type != ontology.TypeEvent {
					return false
				}
				if ev.Subtype != "classification_upgrade" {
					return false
				}
				return ev.ID == "evt_phase4_001" || strings.Contains(ev.ID, "assault_co")
			},
			build: func(ev bus.ChangelogEvent, sr storeReader, ctx context.Context) (*ontology.Recommendation, error) {
				evidence := collectRecentEvents(ctx, sr, []string{"rf_ping", "sigint_intercept", "geotagged_social_post", "visual_detection"}, ev.ObservedAt, 30*time.Minute)
				return mkRec("rec_001", ev, evidence, mkRecArgs{
					subjectEntityID:    strPtr("ent_red_assault_co_01"),
					proposedActionType: "vector_isr",
					rationale:          "RED-ASSAULT-1 reclassified hostile (conf 0.88). RF + IR + EO + OSINT consistent with deliberate attack staging. Vector ROOK-1 to obtain optical confirmation of column composition before committing fires.",
					confidence:         0.78,
					gating:             GatingConfirm,
				}), nil
			},
		},

		// rec_002 — re-route LAZARUS away from Lancet impact corridor.
		// Trigger: loitering_munition_engage event in vicinity of LAZARUS path.
		{
			name:   "rec_002_reroute_lazarus",
			gating: GatingAuto,
			predicate: func(ev bus.ChangelogEvent, _ storeReader, _ context.Context) bool {
				return ev.Type == ontology.TypeEvent && ev.Subtype == "loitering_munition_engage"
			},
			build: func(ev bus.ChangelogEvent, sr storeReader, ctx context.Context) (*ontology.Recommendation, error) {
				evidence := collectRecentEvents(ctx, sr, []string{"loitering_munition_engage", "smoke_screen", "ground_advance", "casevac_request"}, ev.ObservedAt, 30*time.Minute)
				return mkRec("rec_002", ev, evidence, mkRecArgs{
					subjectEventID:     strPtr(ev.ID),
					proposedActionType: "reroute_medical",
					rationale:          "Lancet-3 loitering pattern intersects LAZARUS planned route to PUNISHER-1. Re-route via grid 37U-CM-589 to avoid impact corridor. Auto-tier per OAG: re-routing a non-combatant medical asset is logged but not gated.",
					confidence:         0.92,
					gating:             GatingAuto,
				}), nil
			},
		},

		// rec_003 — HIMARS counter-battery on RED-BAT-7. The demo hero moment.
		// Trigger: track_acquired upgrade on ent_red_arty_battery_01 with
		// confidence high enough to localize.
		{
			name:   "rec_003_himars_counter_battery",
			gating: GatingConfirm,
			predicate: func(ev bus.ChangelogEvent, sr storeReader, ctx context.Context) bool {
				if ev.Type != ontology.TypeEvent || ev.Subtype != "track_acquired" {
					return false
				}
				e, err := sr.GetEvent(ctx, ev.ID)
				if err != nil || e.EntityID == nil {
					return false
				}
				return *e.EntityID == "ent_red_arty_battery_01"
			},
			build: func(ev bus.ChangelogEvent, sr storeReader, ctx context.Context) (*ontology.Recommendation, error) {
				evidence := collectRecentEvents(ctx, sr, []string{"artillery_impact", "sigint_intercept", "thermal_signature", "casevac_request", "track_acquired"}, ev.ObservedAt, 45*time.Minute)
				return mkRec("rec_003", ev, evidence, mkRecArgs{
					subjectEntityID:    strPtr("ent_red_arty_battery_01"),
					proposedActionType: "fire_himars",
					rationale:          "RED-BAT-7 (Msta-S battery) localized at grid 37U-CN-624 via crater back-azimuth + R-168 fires-net intercept + FIRMS thermal cluster + sigint confidence cross. Battery active 8 minutes ago. HIMARS displacement window ~8 min before RED tubes egress. Recommend M30A1 alternate-warhead, 2 rounds.",
					confidence:         0.87,
					gating:             GatingConfirm,
				}), nil
			},
		},

		// rec_004 — FPV cleared hot for RED-ASSAULT-1 stragglers. Kinetic,
		// human-only per OAG forbid-llm. Trigger: 2+ unit_destroyed events
		// on RED armor entities (signals successful counter-fire phase).
		{
			name:   "rec_004_fpv_clear_hot",
			gating: GatingForbidLLM,
			predicate: func(ev bus.ChangelogEvent, sr storeReader, ctx context.Context) bool {
				if ev.Type != ontology.TypeEvent || ev.Subtype != "unit_destroyed" {
					return false
				}
				// Only fire after we've seen 2+ RED armor destroyed.
				prior, err := sr.WhereEvent(ctx, ontology.Filter{
					Subtypes:       []string{"unit_destroyed"},
					ObservedBefore: ev.ObservedAt,
					Limit:          50,
				})
				if err != nil {
					return false
				}
				armorCount := 0
				for _, p := range prior.Items {
					if p.EntityID != nil && strings.HasPrefix(*p.EntityID, "ent_red_armor") {
						armorCount++
					}
				}
				return armorCount >= 1 // current event + 1 prior = 2 total
			},
			build: func(ev bus.ChangelogEvent, sr storeReader, ctx context.Context) (*ontology.Recommendation, error) {
				evidence := collectRecentEvents(ctx, sr, []string{"unit_destroyed", "fpv_strike", "thermal_signature", "withdrawal", "ground_advance"}, ev.ObservedAt, 30*time.Minute)
				return mkRec("rec_004", ev, evidence, mkRecArgs{
					subjectEntityID:    strPtr("ent_red_assault_co_01"),
					proposedActionType: "clear_fpv_kinetic",
					rationale:          "Two RED T-72B3 destroyed; assault element shedding combat power. Surviving BTR-82A stragglers visible to FALCON-1 EO. FPV team HORNET in range with 4 munitions remaining. Engagement window short — RED column withdrawal initiated. KINETIC: forbid-llm gating per OAG tier 3, requires explicit human authorization.",
					confidence:         0.71,
					gating:             GatingForbidLLM,
				}), nil
			},
		},

		// rec_005 — CASEVAC dispatch. Trigger: casevac_request event.
		{
			name:   "rec_005_casevac_dispatch",
			gating: GatingAuto,
			predicate: func(ev bus.ChangelogEvent, _ storeReader, _ context.Context) bool {
				return ev.Type == ontology.TypeEvent && ev.Subtype == "casevac_request"
			},
			build: func(ev bus.ChangelogEvent, sr storeReader, ctx context.Context) (*ontology.Recommendation, error) {
				evidence := collectRecentEvents(ctx, sr, []string{"casevac_request", "artillery_impact", "small_arms_contact", "unit_damaged"}, ev.ObservedAt, 30*time.Minute)
				return mkRec("rec_005", ev, evidence, mkRecArgs{
					subjectEventID:     strPtr(ev.ID),
					proposedActionType: "dispatch_medevac",
					rationale:          "PUNISHER-1 reports WIA after 152mm artillery impact. LAZARUS available, route clear of current Lancet loiter pattern, ETA 4 minutes. Auto-tier per OAG: medevac dispatch is logged but not gated.",
					confidence:         0.95,
					gating:             GatingAuto,
				}), nil
			},
		},
	}
}

// ──────────────────────────────────────────────────────────────────────
// Recommendation construction helpers
// ──────────────────────────────────────────────────────────────────────

type mkRecArgs struct {
	subjectEntityID    *string
	subjectEventID     *string
	proposedActionType string
	rationale          string
	confidence         float32
	gating             string
}

// mkRec builds a Recommendation shell. The store stamps _id / _version /
// _ingested_at on Upsert; the producer-supplied _id wins via ADR I-004.
//
// Recommendation has no native gating field, so the gating tier is encoded
// inside ProposedParams as JSON. The UI parses ProposedParams to render
// the tier badge on the rec card.
func mkRec(stableID string, ev bus.ChangelogEvent, evidenceRefs []string, args mkRecArgs) *ontology.Recommendation {
	objectiveID := "obj_silent_eye"
	params := fmt.Sprintf(`{"gating":%q,"emitted_in_response_to_event":%q}`, args.gating, ev.ID)
	return &ontology.Recommendation{
		Envelope: ontology.Envelope{
			ID:         stableID,
			ObservedAt: ev.IngestedAt,
			Source:     "system:recengine",
		},
		SubjectEntityID:    args.subjectEntityID,
		SubjectEventID:     args.subjectEventID,
		ObjectiveID:        &objectiveID,
		ProposedActionType: args.proposedActionType,
		ProposedParams:     params,
		Rationale:          args.rationale,
		Confidence:         args.confidence,
		EvidenceRefs:       evidenceRefs,
		Status:             ontology.RecStatusPending,
	}
}

// collectRecentEvents pulls Event _ids of the requested subtypes that
// occurred in the time window before `now`. Used for evidence_refs[].
func collectRecentEvents(ctx context.Context, sr storeReader, subtypes []string, now time.Time, window time.Duration) []string {
	since := now.Add(-window)
	page, err := sr.WhereEvent(ctx, ontology.Filter{
		Subtypes:       subtypes,
		ObservedAfter:  since,
		ObservedBefore: now,
		Limit:          50,
	})
	if err != nil {
		return []string{}
	}
	out := make([]string, 0, len(page.Items))
	for _, e := range page.Items {
		out = append(out, e.ID)
	}
	if len(out) == 0 {
		return []string{}
	}
	return out
}

func strPtr(s string) *string { return &s }

// formatGating turns the gating string into a recognizable description.
// Used in log lines.
func formatGating(g string) string {
	switch g {
	case GatingAuto:
		return "auto-tier"
	case GatingConfirm:
		return "human confirm"
	case GatingForbidLLM:
		return "human-only kinetic (forbid-llm)"
	default:
		return fmt.Sprintf("gating=%s", g)
	}
}
