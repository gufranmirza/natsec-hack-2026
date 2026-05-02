package ingest

import (
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestDeriveID_PresetWins(t *testing.T) {
	preset := "01927e73-aaaa-7000-8000-000000000001"
	got := deriveID(preset, "ingest:opensky", "A48119")
	if got != preset {
		t.Errorf("deriveID(preset) = %q, want %q", got, preset)
	}
}

// I-004: when no preset id, UUIDv5 must be deterministic on (_source, _source_ref).
// This guards against accidental namespace changes — see ADR 0003 §9.
func TestDeriveID_DeterministicFromSourceRef(t *testing.T) {
	a := deriveID("", "ingest:opensky", "A48119")
	b := deriveID("", "ingest:opensky", "A48119")
	if a != b {
		t.Errorf("deriveID is not deterministic: %q vs %q", a, b)
	}

	c := deriveID("", "ingest:opensky", "DIFFERENT")
	if a == c {
		t.Errorf("different _source_ref produced same id: %q", a)
	}

	parsed, err := uuid.Parse(a)
	if err != nil {
		t.Fatalf("derived id is not a uuid: %v", err)
	}
	if v := parsed.Version(); v != 5 {
		t.Errorf("derived id is not UUIDv5: version=%d", v)
	}
}

func TestDeriveID_FreshV7WhenNoSourceRef(t *testing.T) {
	a := deriveID("", "ingest:gazebo", "")
	b := deriveID("", "ingest:gazebo", "")
	if a == b {
		t.Errorf("expected fresh UUIDs, got duplicate %q", a)
	}
	parsed, err := uuid.Parse(a)
	if err != nil {
		t.Fatalf("derived id is not a uuid: %v", err)
	}
	if v := parsed.Version(); v != 7 {
		t.Errorf("derived id is not UUIDv7: version=%d", v)
	}
}

// The locked ontology namespace must not drift — changing it would
// invalidate every existing _id. See ADR 0003 §9.
func TestOntologyNamespace_IsLocked(t *testing.T) {
	want := "01927e72-feed-7000-8000-000000000001"
	if got := ontologyNS.String(); got != want {
		t.Errorf("ontologyNS = %q, want %q", got, want)
	}
}

func TestExplodeErrs_NilReturnsNil(t *testing.T) {
	if got := explodeErrs(nil); got != nil {
		t.Errorf("explodeErrs(nil) = %v, want nil", got)
	}
}

func TestExplodeErrs_FormatsValidationErrors(t *testing.T) {
	out := explodeErrs(stubErr{msg: "_subtype \"Spaceship\" not allowed"})
	if len(out) != 1 || !strings.Contains(out[0], "Spaceship") {
		t.Errorf("explodeErrs got %v", out)
	}
}

type stubErr struct{ msg string }

func (e stubErr) Error() string { return e.msg }
