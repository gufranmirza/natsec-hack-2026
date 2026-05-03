package wsfeed

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/bus"
	"github.com/nsh-2026/platform-control-plane/internal/ontology"
)

func TestHandleSSE_StreamsPublishedEvents(t *testing.T) {
	b := bus.NewInMemory()
	h := New(b, zap.NewNop())

	srv := httptest.NewServer(http.HandlerFunc(h.HandleSSE))
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL, nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET feed: %v", err)
	}
	defer res.Body.Close()

	if res.Header.Get("Content-Type") != "text/event-stream" {
		t.Errorf("content-type = %q, want text/event-stream", res.Header.Get("Content-Type"))
	}

	// Give the handler a tick to subscribe before publishing.
	time.Sleep(50 * time.Millisecond)
	b.Publish(context.Background(), bus.ChangelogEvent{
		Type:       ontology.TypeEntity,
		ID:         "ent_test_1",
		Source:     "test",
		ObservedAt: time.Now().UTC(),
		IngestedAt: time.Now().UTC(),
		Op:         bus.OpUpsert,
	})

	buf := make([]byte, 1024)
	deadline := time.Now().Add(1 * time.Second)
	var got string
	for time.Now().Before(deadline) {
		_ = res.Request.Context()
		n, err := res.Body.Read(buf)
		if n > 0 {
			got += string(buf[:n])
			if strings.Contains(got, "ent_test_1") {
				return
			}
		}
		if err != nil {
			break
		}
	}
	t.Fatalf("did not receive published event in stream; got %q", got)
}
