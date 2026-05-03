// Package agent serves the operator-facing agent loop endpoints.
//
//	POST /api/v1/operator/query
//	POST /api/v1/recommendations/{id}/decision
//
// The endpoints accept structured operator input (transcript + UI state),
// build a reasoning context, ask the LLM for proposed actions, and return
// typed Recommendation + Event objects that drop directly into the UI's
// existing approval flow.
//
// Two LLM modes are supported, selected at construction time by the
// AZURE_OPENAI_API_KEY env var:
//
//   - present  → Azure OpenAI gpt-4o with function calling
//   - missing  → mock heuristic that emits plausible Recommendations from
//     keyword matches against the transcript. Lets the demo
//     work end-to-end before Azure access is provisioned.
//
// The contract returned in either mode is identical, so the UI does not
// know or care which mode is active.
package agent

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/ontology"
)

// ─────────────────────────────────────────────────────────────────────────────
// Wire types — request / response envelopes for the operator endpoints.
// ─────────────────────────────────────────────────────────────────────────────

// QueryRequest is what the UI POSTs to /api/v1/operator/query.
type QueryRequest struct {
	Transcript string    `json:"transcript"`
	Source     string    `json:"source"` // "voice" | "text"
	MissionID  string    `json:"mission_id,omitempty"`
	UIContext  UIContext `json:"ui_context,omitempty"`
}

// UIContext carries the slice of UI state that the agent needs to reason.
// We accept it inline rather than reading from the store so the demo works
// before the UI fixtures are ingested into ClickHouse.
type UIContext struct {
	ActiveDroneFeed string                      `json:"active_drone_feed,omitempty"`
	Workspace       string                      `json:"workspace,omitempty"`
	Units           []*ontology.Unit            `json:"units,omitempty"`
	RecentEvents    []*ontology.Event           `json:"recent_events,omitempty"`
	Entities        []*ontology.Entity          `json:"entities,omitempty"`
	PendingRecs     []*ontology.Recommendation  `json:"pending_recommendations,omitempty"`
}

// QueryResponse is what the UI receives. Recommendations and Events are
// serialized as Object handles (with `_type`) so they drop directly into
// the UI's existing discriminated-union state.
type QueryResponse struct {
	QueryID         string           `json:"query_id"`
	Transcript      string           `json:"transcript"`
	Intent          IntentTag        `json:"intent"`
	AIResponse      AIResponse       `json:"ai_response"`
	Recommendations []map[string]any `json:"recommendations"`
	Events          []map[string]any `json:"events"`
	GeneratedAt     time.Time        `json:"generated_at"`
}

// AIResponse is the spoken-back portion of the answer.
type AIResponse struct {
	Text string `json:"text"`
}

// IntentTag is a small debug tag the agent reports about how it parsed the
// query — useful in the UI when wiring is being debugged.
type IntentTag struct {
	Type       string  `json:"type"`
	Confidence float32 `json:"confidence"`
}

// DecisionRequest is what the UI POSTs to approve / reject / modify a rec.
type DecisionRequest struct {
	Decision        string                 `json:"decision"` // "approve" | "reject" | "modify"
	ModifiedParams  map[string]interface{} `json:"modified_params,omitempty"`
	OperatorID      string                 `json:"operator_id,omitempty"`
}

// DecisionResponse mirrors the updated rec plus any new audit Events,
// serialized as Object handles (with `_type`).
type DecisionResponse struct {
	Recommendation map[string]any   `json:"recommendation"`
	Events         []map[string]any `json:"events"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Reasoner — interface so we can swap mock / real Azure OpenAI.
// ─────────────────────────────────────────────────────────────────────────────

// Reasoner produces an LLM response from a QueryRequest.
type Reasoner interface {
	Propose(req *QueryRequest) (*ReasonerOutput, error)
	Mode() string // "azure-openai-gpt4o" | "mock-heuristic"
}

// ReasonerOutput is what every Reasoner returns.
type ReasonerOutput struct {
	SpokenText      string
	Intent          IntentTag
	Recommendations []*ontology.Recommendation
	Events          []*ontology.Event
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler — wires the routes, holds dependencies.
// ─────────────────────────────────────────────────────────────────────────────

// Handler owns POST /operator/query and POST /recommendations/{id}/decision.
type Handler struct {
	reasoner Reasoner
	log      *zap.Logger
}

// New constructs a Handler with the given Reasoner.
//
// reasoner must be non-nil. If your config can't construct one
// (missing Azure credentials), bubble that up at startup rather than
// passing nil — the agent endpoint should fail loud, not silently mock.
func New(reasoner Reasoner, log *zap.Logger) *Handler {
	if reasoner == nil {
		panic("agent.New: reasoner is required (refuse to silently mock)")
	}
	log.Info("agent handler initialized", zap.String("reasoner", reasoner.Mode()))
	return &Handler{reasoner: reasoner, log: log}
}

// HandleQuery serves POST /api/v1/operator/query.
func (h *Handler) HandleQuery(w http.ResponseWriter, r *http.Request) {
	var req QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("decode body: %v", err))
		return
	}
	req.Transcript = strings.TrimSpace(req.Transcript)
	if req.Transcript == "" {
		writeError(w, http.StatusBadRequest, "transcript is required")
		return
	}
	if req.Source == "" {
		req.Source = "text"
	}

	out, err := h.reasoner.Propose(&req)
	if err != nil {
		h.log.Error("reasoner failed", zap.Error(err), zap.String("transcript", req.Transcript))
		writeError(w, http.StatusBadGateway, fmt.Sprintf("reasoner: %v", err))
		return
	}

	recHandles := make([]map[string]any, 0, len(out.Recommendations))
	for _, r := range out.Recommendations {
		recHandles = append(recHandles, objectHandle(ontology.TypeRecommendation, r))
	}
	evtHandles := make([]map[string]any, 0, len(out.Events))
	for _, e := range out.Events {
		evtHandles = append(evtHandles, objectHandle(ontology.TypeEvent, e))
	}

	resp := QueryResponse{
		QueryID:         "qry_" + uuid.NewString()[:12],
		Transcript:      req.Transcript,
		Intent:          out.Intent,
		AIResponse:      AIResponse{Text: out.SpokenText},
		Recommendations: recHandles,
		Events:          evtHandles,
		GeneratedAt:     time.Now().UTC(),
	}
	writeJSON(w, http.StatusOK, resp)
}

// HandleDecision serves POST /api/v1/recommendations/{id}/decision.
//
// For the demo this only updates the recommendation's status + emits an
// audit Event. Real OAG dispatch lives in a follow-up task.
func (h *Handler) HandleDecision(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "recommendation id is required")
		return
	}
	var req DecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("decode body: %v", err))
		return
	}
	switch req.Decision {
	case "approve", "reject", "modify":
		// ok
	default:
		writeError(w, http.StatusBadRequest, "decision must be approve|reject|modify")
		return
	}

	now := time.Now().UTC()
	operator := req.OperatorID
	if operator == "" {
		operator = "operator"
	}

	status := ontology.RecStatusPending
	switch req.Decision {
	case "approve":
		status = ontology.RecStatusAccepted
	case "reject":
		status = ontology.RecStatusRejected
	case "modify":
		// modify keeps it pending; record the modified params on the audit event
		status = ontology.RecStatusPending
	}

	// Stub recommendation we hand back — UI uses its existing rec object,
	// but we return what the canonical update would look like.
	rec := &ontology.Recommendation{
		Envelope: ontology.Envelope{
			ID:         id,
			ObservedAt: now,
			IngestedAt: now,
			Source:     "agent",
		},
		Status:    status,
		DecidedBy: &operator,
		DecidedAt: &now,
	}

	auditEvent := &ontology.Event{
		Envelope: ontology.Envelope{
			ID:         "evt_decision_" + uuid.NewString()[:12],
			ObservedAt: now,
			IngestedAt: now,
			Source:     "agent",
		},
		Subtype:     ontology.EventSubtypeReportLink,
		Description: fmt.Sprintf("Operator %s recommendation %s.", strings.ToUpper(req.Decision[:1])+req.Decision[1:], id),
		Severity:    ontology.SeverityInfo,
	}

	writeJSON(w, http.StatusOK, DecisionResponse{
		Recommendation: objectHandle(ontology.TypeRecommendation, rec),
		Events:         []map[string]any{objectHandle(ontology.TypeEvent, auditEvent)},
	})
}

// objectHandle mirrors the helper in internal/api/read: round-trip through
// JSON so struct tags drive field names, then prepend `_type`.
func objectHandle(t ontology.ObjectType, obj any) map[string]any {
	b, err := json.Marshal(obj)
	if err != nil {
		return map[string]any{"_type": string(t), "_error": err.Error()}
	}
	m := make(map[string]any, 16)
	if err := json.Unmarshal(b, &m); err != nil {
		return map[string]any{"_type": string(t), "_error": err.Error()}
	}
	delete(m, "_version")
	out := make(map[string]any, len(m)+1)
	out["_type"] = string(t)
	for k, v := range m {
		out[k] = v
	}
	return out
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON helpers (mirror conventions in internal/api/read).
// ─────────────────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// errMissingKey is returned by the Azure reasoner when the API key is unset.
var errMissingKey = errors.New("AZURE_OPENAI_API_KEY not set")
