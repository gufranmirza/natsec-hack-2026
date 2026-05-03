package server

import (
	"net/http"

	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/api/agent"
	"github.com/nsh-2026/platform-control-plane/internal/api/ingest"
	"github.com/nsh-2026/platform-control-plane/internal/api/read"
	"github.com/nsh-2026/platform-control-plane/internal/api/wsfeed"
	"github.com/nsh-2026/platform-control-plane/internal/health"
)

// Routes bundles every handler the router needs.
type Routes struct {
	Health *health.Handler
	Ingest *ingest.Handler
	Read   *read.Handler
	Feed   *wsfeed.Handler
	Agent  *agent.Handler // optional — nil if Azure OpenAI not configured
}

// CORSConfig drives the response of the CORS middleware. Empty AllowOrigin
// falls back to "*" (dev). See ADR 0003 §9.
type CORSConfig struct {
	AllowOrigin string
}

// NewRouter creates the HTTP handler with all routes wired.
func NewRouter(routes Routes, cors CORSConfig, log *zap.Logger) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", routes.Health.HandleHealth)

	// ADR 0003 — typed ingest. Nine routes, one per Object Type.
	mux.HandleFunc("POST /api/v1/ingest/entities", routes.Ingest.HandleEntities)
	mux.HandleFunc("POST /api/v1/ingest/events", routes.Ingest.HandleEvents)
	mux.HandleFunc("POST /api/v1/ingest/reports", routes.Ingest.HandleReports)
	mux.HandleFunc("POST /api/v1/ingest/units", routes.Ingest.HandleUnits)
	mux.HandleFunc("POST /api/v1/ingest/recommendations", routes.Ingest.HandleRecommendations)
	mux.HandleFunc("POST /api/v1/ingest/mission-objectives", routes.Ingest.HandleMissionObjectives)
	mux.HandleFunc("POST /api/v1/ingest/plans", routes.Ingest.HandlePlans)
	mux.HandleFunc("POST /api/v1/ingest/missions", routes.Ingest.HandleMissions)
	mux.HandleFunc("POST /api/v1/ingest/tasking-orders", routes.Ingest.HandleTaskingOrders)

	// ADR 0003 — typed reads.
	mux.HandleFunc("GET /api/v1/objects/{type}/{id}", routes.Read.HandleGet)
	mux.HandleFunc("GET /api/v1/objects/{type}/{id}/linked/{link_type}", routes.Read.HandleLinked)
	mux.HandleFunc("GET /api/v1/objects/{type}", routes.Read.HandleList)
	mux.HandleFunc("GET /api/v1/changelog", routes.Read.HandleChangelog)
	mux.HandleFunc("GET /api/v1/search", routes.Read.HandleSearch)

	// UI ADR 0002 §13 — SSE fan-out of the changelog bus for live UI streaming.
	if routes.Feed != nil {
		mux.HandleFunc("GET /api/v1/feed", routes.Feed.HandleSSE)
	}

	// Operator-facing agent loop. Only mounted when Azure OpenAI is configured.
	if routes.Agent != nil {
		mux.HandleFunc("POST /api/v1/operator/query", routes.Agent.HandleQuery)
		mux.HandleFunc("POST /api/v1/recommendations/{id}/decision", routes.Agent.HandleDecision)
	} else {
		mux.HandleFunc("POST /api/v1/operator/query", agentNotConfigured)
		mux.HandleFunc("POST /api/v1/recommendations/{id}/decision", agentNotConfigured)
	}

	_ = log
	return withCORS(mux, cors)
}

// agentNotConfigured is the placeholder responder when no Azure OpenAI
// credentials are present. Always 503 — operator UI knows how to surface this.
func agentNotConfigured(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusServiceUnavailable)
	_, _ = w.Write([]byte(`{"error":"agent disabled: AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY / AZURE_OPENAI_DEPLOYMENT not set"}`))
}

func withCORS(next http.Handler, cfg CORSConfig) http.Handler {
	origin := cfg.AllowOrigin
	if origin == "" {
		origin = "*"
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Encoding")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
