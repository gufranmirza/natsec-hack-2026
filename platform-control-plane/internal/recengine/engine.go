package recengine

import (
	"context"
	"sync"

	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/bus"
	"github.com/nsh-2026/platform-control-plane/internal/ontology"
)

// store is the surface recengine needs from ontology.Store. Real store
// satisfies; tests can fake it.
type store interface {
	storeReader
	UpsertRecommendation(ctx context.Context, r *ontology.Recommendation) error
}

// Engine subscribes to the bus and emits Recommendations on trigger.
type Engine struct {
	store    store
	bus      bus.Bus
	log      *zap.Logger
	triggers []trigger

	mu      sync.Mutex
	emitted map[string]bool // dedupe by Recommendation _id within process lifetime
}

// New creates an Engine with the default doctrinal triggers.
func New(s store, b bus.Bus, log *zap.Logger) *Engine {
	return &Engine{
		store:    s,
		bus:      b,
		log:      log,
		triggers: defaultTriggers(),
		emitted:  map[string]bool{},
	}
}

// Start runs the subscription loop. Returns immediately; the goroutine
// exits when ctx is cancelled.
func (e *Engine) Start(ctx context.Context) {
	events := e.bus.Subscribe(256)
	go func() {
		e.log.Info("recengine: started", zap.Int("triggers", len(e.triggers)))
		for {
			select {
			case <-ctx.Done():
				e.log.Info("recengine: stopping")
				return
			case ev, ok := <-events:
				if !ok {
					return
				}
				if ev.Op != bus.OpUpsert {
					continue
				}
				e.evaluate(ctx, ev)
			}
		}
	}()
}

// evaluate runs every trigger predicate against the event; for each match,
// builds the Recommendation, persists it, and republishes it on the bus so
// the wsfeed SSE stream surfaces the new rec to the UI.
func (e *Engine) evaluate(ctx context.Context, ev bus.ChangelogEvent) {
	for _, t := range e.triggers {
		if !t.predicate(ev, e.store, ctx) {
			continue
		}
		rec, err := t.build(ev, e.store, ctx)
		if err != nil {
			e.log.Warn("recengine: build failed", zap.String("trigger", t.name), zap.Error(err))
			continue
		}

		e.mu.Lock()
		if e.emitted[rec.ID] {
			e.mu.Unlock()
			continue // already emitted this rec; idempotent across event re-firings
		}
		e.emitted[rec.ID] = true
		e.mu.Unlock()

		if err := e.store.UpsertRecommendation(ctx, rec); err != nil {
			e.log.Warn("recengine: upsert failed", zap.String("trigger", t.name), zap.String("rec_id", rec.ID), zap.Error(err))
			continue
		}

		// Per simplification: no bus re-publish. UI polls
		// GET /api/v1/objects/Recommendation periodically and discovers
		// the new rec there. Keeps the demo path simple — no SSE
		// hand-off between recengine and wsfeed.

		e.log.Info("recengine: emitted recommendation",
			zap.String("trigger", t.name),
			zap.String("rec_id", rec.ID),
			zap.String("gating", formatGating(t.gating)),
			zap.Float32("confidence", rec.Confidence),
			zap.Int("evidence_count", len(rec.EvidenceRefs)),
		)
	}
}
