// Package mission serves the hackathon mission simulation API.
package mission

// Position is a coarse tactical position used by the demo map.
type Position struct {
	Lat  float64 `json:"lat"`
	Lon  float64 `json:"lon"`
	Grid string  `json:"grid"`
	X    int     `json:"x"`
	Y    int     `json:"y"`
}

// DroneAsset describes one simulated autonomous asset.
type DroneAsset struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Callsign     string   `json:"callsign"`
	Status       string   `json:"status"`
	Task         string   `json:"task"`
	Battery      int      `json:"battery"`
	Payload      string   `json:"payload"`
	LinkStatus   string   `json:"link_status"`
	AutonomyMode string   `json:"autonomy_mode"`
	SpeedKts     int      `json:"speed_kts"`
	Heading      int      `json:"heading"`
	Position     Position `json:"position"`
}

// MissionEvent is a fused event from reports, RF, sensors, telemetry, or audit.
type MissionEvent struct {
	ID       string   `json:"id"`
	Time     string   `json:"time"`
	Delta    string   `json:"delta"`
	Kind     string   `json:"kind"`
	Verb     string   `json:"verb"`
	Body     string   `json:"body"`
	Source   string   `json:"source"`
	Tone     string   `json:"tone"`
	Evidence []string `json:"evidence,omitempty"`
}

// Recommendation is an explainable human-in-the-loop task proposal.
type Recommendation struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	ProposedCommand string   `json:"proposed_command"`
	AssetID         string   `json:"asset_id"`
	TargetGrid      string   `json:"target_grid"`
	Confidence      float64  `json:"confidence"`
	ETA             string   `json:"eta"`
	Status          string   `json:"status"`
	Why             []string `json:"why"`
	Evidence        []string `json:"evidence"`
}

// MissionSnapshot is the complete demo state needed by the UI.
type MissionSnapshot struct {
	MissionName     string           `json:"mission_name"`
	MissionTime     string           `json:"mission_time"`
	ScenarioStep    int              `json:"scenario_step"`
	ScenarioLabel   string           `json:"scenario_label"`
	EdgeMode        string           `json:"edge_mode"`
	CloudLink       string           `json:"cloud_link"`
	CommsLatencyMS  int              `json:"comms_latency_ms"`
	LocalQueueCount int              `json:"local_queue_count"`
	CommanderLine   string           `json:"commander_line"`
	Drones          []DroneAsset     `json:"drones"`
	Events          []MissionEvent   `json:"events"`
	Recommendations []Recommendation `json:"recommendations"`
	SensorFeed      SensorFeed       `json:"sensor_feed"`
	CopilotAnswer   CopilotAnswer    `json:"copilot_answer"`
}

// DroneCommandRequest is posted when a commander approves a task.
type DroneCommandRequest struct {
	RecommendationID string `json:"recommendation_id"`
	AssetID          string `json:"asset_id"`
	Command          string `json:"command"`
	TargetGrid       string `json:"target_grid"`
}

// CommsToggleRequest flips the edge/cloud link for the demo.
type CommsToggleRequest struct {
	Degraded bool `json:"degraded"`
}

// SensorFeed summarizes the selected drone's simulated payload view.
type SensorFeed struct {
	AssetID        string   `json:"asset_id"`
	Mode           string   `json:"mode"`
	Title          string   `json:"title"`
	Signal         string   `json:"signal"`
	Confidence     float64  `json:"confidence"`
	Classification string   `json:"classification"`
	Overlays       []string `json:"overlays"`
}

// CopilotRequest asks a grounded deterministic mission question.
type CopilotRequest struct {
	Question string `json:"question"`
}

// CopilotAnswer is a grounded mission-specific response.
type CopilotAnswer struct {
	Question string   `json:"question"`
	Answer   string   `json:"answer"`
	Citations []string `json:"citations"`
}
