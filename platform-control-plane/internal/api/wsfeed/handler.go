// Package wsfeed exposes GET /api/v1/feed as a Server-Sent Events stream
// of ChangelogEvents. Subscribes to the in-process bus and fans out to
// every connected client.
//
// Per UI ADR 0002 §13 (Runtime architecture). Replaces UI-side polling
// of /api/v1/changelog for the live demo path.
//
// SSE was chosen over WebSocket because the feed is unidirectional
// (server → UI), needs no framing, and survives proxy buffering with a
// keepalive comment every 15s.
package wsfeed

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/bus"
)

// keepaliveInterval bounds how long a quiet stream goes without bytes.
// Browsers + most proxies drop idle connections after ~30-60s; 15s is safe.
const keepaliveInterval = 15 * time.Second

// Handler serves the SSE feed.
type Handler struct {
	bus bus.Bus
	log *zap.Logger
}

// New creates a Handler that subscribes to b on each request.
func New(b bus.Bus, log *zap.Logger) *Handler {
	return &Handler{bus: b, log: log}
}

// HandleSSE upgrades the request to an SSE stream and writes one
// "data: {...}\n\n" frame per ChangelogEvent. Closes when the client
// disconnects (request context cancelled).
func (h *Handler) HandleSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // disable nginx buffering
	w.WriteHeader(http.StatusOK)

	// Each request gets its own subscription. Buffer 64 absorbs short bursts;
	// fall-behind clients silently miss events (CH is the durable record).
	events := h.bus.Subscribe(64)

	// Write a comment immediately so curl/browsers see the connection live.
	if _, err := fmt.Fprintf(w, ": ok\n\n"); err != nil {
		return
	}
	flusher.Flush()

	keepalive := time.NewTicker(keepaliveInterval)
	defer keepalive.Stop()

	ctx := r.Context()

	for {
		select {
		case <-ctx.Done():
			return
		case <-keepalive.C:
			// Comment frame; ignored by EventSource but resets idle timers.
			if _, err := fmt.Fprintf(w, ": ka\n\n"); err != nil {
				return
			}
			flusher.Flush()
		case ev, ok := <-events:
			if !ok {
				return
			}
			payload, err := json.Marshal(ev)
			if err != nil {
				h.log.Warn("wsfeed: marshal failed", zap.Error(err))
				continue
			}
			if _, err := fmt.Fprintf(w, "event: changelog\ndata: %s\n\n", payload); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}
