package devices

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.uber.org/zap"
)

func TestHandleList(t *testing.T) {
	h := New(zap.NewNop())
	req := httptest.NewRequest(http.MethodGet, "/api/v1/devices", nil)
	rec := httptest.NewRecorder()

	h.HandleList(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var resp ListResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Count != 3 || resp.Total != 3 || len(resp.Items) != 3 {
		t.Fatalf("response counts = count:%d total:%d len:%d, want 3", resp.Count, resp.Total, len(resp.Items))
	}
}

func TestHandleGetMissingDevice(t *testing.T) {
	h := New(zap.NewNop())
	req := httptest.NewRequest(http.MethodGet, "/api/v1/devices/missing", nil)
	rec := httptest.NewRecorder()

	h.HandleGet(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestHandlePatchUpdatesStatus(t *testing.T) {
	h := New(zap.NewNop())
	req := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/devices/edge-drone-07",
		strings.NewReader(`{"status":"revoked"}`),
	)
	rec := httptest.NewRecorder()

	h.HandlePatch(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var device Device
	if err := json.NewDecoder(rec.Body).Decode(&device); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if device.Status != StatusRevoked {
		t.Fatalf("status = %q, want %q", device.Status, StatusRevoked)
	}
}

func TestHandlePatchRejectsInvalidStatus(t *testing.T) {
	h := New(zap.NewNop())
	req := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/devices/edge-drone-07",
		strings.NewReader(`{"status":"offline"}`),
	)
	rec := httptest.NewRecorder()

	h.HandlePatch(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}
