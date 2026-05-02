package server

import (
	"net/http"

	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/health"
	"github.com/nsh-2026/platform-control-plane/internal/mission"
)

// NewRouter creates the HTTP handler with all routes wired.
func NewRouter(h *health.Handler, m *mission.Handler, log *zap.Logger) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", h.HandleHealth)
	mux.HandleFunc("GET /api/v1/mission/snapshot", m.HandleSnapshot)
	mux.HandleFunc("GET /api/v1/mission/events", m.HandleEvents)
	mux.HandleFunc("GET /api/v1/recommendations", m.HandleRecommendations)
	mux.HandleFunc("POST /api/v1/scenario/advance", m.HandleScenarioAdvance)
	mux.HandleFunc("POST /api/v1/scenario/reset", m.HandleScenarioReset)
	mux.HandleFunc("POST /api/v1/copilot/ask", m.HandleCopilotAsk)
	mux.HandleFunc("POST /api/v1/drone-commands", m.HandleDroneCommand)
	mux.HandleFunc("POST /api/v1/comms/toggle", m.HandleCommsToggle)

	_ = log
	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
