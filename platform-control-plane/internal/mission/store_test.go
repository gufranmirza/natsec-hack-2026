package mission

import "testing"

func TestApplyDroneCommandUpdatesAssetAndAudits(t *testing.T) {
	store := NewStore()

	snapshot, err := store.ApplyDroneCommand(DroneCommandRequest{
		RecommendationID: "rec-rf-overwatch",
	})
	if err != nil {
		t.Fatalf("ApplyDroneCommand returned error: %v", err)
	}

	if snapshot.Drones[0].Status != "tasking" {
		t.Fatalf("expected ROOK-1 tasking, got %q", snapshot.Drones[0].Status)
	}
	if snapshot.Recommendations[0].Status != "approved" {
		t.Fatalf("expected recommendation approved, got %q", snapshot.Recommendations[0].Status)
	}
	if snapshot.Events[0].Kind != "audit" {
		t.Fatalf("expected audit event first, got %q", snapshot.Events[0].Kind)
	}
}

func TestSetCommsDegradedKeepsMissionStateLocal(t *testing.T) {
	store := NewStore()

	snapshot := store.SetCommsDegraded(true)

	if snapshot.EdgeMode != "degraded" {
		t.Fatalf("expected degraded edge mode, got %q", snapshot.EdgeMode)
	}
	if snapshot.CloudLink != "denied" {
		t.Fatalf("expected denied cloud link, got %q", snapshot.CloudLink)
	}
	if len(snapshot.Drones) == 0 || len(snapshot.Recommendations) == 0 {
		t.Fatal("expected local mission state to remain available")
	}
}

func TestScenarioAdvanceBuildsGoldenPath(t *testing.T) {
	store := NewStore()

	snapshot := store.ResetScenario()
	for i := 0; i < 6; i++ {
		snapshot = store.AdvanceScenario()
	}

	if snapshot.ScenarioStep != 6 {
		t.Fatalf("expected scenario step 6, got %d", snapshot.ScenarioStep)
	}
	if snapshot.EdgeMode != "degraded" {
		t.Fatalf("expected edge mode degraded, got %q", snapshot.EdgeMode)
	}
	if snapshot.LocalQueueCount == 0 {
		t.Fatal("expected local queue to be active")
	}
	if len(snapshot.Recommendations) < 2 {
		t.Fatalf("expected recommendations, got %d", len(snapshot.Recommendations))
	}
}

func TestCopilotAnswerIsGrounded(t *testing.T) {
	store := NewStore()

	snapshot := store.AnswerCopilot("What happens if cloud comms drop?")

	if snapshot.CopilotAnswer.Answer == "" {
		t.Fatal("expected copilot answer")
	}
	if len(snapshot.CopilotAnswer.Citations) == 0 {
		t.Fatal("expected grounded citations")
	}
}
