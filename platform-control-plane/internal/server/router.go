package server

import (
	"net/http"

	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/health"
)

// NewRouter creates the HTTP handler with all routes wired.
func NewRouter(h *health.Handler, log *zap.Logger) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", h.HandleHealth)

	_ = log
	return mux
}
