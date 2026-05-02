package mission

import (
	"fmt"
	"strings"
	"sync"
)

// Store owns the mutable in-memory simulation state.
type Store struct {
	mu       sync.Mutex
	snapshot MissionSnapshot
}

// NewStore creates the default drone-first demo scenario.
func NewStore() *Store {
	return &Store{snapshot: seedSnapshot()}
}

// Snapshot returns a copy of the current mission state.
func (s *Store) Snapshot() MissionSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	return cloneSnapshot(s.snapshot)
}

// Events returns a copy of the event feed.
func (s *Store) Events() []MissionEvent {
	s.mu.Lock()
	defer s.mu.Unlock()

	return append([]MissionEvent(nil), s.snapshot.Events...)
}

// Recommendations returns a copy of current recommendations.
func (s *Store) Recommendations() []Recommendation {
	s.mu.Lock()
	defer s.mu.Unlock()

	return append([]Recommendation(nil), s.snapshot.Recommendations...)
}

// AdvanceScenario moves the scripted demo through the golden mission beats.
func (s *Store) AdvanceScenario() MissionSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	next := s.snapshot.ScenarioStep + 1
	if next > 6 {
		next = 6
	}
	s.snapshot.ScenarioStep = next

	switch next {
	case 1:
		s.snapshot.ScenarioLabel = "RF anomaly"
		s.snapshot.CommanderLine = "Edge RF sensor detects a burst near the convoy route."
		s.prependEvent(MissionEvent{
			ID:     "evt-rf-anomaly",
			Time:   "14:23:01",
			Delta:  "46s ago",
			Kind:   "rf",
			Verb:   "Detected.",
			Body:   "RF burst at grid 35S-QR-417 overlaps the convoy route and a gap in ROOK-1 visual coverage.",
			Source: "Edge RF sensor - local inference",
			Tone:   "threat",
			Evidence: []string{
				"RF bearing 071",
				"Signal family matched 0.82",
			},
		})
		s.snapshot.SensorFeed = sensorFeed("rf", "ROOK-1")
	case 2:
		s.snapshot.ScenarioLabel = "Corroborated"
		s.snapshot.CommanderLine = "Radio, RF, and EO uncertainty converge on the same grid."
		s.prependEvent(MissionEvent{
			ID:     "evt-radio-grid",
			Time:   "14:21:44",
			Delta:  "2m 03s ago",
			Kind:   "radio",
			Verb:   "Reported.",
			Body:   "BRAVO-3 reports two figures moving near the same grid; no positive identification.",
			Source: "Voice - BRAVO-3",
			Tone:   "amber",
		})
		s.prependEvent(MissionEvent{
			ID:     "evt-video-gap",
			Time:   "14:20:12",
			Delta:  "3m 35s ago",
			Kind:   "video",
			Verb:   "Lost.",
			Body:   "ROOK-1 onboard video confidence dropped below threshold while crossing terrain shadow.",
			Source: "ROOK-1 - EO/IR",
			Tone:   "amber",
		})
	case 3:
		s.snapshot.ScenarioLabel = "Recommended"
		s.snapshot.CommanderLine = "The hybrid AI layer proposes a supervised drone task with cited evidence."
		s.ensureRecommendation(recommendRook1())
		s.ensureRecommendation(recommendRook2())
	case 4:
		s.snapshot.ScenarioLabel = "Human approved"
		_, _ = s.applyDroneCommandLocked(DroneCommandRequest{RecommendationID: "rec-rf-overwatch"})
	case 5:
		s.snapshot.ScenarioLabel = "Cloud denied"
		s.setCommsDegradedLocked(true)
	case 6:
		s.snapshot.ScenarioLabel = "Edge continues"
		s.snapshot.CommanderLine = "The edge node keeps fusing, tasking, and queuing actions while disconnected."
		s.ensureRecommendation(Recommendation{
			ID:              "rec-edge-queue",
			Title:           "Keep ROOK-2 in relay orbit until cloud sync returns.",
			ProposedCommand: "Hold ROOK-2 as edge relay for ROOK-1 tasking",
			AssetID:         "rook-2",
			TargetGrid:      "35S-QR-404",
			Confidence:      0.74,
			ETA:             "Already within relay basket",
			Status:          "pending",
			Why: []string{
				"Cloud bridge is denied",
				"ROOK-2 can preserve local command coverage",
				"Action queue will replay on reconnect",
			},
			Evidence: []string{"evt-comms-denied", "evt-audit-rook-1-tasked"},
		})
	}

	return cloneSnapshot(s.snapshot)
}

// ResetScenario restores the quiet opening state.
func (s *Store) ResetScenario() MissionSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.snapshot = seedOpeningSnapshot()
	return cloneSnapshot(s.snapshot)
}

// AnswerCopilot returns a deterministic grounded response for demo questions.
func (s *Store) AnswerCopilot(question string) MissionSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.snapshot.CopilotAnswer = answerForQuestion(question)
	return cloneSnapshot(s.snapshot)
}

// ApplyDroneCommand mutates a drone after human approval and writes an audit event.
func (s *Store) ApplyDroneCommand(req DroneCommandRequest) (MissionSnapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	snapshot, err := s.applyDroneCommandLocked(req)
	if err != nil {
		return MissionSnapshot{}, err
	}
	return snapshot, nil
}

func (s *Store) applyDroneCommandLocked(req DroneCommandRequest) (MissionSnapshot, error) {
	assetID := req.AssetID
	if assetID == "" {
		for _, rec := range s.snapshot.Recommendations {
			if rec.ID == req.RecommendationID {
				assetID = rec.AssetID
				req.Command = firstNonEmpty(req.Command, rec.ProposedCommand)
				req.TargetGrid = firstNonEmpty(req.TargetGrid, rec.TargetGrid)
				break
			}
		}
	}
	if assetID == "" {
		return MissionSnapshot{}, fmt.Errorf("asset_id or recommendation_id is required")
	}

	found := false
	for i := range s.snapshot.Drones {
		if s.snapshot.Drones[i].ID != assetID {
			continue
		}
		found = true
		s.snapshot.Drones[i].Status = "tasking"
		s.snapshot.Drones[i].Task = firstNonEmpty(req.Command, "Investigate grid "+req.TargetGrid)
		s.snapshot.Drones[i].LinkStatus = "edge-local"
		s.snapshot.Drones[i].AutonomyMode = "supervised"
		s.snapshot.Drones[i].Heading = 71
		s.snapshot.Drones[i].SpeedKts = 96
		s.snapshot.Drones[i].Battery -= 3
		s.snapshot.Drones[i].Position = Position{
			Lat:  38.732,
			Lon:  23.552,
			Grid: firstNonEmpty(req.TargetGrid, "35S-QR-417"),
			X:    commandX(assetID),
			Y:    commandY(assetID),
		}
	}
	if !found {
		return MissionSnapshot{}, fmt.Errorf("drone %q not found", assetID)
	}

	for i := range s.snapshot.Recommendations {
		if s.snapshot.Recommendations[i].ID == req.RecommendationID {
			s.snapshot.Recommendations[i].Status = "approved"
		}
	}

	s.prependEvent(MissionEvent{
		ID:     "evt-audit-" + assetID + "-tasked",
		Time:   "14:24:18",
		Delta:  "now",
		Kind:   "audit",
		Verb:   "Approved.",
		Body:   fmt.Sprintf("Commander approved %s for %s. Asset continues under edge-local supervised autonomy.", firstNonEmpty(req.Command, "drone task"), strings.ToUpper(assetID)),
		Source: "Action audit - human in loop",
		Tone:   "friendly",
		Evidence: []string{
			firstNonEmpty(req.RecommendationID, "manual-command"),
			"evt-rf-anomaly",
			"evt-radio-grid",
		},
	})

	s.snapshot.ScenarioStep = maxInt(s.snapshot.ScenarioStep, 4)
	s.snapshot.ScenarioLabel = "Human approved"
	s.snapshot.SensorFeed = sensorFeed("on-station", assetID)
	if s.snapshot.EdgeMode == "degraded" {
		s.snapshot.LocalQueueCount++
	}

	return cloneSnapshot(s.snapshot), nil
}

// SetCommsDegraded flips the demo into connected or degraded edge mode.
func (s *Store) SetCommsDegraded(degraded bool) MissionSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.setCommsDegradedLocked(degraded)
	return cloneSnapshot(s.snapshot)
}

func (s *Store) setCommsDegradedLocked(degraded bool) {
	if degraded {
		s.snapshot.EdgeMode = "degraded"
		s.snapshot.CloudLink = "denied"
		s.snapshot.CommsLatencyMS = 0
		s.snapshot.LocalQueueCount = maxInt(s.snapshot.LocalQueueCount, 1)
		s.snapshot.ScenarioStep = maxInt(s.snapshot.ScenarioStep, 5)
		s.snapshot.ScenarioLabel = "Cloud denied"
		s.snapshot.CommanderLine = "Cloud denied. Edge node continues local fusion, recommendations, and drone tasking."
		s.prependEvent(MissionEvent{
			ID:     "evt-comms-denied",
			Time:   "14:24:27",
			Delta:  "now",
			Kind:   "comms",
			Verb:   "Degraded.",
			Body:   "Cloud bridge dropped. Mission state remains available from the edge node; command queue is durable until reconnect.",
			Source: "Edge node - comms monitor",
			Tone:   "amber",
		})
	} else {
		s.snapshot.EdgeMode = "synced"
		s.snapshot.CloudLink = "healthy"
		s.snapshot.CommsLatencyMS = 92
		s.snapshot.LocalQueueCount = 0
		s.snapshot.ScenarioLabel = "Reconnected"
		s.snapshot.CommanderLine = "Centralized command, decentralized execution."
		s.prependEvent(MissionEvent{
			ID:     "evt-comms-restored",
			Time:   "14:25:03",
			Delta:  "now",
			Kind:   "comms",
			Verb:   "Restored.",
			Body:   "Cloud bridge restored. Edge action log replayed without conflict.",
			Source: "Edge node - sync queue",
			Tone:   "friendly",
		})
	}
}

func (s *Store) prependEvent(e MissionEvent) {
	for _, existing := range s.snapshot.Events {
		if existing.ID == e.ID {
			return
		}
	}
	s.snapshot.Events = append([]MissionEvent{e}, s.snapshot.Events...)
}

func (s *Store) ensureRecommendation(rec Recommendation) {
	for _, existing := range s.snapshot.Recommendations {
		if existing.ID == rec.ID {
			return
		}
	}
	s.snapshot.Recommendations = append([]Recommendation{rec}, s.snapshot.Recommendations...)
}

func seedSnapshot() MissionSnapshot {
	return MissionSnapshot{
		MissionName:    "Silent Eye",
		MissionTime:    "T+02:14:09",
		ScenarioStep:   3,
		ScenarioLabel:  "Recommended",
		EdgeMode:       "synced",
		CloudLink:      "healthy",
		CommsLatencyMS: 92,
		CommanderLine:  "We compress the OODA loop by turning sensor overload into human-approved autonomous drone tasking.",
		Drones: []DroneAsset{
			{
				ID:           "rook-1",
				Name:         "ROOK-1",
				Callsign:     "ROOK-1",
				Status:       "ready",
				Task:         "Route scan east of convoy",
				Battery:      78,
				Payload:      "EO/IR + RF",
				LinkStatus:   "synced",
				AutonomyMode: "hold for approval",
				SpeedKts:     72,
				Heading:      88,
				Position:     Position{Lat: 38.724, Lon: 23.515, Grid: "35S-QR-381", X: 570, Y: 340},
			},
			{
				ID:           "rook-2",
				Name:         "ROOK-2",
				Callsign:     "ROOK-2",
				Status:       "available",
				Task:         "Perimeter orbit",
				Battery:      84,
				Payload:      "EO wide",
				LinkStatus:   "synced",
				AutonomyMode: "supervised",
				SpeedKts:     88,
				Heading:      215,
				Position:     Position{Lat: 38.691, Lon: 23.463, Grid: "35S-QR-369", X: 420, Y: 480},
			},
			{
				ID:           "rook-3",
				Name:         "ROOK-3",
				Callsign:     "ROOK-3",
				Status:       "charging",
				Task:         "Reserve launch slot",
				Battery:      41,
				Payload:      "relay",
				LinkStatus:   "local",
				AutonomyMode: "standby",
				SpeedKts:     0,
				Heading:      0,
				Position:     Position{Lat: 38.705, Lon: 23.492, Grid: "35S-QR-372", X: 500, Y: 420},
			},
		},
		Events: []MissionEvent{
			{
				ID:     "evt-rf-anomaly",
				Time:   "14:23:01",
				Delta:  "46s ago",
				Kind:   "rf",
				Verb:   "Detected.",
				Body:   "RF burst at grid 35S-QR-417 overlaps the convoy route and a gap in ROOK-1 visual coverage.",
				Source: "Edge RF sensor - local inference",
				Tone:   "threat",
				Evidence: []string{
					"RF bearing 071",
					"Signal family matched 0.82",
				},
			},
			{
				ID:     "evt-radio-grid",
				Time:   "14:21:44",
				Delta:  "2m 03s ago",
				Kind:   "radio",
				Verb:   "Reported.",
				Body:   "BRAVO-3 reports two figures moving near the same grid; no positive identification.",
				Source: "Voice - BRAVO-3",
				Tone:   "amber",
			},
			{
				ID:     "evt-video-gap",
				Time:   "14:20:12",
				Delta:  "3m 35s ago",
				Kind:   "video",
				Verb:   "Lost.",
				Body:   "ROOK-1 onboard video confidence dropped below threshold while crossing terrain shadow.",
				Source: "ROOK-1 - EO/IR",
				Tone:   "amber",
			},
			{
				ID:     "evt-rook2-ready",
				Time:   "14:18:30",
				Delta:  "5m 17s ago",
				Kind:   "telemetry",
				Verb:   "Ready.",
				Body:   "ROOK-2 returned to perimeter orbit with 84 percent battery and clear payload status.",
				Source: "ROOK-2 - telemetry",
				Tone:   "friendly",
			},
		},
		Recommendations: []Recommendation{recommendRook1(), recommendRook2()},
		SensorFeed:      sensorFeed("rf", "rook-1"),
		CopilotAnswer: answerForQuestion(
			"Why are you recommending ROOK-1?",
		),
	}
}

func seedOpeningSnapshot() MissionSnapshot {
	return MissionSnapshot{
		MissionName:    "Silent Eye",
		MissionTime:    "T+02:11:00",
		ScenarioStep:   0,
		ScenarioLabel:  "Calm",
		EdgeMode:       "synced",
		CloudLink:      "healthy",
		CommsLatencyMS: 88,
		CommanderLine:  "Mission steady. Edge node is watching drone telemetry, unit positions, and local RF.",
		Drones:         seedSnapshot().Drones,
		Events: []MissionEvent{
			{
				ID:     "evt-rook2-ready",
				Time:   "14:18:30",
				Delta:  "5m 17s ago",
				Kind:   "telemetry",
				Verb:   "Ready.",
				Body:   "ROOK-2 returned to perimeter orbit with 84 percent battery and clear payload status.",
				Source: "ROOK-2 - telemetry",
				Tone:   "friendly",
			},
		},
		Recommendations: []Recommendation{},
		SensorFeed:      sensorFeed("clear", "rook-1"),
		CopilotAnswer:   answerForQuestion("What changed in the last 5 minutes?"),
	}
}

func recommendRook1() Recommendation {
	return Recommendation{
		ID:              "rec-rf-overwatch",
		Title:           "Retask ROOK-1 to overwatch 35S-QR-417.",
		ProposedCommand: "Investigate RF anomaly at grid 35S-QR-417",
		AssetID:         "rook-1",
		TargetGrid:      "35S-QR-417",
		Confidence:      0.86,
		ETA:             "On-station in 3m 40s - fuel margin +21%",
		Status:          "pending",
		Why: []string{
			"RF anomaly aligns with convoy route",
			"Radio report in same grid",
			"ROOK-1 has EO/IR and RF payload",
		},
		Evidence: []string{"evt-rf-anomaly", "evt-radio-grid", "evt-video-gap"},
	}
}

func recommendRook2() Recommendation {
	return Recommendation{
		ID:              "rec-swarm-box",
		Title:           "Stage ROOK-2 as relay and visual confirm.",
		ProposedCommand: "Move ROOK-2 to relay orbit south of 35S-QR-417",
		AssetID:         "rook-2",
		TargetGrid:      "35S-QR-404",
		Confidence:      0.68,
		ETA:             "Relay orbit in 5m 10s",
		Status:          "pending",
		Why: []string{
			"Maintains coverage if cloud link drops",
			"Separates sensor angle from ROOK-1",
		},
		Evidence: []string{"evt-rf-anomaly", "evt-rook2-ready"},
	}
}

func sensorFeed(mode string, assetID string) SensorFeed {
	switch mode {
	case "clear":
		return SensorFeed{AssetID: assetID, Mode: "EO", Title: "Route scan nominal", Signal: "Clean", Confidence: 0.31, Classification: "No correlated threat", Overlays: []string{"Convoy axis clear", "RF quiet", "EO confidence 0.91"}}
	case "on-station":
		return SensorFeed{AssetID: assetID, Mode: "EO/IR + RF", Title: "On station over 35S-QR-417", Signal: "RF source localized", Confidence: 0.89, Classification: "Probable handheld emitter", Overlays: []string{"Heat trace in terrain shadow", "RF bearing stable", "Human approval logged"}}
	default:
		return SensorFeed{AssetID: assetID, Mode: "RF + EO/IR", Title: "Terrain shadow with RF burst", Signal: "Intermittent burst", Confidence: 0.82, Classification: "Unidentified emitter", Overlays: []string{"RF bearing 071", "EO confidence degraded", "Radio report nearby"}}
	}
}

func answerForQuestion(question string) CopilotAnswer {
	q := strings.ToLower(question)
	if strings.Contains(q, "why") || strings.Contains(q, "rook-1") {
		return CopilotAnswer{Question: question, Answer: "ROOK-1 is the best first task because it already carries EO/IR plus RF, is closest to 35S-QR-417, and can close the video-confidence gap without waiting for cloud support.", Citations: []string{"rec-rf-overwatch", "evt-rf-anomaly", "evt-video-gap"}}
	}
	if strings.Contains(q, "cloud") || strings.Contains(q, "drop") || strings.Contains(q, "edge") {
		return CopilotAnswer{Question: question, Answer: "If cloud comms drop, the edge node keeps the mission snapshot, recommendations, and drone command queue local. Approved actions are audited and replayed when the bridge restores.", Citations: []string{"evt-comms-denied", "evt-audit-rook-1-tasked"}}
	}
	if strings.Contains(q, "asset") || strings.Contains(q, "cover") {
		return CopilotAnswer{Question: question, Answer: "ROOK-1 can investigate directly; ROOK-2 should hold a relay/confirmation orbit; ROOK-3 is a reserve relay asset with low battery.", Citations: []string{"rec-rf-overwatch", "rec-swarm-box"}}
	}
	return CopilotAnswer{Question: question, Answer: "In the last five minutes the system fused an RF burst, a nearby radio report, and degraded ROOK-1 video confidence into one recommended supervised drone task.", Citations: []string{"evt-rf-anomaly", "evt-radio-grid", "evt-video-gap"}}
}

func cloneSnapshot(in MissionSnapshot) MissionSnapshot {
	out := in
	out.Drones = append([]DroneAsset(nil), in.Drones...)
	out.Events = append([]MissionEvent(nil), in.Events...)
	out.Recommendations = append([]Recommendation(nil), in.Recommendations...)
	return out
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func commandX(assetID string) int {
	if assetID == "rook-2" {
		return 585
	}
	return 640
}

func commandY(assetID string) int {
	if assetID == "rook-2" {
		return 380
	}
	return 315
}

func maxInt(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
