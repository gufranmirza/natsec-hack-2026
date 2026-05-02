// Package health serves liveness and readiness checks.
package health

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/clickhouse"
)

// Response is returned by GET /api/v1/health.
type Response struct {
	Status     string `json:"status"`
	ClickHouse string `json:"clickhouse"`
}

// Handler serves health checks.
type Handler struct {
	conn *clickhouse.Conn
	log  *zap.Logger
}

// New creates a Handler.
func New(conn *clickhouse.Conn, log *zap.Logger) *Handler {
	return &Handler{conn: conn, log: log}
}

// HandleHealth returns 200 if ClickHouse is reachable, 503 otherwise.
func (h *Handler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	resp := Response{Status: "ok", ClickHouse: "ok"}
	status := http.StatusOK

	if err := h.conn.Ping(ctx); err != nil {
		h.log.Warn("clickhouse ping failed", zap.Error(err))
		resp.Status = "degraded"
		resp.ClickHouse = "unavailable"
		status = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(resp)
}
