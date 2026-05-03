// Package bus is the in-process changelog bus for ontology mutations.
//
// v1 has zero subscribers; the interface exists so future ADRs (the WebSocket
// gateway, the Intelligence Loop, workers) attach without ingest changing.
// See docs/0003-ingest-layer.md §10.
package bus

import (
	"context"
	"sync"
	"time"

	"github.com/nsh-2026/platform-control-plane/internal/ontology"
)

// Op identifies the mutation kind on a ChangelogEvent.
type Op string

const (
	// OpUpsert is the only Op emitted by ingest in v1.
	OpUpsert Op = "upsert"
	// OpDelete is reserved for the action service; ingest never emits it.
	OpDelete Op = "delete"
)

// Position is the optional geo payload on a ChangelogEvent.
type Position struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

// ChangelogEvent describes a single Object mutation. The shape mirrors the
// rows returned by GET /api/v1/changelog so HTTP and bus subscribers see the
// same projection.
type ChangelogEvent struct {
	Type         ontology.ObjectType `json:"type"`
	ID           string              `json:"id"`
	Subtype      string              `json:"subtype,omitempty"`
	Source       string              `json:"source"`
	ObservedAt   time.Time           `json:"observed_at"`
	IngestedAt   time.Time           `json:"ingested_at"`
	Op           Op                  `json:"op"`
	Position     *Position           `json:"position,omitempty"`
	AuditEventID *string             `json:"audit_event_id,omitempty"`
}

// Bus is the publish/subscribe contract for ChangelogEvents.
//
// Publish must never block ingest. Subscribers that fall behind re-sync from
// ClickHouse — CH is the durable record; the bus is lossy by design.
type Bus interface {
	Publish(ctx context.Context, ev ChangelogEvent)
	Subscribe(buffer int) <-chan ChangelogEvent
}

// InMemory is the v1 single-process Bus. Goroutine-safe; non-blocking publish.
type InMemory struct {
	mu   sync.RWMutex
	subs []chan ChangelogEvent
}

// NewInMemory creates an empty InMemory bus.
func NewInMemory() *InMemory {
	return &InMemory{}
}

// Publish delivers ev to every current subscriber. Drops events to subscribers
// whose buffer is full.
func (b *InMemory) Publish(_ context.Context, ev ChangelogEvent) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for _, ch := range b.subs {
		select {
		case ch <- ev:
		default:
		}
	}
}

// Subscribe returns a channel for receiving events. The caller chooses the
// buffer; size below 1 is treated as 1.
func (b *InMemory) Subscribe(buffer int) <-chan ChangelogEvent {
	if buffer < 1 {
		buffer = 1
	}
	ch := make(chan ChangelogEvent, buffer)
	b.mu.Lock()
	b.subs = append(b.subs, ch)
	b.mu.Unlock()
	return ch
}
