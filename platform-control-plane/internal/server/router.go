package server

import (
	"net/http"

	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/devices"
	"github.com/nsh-2026/platform-control-plane/internal/health"
)

// NewRouter creates the HTTP handler with all routes wired.
func NewRouter(h *health.Handler, d *devices.Handler, log *zap.Logger) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", h.HandleHealth)
	mux.HandleFunc("GET /api/v1/devices", d.HandleList)
	mux.HandleFunc("GET /api/v1/devices/{device_id}", d.HandleGet)
	mux.HandleFunc("PATCH /api/v1/devices/{device_id}", d.HandlePatch)

	_ = log
	return mux
}
