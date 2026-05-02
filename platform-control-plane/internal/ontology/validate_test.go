package ontology

import (
	"strings"
	"testing"
	"time"
)

func validEntity(t *testing.T) *Entity {
	t.Helper()
	now := time.Now().UTC()
	e := &Entity{
		Subtype:     EntitySubtypeAircraft,
		Lat:         37.7,
		Lon:         -122.4,
		Confidence:  0.9,
		ThreatLevel: ThreatLevelNone,
	}
	e.ID = NewID()
	e.ObservedAt = now
	e.Source = "ingest:test"
	e.stamp(now)
	return e
}

func TestValidateEntity_Valid(t *testing.T) {
	e := validEntity(t)
	if err := ValidateEntity(e); err != nil {
		t.Fatalf("ValidateEntity(valid) = %v, want nil", err)
	}
}

func TestValidateEntity_BadSubtype(t *testing.T) {
	e := validEntity(t)
	e.Subtype = "Spaceship"
	err := ValidateEntity(e)
	if err == nil {
		t.Fatal("ValidateEntity(bad subtype) = nil, want error")
	}
	if !strings.Contains(err.Error(), "_subtype") {
		t.Errorf("ValidateEntity error %q does not mention _subtype", err)
	}
}

func TestValidateEntity_BadPosition(t *testing.T) {
	e := validEntity(t)
	e.Lat = 91
	if err := ValidateEntity(e); err == nil {
		t.Fatal("ValidateEntity(lat=91) = nil, want error")
	}
}

func TestValidateRecommendation_RequiresEvidence(t *testing.T) {
	r := &Recommendation{
		Status:             RecStatusPending,
		ProposedActionType: "dispatchDrone",
		Confidence:         0.8,
	}
	r.ID = NewID()
	r.Source = "system:logic-svc"
	r.ObservedAt = time.Now().UTC()
	r.stamp(time.Now().UTC())

	id := "ent-1"
	r.SubjectEntityID = &id

	err := ValidateRecommendation(r)
	if err == nil {
		t.Fatal("ValidateRecommendation(no evidence) = nil, want error")
	}
	if !strings.Contains(err.Error(), "evidence_refs") {
		t.Errorf("expected V-8 violation, got %q", err)
	}
}

func TestValidateRecommendation_RequiresSubjectV9(t *testing.T) {
	r := &Recommendation{
		Status:             RecStatusPending,
		ProposedActionType: "dispatchDrone",
		Confidence:         0.8,
		EvidenceRefs:       []string{"ent-1"},
	}
	r.ID = NewID()
	r.Source = "system:logic-svc"
	r.ObservedAt = time.Now().UTC()
	r.stamp(time.Now().UTC())

	err := ValidateRecommendation(r)
	if err == nil {
		t.Fatal("ValidateRecommendation(no subject) = nil, want V-9 error")
	}
	if !strings.Contains(err.Error(), "V-9") {
		t.Errorf("expected V-9 violation, got %q", err)
	}
}

func TestValidateUnit_RequiresCallsign(t *testing.T) {
	u := &Unit{
		Subtype: UnitSubtypeDrone,
		Status:  UnitStatusIdle,
		Lat:     0,
		Lon:     0,
	}
	u.ID = NewID()
	u.Source = "ingest:test"
	u.ObservedAt = time.Now().UTC()
	u.stamp(time.Now().UTC())

	if err := ValidateUnit(u); err == nil {
		t.Fatal("ValidateUnit(empty callsign) = nil, want error")
	}
}

func TestPolygon_IsClosed(t *testing.T) {
	open := Polygon{{0, 0}, {0, 1}, {1, 1}, {1, 0}}
	if open.IsClosed() {
		t.Errorf("open polygon reported as closed")
	}
	closed := Polygon{{0, 0}, {0, 1}, {1, 1}, {1, 0}, {0, 0}}
	if !closed.IsClosed() {
		t.Errorf("closed polygon reported as open")
	}
}

func TestVersionFromTime_IsNanos(t *testing.T) {
	t0 := time.Unix(1714659000, 123456789).UTC()
	got := VersionFromTime(t0)
	want := uint64(1714659000_123456789)
	if got != want {
		t.Errorf("VersionFromTime(%v) = %d, want %d", t0, got, want)
	}
}

func TestNewID_Unique(t *testing.T) {
	seen := map[string]bool{}
	for range 100 {
		id := NewID()
		if seen[id] {
			t.Fatalf("NewID returned duplicate %q", id)
		}
		seen[id] = true
	}
}
