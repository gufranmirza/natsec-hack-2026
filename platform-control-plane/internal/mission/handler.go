package mission

import (
	"encoding/json"
	"net/http"

	"go.uber.org/zap"
)

// Handler exposes the mission simulation API.
type Handler struct {
	store *Store
	log   *zap.Logger
}

// NewHandler creates a mission API handler.
func NewHandler(store *Store, log *zap.Logger) *Handler {
	return &Handler{store: store, log: log}
}

// HandleSnapshot serves GET /api/v1/mission/snapshot.
func (h *Handler) HandleSnapshot(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, h.store.Snapshot())
}

// HandleEvents serves GET /api/v1/mission/events.
func (h *Handler) HandleEvents(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, h.store.Events())
}

// HandleRecommendations serves GET /api/v1/recommendations.
func (h *Handler) HandleRecommendations(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, h.store.Recommendations())
}

// HandleScenarioAdvance serves POST /api/v1/scenario/advance.
func (h *Handler) HandleScenarioAdvance(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, h.store.AdvanceScenario())
}

// HandleScenarioReset serves POST /api/v1/scenario/reset.
func (h *Handler) HandleScenarioReset(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, h.store.ResetScenario())
}

// HandleCopilotAsk serves POST /api/v1/copilot/ask.
func (h *Handler) HandleCopilotAsk(w http.ResponseWriter, r *http.Request) {
	var req CopilotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid copilot payload")
		return
	}

	writeJSON(w, http.StatusOK, h.store.AnswerCopilot(req.Question))
}

// HandleDroneCommand serves POST /api/v1/drone-commands.
func (h *Handler) HandleDroneCommand(w http.ResponseWriter, r *http.Request) {
	var req DroneCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid command payload")
		return
	}

	snapshot, err := h.store.ApplyDroneCommand(req)
	if err != nil {
		h.log.Warn("drone command rejected", zap.Error(err))
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, snapshot)
}

// HandleCommsToggle serves POST /api/v1/comms/toggle.
func (h *Handler) HandleCommsToggle(w http.ResponseWriter, r *http.Request) {
	var req CommsToggleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid comms payload")
		return
	}

	writeJSON(w, http.StatusOK, h.store.SetCommsDegraded(req.Degraded))
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
