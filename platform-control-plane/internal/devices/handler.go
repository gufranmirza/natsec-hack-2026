// Package devices serves the device inventory API used by the operator UI.
package devices

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
)

// Status is the lifecycle state of an enrolled edge device.
type Status string

const (
	StatusActive  Status = "active"
	StatusRevoked Status = "revoked"
	StatusDormant Status = "dormant"
)

// Device is the API representation consumed by platform-ui-app.
type Device struct {
	DeviceID     string `json:"device_id"`
	Hostname     string `json:"hostname"`
	OS           string `json:"os"`
	OSVersion    string `json:"os_version"`
	AgentVersion string `json:"agent_version"`
	Status       Status `json:"status"`
	RegisteredAt string `json:"registered_at"`
	LastSeenAt   string `json:"last_seen_at"`
	SessionCount int    `json:"session_count,omitempty"`
	EventCount24H int    `json:"event_count_24h,omitempty"`
}

// ListResponse wraps device collections in the shared UI envelope shape.
type ListResponse struct {
	Items []Device `json:"items"`
	Count int      `json:"count"`
	Total int      `json:"total"`
}

// Handler owns the in-memory device inventory for the MVP control plane.
type Handler struct {
	log     *zap.Logger
	mu      sync.RWMutex
	devices map[string]Device
	order   []string
}

// New creates a Handler with deterministic demo inventory.
func New(log *zap.Logger) *Handler {
	now := time.Now().UTC()
	devices := []Device{
		{
			DeviceID:     "edge-drone-07",
			Hostname:     "drone-7",
			OS:           "linux",
			OSVersion:    "6.6.32-edge",
			AgentVersion: "0.4.2",
			Status:       StatusActive,
			RegisteredAt: now.Add(-72 * time.Hour).Format(time.RFC3339),
			LastSeenAt:   now.Add(-2 * time.Minute).Format(time.RFC3339),
			SessionCount: 3,
			EventCount24H: 184,
		},
		{
			DeviceID:     "rf-array-02",
			Hostname:     "rf-array-2",
			OS:           "linux",
			OSVersion:    "5.15.146",
			AgentVersion: "0.4.1",
			Status:       StatusActive,
			RegisteredAt: now.Add(-96 * time.Hour).Format(time.RFC3339),
			LastSeenAt:   now.Add(-7 * time.Minute).Format(time.RFC3339),
			SessionCount: 1,
			EventCount24H: 91,
		},
		{
			DeviceID:     "relay-kit-14",
			Hostname:     "relay-kit-14",
			OS:           "linux",
			OSVersion:    "6.1.89",
			AgentVersion: "0.3.9",
			Status:       StatusDormant,
			RegisteredAt: now.Add(-14 * 24 * time.Hour).Format(time.RFC3339),
			LastSeenAt:   now.Add(-9 * time.Hour).Format(time.RFC3339),
			SessionCount: 0,
			EventCount24H: 6,
		},
	}

	h := &Handler{
		log:     log,
		devices: make(map[string]Device, len(devices)),
		order:   make([]string, 0, len(devices)),
	}
	for _, device := range devices {
		h.devices[device.DeviceID] = device
		h.order = append(h.order, device.DeviceID)
	}
	return h
}

// HandleList returns the known edge devices.
func (h *Handler) HandleList(w http.ResponseWriter, _ *http.Request) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	items := make([]Device, 0, len(h.order))
	for _, id := range h.order {
		items = append(items, h.devices[id])
	}

	writeJSON(w, http.StatusOK, ListResponse{
		Items: items,
		Count: len(items),
		Total: len(items),
	})
}

// HandleGet returns one edge device by ID.
func (h *Handler) HandleGet(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/devices/")
	if id == "" {
		writeError(w, http.StatusNotFound, "device not found")
		return
	}

	h.mu.RLock()
	device, ok := h.devices[id]
	h.mu.RUnlock()
	if !ok {
		writeError(w, http.StatusNotFound, "device not found")
		return
	}

	writeJSON(w, http.StatusOK, device)
}

// HandlePatch updates mutable device fields.
func (h *Handler) HandlePatch(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/devices/")
	if id == "" {
		writeError(w, http.StatusNotFound, "device not found")
		return
	}

	var req struct {
		Status Status `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if !validStatus(req.Status) {
		writeError(w, http.StatusBadRequest, "status must be active, revoked, or dormant")
		return
	}

	h.mu.Lock()
	device, ok := h.devices[id]
	if !ok {
		h.mu.Unlock()
		writeError(w, http.StatusNotFound, "device not found")
		return
	}
	device.Status = req.Status
	h.devices[id] = device
	h.mu.Unlock()

	h.log.Info("device status updated", zap.String("device_id", id), zap.String("status", string(req.Status)))
	writeJSON(w, http.StatusOK, device)
}

func validStatus(status Status) bool {
	return status == StatusActive || status == StatusRevoked || status == StatusDormant
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
