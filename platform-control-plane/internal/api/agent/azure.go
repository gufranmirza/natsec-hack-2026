package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	openai "github.com/sashabaranov/go-openai"
	"go.uber.org/zap"

	"github.com/nsh-2026/platform-control-plane/internal/ontology"
)

// AzureReasoner is the production Reasoner — calls Azure OpenAI gpt-4o
// (or whichever deployment is configured) with function-calling tools so
// every action proposed by the LLM round-trips through a typed schema and
// drops cleanly into the UI's Recommendation flow.
//
// The reasoner runs a small tool-use loop:
//
//  1. LLM is given the data catalog + the operator transcript.
//  2. LLM may call query_database(sql) to read live state from ClickHouse.
//     CP runs the SQL, returns rows. LLM is invoked again to synthesize
//     a natural-language answer.
//  3. LLM may call action tools (vectorUnit, loiterUnit, …) to propose
//     operator-approval Recommendations. Those terminate the loop.
//
// SQL is read-only by construction (see sql.go); the LLM cannot mutate state.
type AzureReasoner struct {
	client     *openai.Client
	deployment string
	sqlRunner  SQLRunner
	timeout    time.Duration
	log        *zap.Logger
}

// AzureConfig captures the env-driven configuration for the reasoner.
type AzureConfig struct {
	Endpoint   string        // e.g. "https://my-resource.openai.azure.com"
	APIKey     string        // AZURE_OPENAI_API_KEY
	Deployment string        // your gpt-4o deployment name (the Azure deployment, not the OpenAI model name)
	APIVersion string        // e.g. "2024-08-01-preview" — defaults if empty
	Timeout    time.Duration // request timeout; defaults to 30s
}

// AzureConfigFromEnv loads config from AZURE_OPENAI_* environment variables.
// Returns ErrMissingAzureConfig if required values are absent.
func AzureConfigFromEnv() (AzureConfig, error) {
	cfg := AzureConfig{
		Endpoint:   strings.TrimSpace(os.Getenv("AZURE_OPENAI_ENDPOINT")),
		APIKey:     strings.TrimSpace(os.Getenv("AZURE_OPENAI_API_KEY")),
		Deployment: strings.TrimSpace(os.Getenv("AZURE_OPENAI_DEPLOYMENT")),
		APIVersion: strings.TrimSpace(os.Getenv("AZURE_OPENAI_API_VERSION")),
	}
	// Azure portal copies the endpoint with a trailing slash; the SDK
	// prepends "/openai/...", which produces a 404'ing double slash. Strip it.
	cfg.Endpoint = strings.TrimRight(cfg.Endpoint, "/")
	if cfg.Endpoint == "" || cfg.APIKey == "" || cfg.Deployment == "" {
		return cfg, ErrMissingAzureConfig
	}
	if cfg.APIVersion == "" {
		cfg.APIVersion = "2025-01-01-preview"
	}
	cfg.Timeout = 30 * time.Second
	return cfg, nil
}

// ErrMissingAzureConfig signals that one or more required env vars are unset.
var ErrMissingAzureConfig = errors.New("AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY / AZURE_OPENAI_DEPLOYMENT must all be set")

// NewAzureReasoner constructs the production reasoner.
//
// sqlRunner may be nil — in which case the query_database tool is disabled
// and the reasoner only handles narrative / action responses.
func NewAzureReasoner(cfg AzureConfig, sqlRunner SQLRunner, log *zap.Logger) (*AzureReasoner, error) {
	if cfg.Endpoint == "" || cfg.APIKey == "" || cfg.Deployment == "" {
		return nil, ErrMissingAzureConfig
	}
	azCfg := openai.DefaultAzureConfig(cfg.APIKey, cfg.Endpoint)
	azCfg.APIVersion = cfg.APIVersion
	// Map "gpt-4o" (model name we send in requests) to the Azure deployment name.
	azCfg.AzureModelMapperFunc = func(_ string) string { return cfg.Deployment }
	client := openai.NewClientWithConfig(azCfg)

	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}
	return &AzureReasoner{
		client:     client,
		deployment: cfg.Deployment,
		sqlRunner:  sqlRunner,
		timeout:    timeout,
		log:        log,
	}, nil
}

// Mode reports the reasoner identity for logs.
func (a *AzureReasoner) Mode() string {
	return "azure-openai:" + a.deployment
}

// maxToolRounds bounds the agent loop so a misbehaving model can't spin
// forever hitting query_database. 4 rounds = up to 3 SQL hops + 1 final synth.
const maxToolRounds = 4

// Propose runs the agent tool-use loop and returns a structured ReasonerOutput.
func (a *AzureReasoner) Propose(req *QueryRequest) (*ReasonerOutput, error) {
	ctx, cancel := context.WithTimeout(context.Background(), a.timeout)
	defer cancel()

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: buildSystemPrompt(a.sqlRunner != nil)},
		{Role: openai.ChatMessageRoleUser, Content: buildUserPrompt(req)},
	}

	out := &ReasonerOutput{
		Intent: IntentTag{Type: "describe_state", Confidence: 0.6},
	}
	now := time.Now().UTC()
	tools := buildToolSchema(a.sqlRunner != nil)

	for round := 0; round < maxToolRounds; round++ {
		resp, err := a.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
			Model:       a.deployment,
			Messages:    messages,
			Tools:       tools,
			ToolChoice:  "auto",
			Temperature: 0.2,
			MaxTokens:   1200,
		})
		if err != nil {
			return nil, fmt.Errorf("azure openai chat completion (round %d): %w", round, err)
		}
		if len(resp.Choices) == 0 {
			return nil, errors.New("azure openai: no choices returned")
		}
		msg := resp.Choices[0].Message

		// No tool calls → final answer.
		if len(msg.ToolCalls) == 0 {
			out.SpokenText = strings.TrimSpace(msg.Content)
			break
		}

		// Append the assistant turn so the next prompt sees it.
		messages = append(messages, msg)

		// Process tool calls. If any are query_database, append their results
		// and loop again so the model can synthesize a final answer. Action
		// tools (vectorUnit, etc) accumulate Recommendations and don't loop.
		needsAnotherRound := false
		for _, tc := range msg.ToolCalls {
			switch tc.Function.Name {
			case "query_database":
				result := a.runQueryTool(ctx, tc)
				messages = append(messages, openai.ChatCompletionMessage{
					Role:       openai.ChatMessageRoleTool,
					ToolCallID: tc.ID,
					Name:       tc.Function.Name,
					Content:    result,
				})
				needsAnotherRound = true
			default:
				rec, intent := buildRecommendationFromToolCall(tc, req, now)
				if rec != nil {
					out.Recommendations = append(out.Recommendations, rec)
				}
				if intent.Type != "" {
					out.Intent = intent
				}
				// Confirm the tool call to the model with a stub result so the
				// conversation history stays valid (OpenAI requires a tool
				// response for each tool call in the prior turn).
				messages = append(messages, openai.ChatCompletionMessage{
					Role:       openai.ChatMessageRoleTool,
					ToolCallID: tc.ID,
					Name:       tc.Function.Name,
					Content:    `{"status":"recommendation_drafted","note":"Awaiting operator approval."}`,
				})
				needsAnotherRound = true
			}
		}
		if !needsAnotherRound {
			break
		}
	}

	out.Events = append(out.Events, &ontology.Event{
		Envelope: ontology.Envelope{
			ID:         "evt_qry_" + uuid.NewString()[:12],
			ObservedAt: now,
			IngestedAt: now,
			Source:     a.Mode(),
		},
		Subtype:     ontology.EventSubtypeReportLink,
		Description: fmt.Sprintf("Operator query received: %q", truncate(req.Transcript, 80)),
		Severity:    ontology.SeverityInfo,
	})

	if out.SpokenText == "" {
		if len(out.Recommendations) > 0 {
			out.SpokenText = "Recommendation drafted — awaiting your approval."
		} else {
			out.SpokenText = "No action proposed."
		}
	}
	return out, nil
}

// runQueryTool executes a query_database tool call and returns a JSON-encoded
// QueryResult string for the LLM to consume in the next turn.
func (a *AzureReasoner) runQueryTool(ctx context.Context, tc openai.ToolCall) string {
	if a.sqlRunner == nil {
		return `{"error":"query_database tool is unavailable: no SQL runner wired"}`
	}
	var args struct {
		SQL   string `json:"sql"`
		Limit int    `json:"limit"`
	}
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
		return fmt.Sprintf(`{"error":"could not parse arguments: %s"}`, escapeJSON(err.Error()))
	}
	a.log.Info("agent SQL", zap.String("sql", args.SQL), zap.Int("requested_limit", args.Limit))

	result, err := a.sqlRunner.QueryRows(ctx, args.SQL, args.Limit)
	if err != nil {
		a.log.Warn("agent SQL failed",
			zap.String("sql", args.SQL), zap.Error(err))
		return fmt.Sprintf(`{"error":"%s","attempted_sql":"%s"}`,
			escapeJSON(err.Error()), escapeJSON(args.SQL))
	}
	b, err := json.Marshal(result)
	if err != nil {
		return fmt.Sprintf(`{"error":"could not marshal result: %s"}`, escapeJSON(err.Error()))
	}
	return string(b)
}

func escapeJSON(s string) string {
	b, _ := json.Marshal(s)
	if len(b) >= 2 {
		return string(b[1 : len(b)-1])
	}
	return s
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt + tool schema
// ─────────────────────────────────────────────────────────────────────────────

func buildSystemPrompt(sqlEnabled bool) string {
	parts := []string{
		"You are Mission Commander, an AI tactical assistant working alongside a human operator.",
		"You operate over a ClickHouse 24.x ontology database holding live drones, ground units, sensor tracks, events, recommendations, reports, and missions. The database is queried via the clickhouse-go v2 native protocol driver.",
		"",
		"How to respond:",
		"  1. For information questions, call `query_database` with a SELECT against the catalog tables. Synthesize a clear answer from the rows.",
		"  2. For action requests, call vectorUnit / loiterUnit / launchSwarm / reTaskUnit. Always also include a short text confirmation in `content`.",
		"  3. You may chain — query the DB once to confirm context, then propose an action. Hard cap: 2 query_database calls per operator turn.",
		"  4. NEVER fabricate IDs, callsigns, or coordinates. If the DB returns 0 rows, say so. If a query errors, fix it and retry ONCE (a second identical retry is wasted).",
		"  5. Spoken (voice) responses MUST be one or two sentences max — they will be read aloud. Typed responses can be richer (lists, tables) when structured data warrants it. Use callsigns (ROOK-1, BOGEY-7) verbatim from the data.",
		"",
		"Output formatting (CommonMark + GFM — the UI renders this with react-markdown + remark-gfm):",
		"  • Use real markdown structure. Multiple items → bulleted or numbered list, each item on its own line. Tabular results → GFM table. Single fact → prose.",
		"  • GFM tables require an alignment row directly below the header, e.g.:",
		"      | Subtype | Threat | Count |",
		"      |---|---|---|",
		"      | Aircraft | High | 2 |",
		"    Each row is its own line. NEVER inline a whole table on one line — the renderer treats `|` between cells as literal text without the line breaks and the alignment row.",
		"  • Separate blocks (paragraphs, lists, tables) with a blank line. No leading whitespace on lines unless the line is a list-item continuation.",
		"  • Bold with `**text**`, italic with `*text*`. Never emit raw HTML tags (no <b>, <br>, <table>, <strong>).",
		"  • Code-fence ClickHouse SQL examples and IDs you want highlighted with single backticks. Do not wrap whole responses in fences.",
		"  • Use callsigns and entity ids verbatim — the UI auto-links recognized callsigns and chips them so they're clickable.",
		"  • Don't escape characters that don't need escaping (no `\\_`, no `\\.` for plain prose).",
		"",
		"ClickHouse SQL rules — follow these to avoid query errors:",
		"  • All tables use ReplacingMergeTree(_version). ALWAYS use `FROM <table> FINAL` to get latest-version rows. Without FINAL you may see stale duplicates.",
		"  • Lowercase singular table names: `unit`, `entity`, `event`, `report`, `recommendation`, `mission_objective`, `plan`, `mission`, `tasking_order`. NOT plural (no `units`/`entities`/`events`).",
		"  • Time columns are `DateTime64(3)` UTC. For 'last X minutes' use `_observed_at > now() - INTERVAL X MINUTE`.",
		"  • Nullable columns return NULL when empty — handle with `IS NOT NULL` if you only want populated rows.",
		"  • LowCardinality(String) columns (like `_subtype`, `severity`, `threat_level`, `status`) compare with normal string equality.",
		"  • Array columns use ClickHouse functions: `has(capabilities, 'optical')` to check membership, `length(evidence_refs)` for count.",
		"  • Map columns: `attributes['key']` to access.",
		"  • Trailing semicolons are fine but redundant — the runner strips them.",
		"  • Never use INSERT / UPDATE / DELETE / DROP / ALTER / TRUNCATE / CREATE — those are blocked at the runner level.",
		"  • If a query errors, the error message is in the tool result. Read it, adjust, retry once.",
		"",
	}
	if sqlEnabled {
		parts = append(parts, dataCatalog)
	} else {
		parts = append(parts, "(query_database tool is unavailable in this run — answer based on the operator-supplied UI context only.)")
	}
	return strings.Join(parts, "\n")
}

func buildUserPrompt(req *QueryRequest) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Operator said: %q\n", req.Transcript)
	if req.UIContext.ActiveDroneFeed != "" {
		fmt.Fprintf(&b, "Currently viewing drone: %s\n", req.UIContext.ActiveDroneFeed)
	}
	if len(req.UIContext.Units) > 0 {
		b.WriteString("\nDrones / units in roster:\n")
		for _, u := range req.UIContext.Units {
			alt := ""
			if u.AltitudeM != nil {
				alt = fmt.Sprintf(" alt=%.0fm", *u.AltitudeM)
			}
			bat := ""
			if u.BatteryPct != nil {
				bat = fmt.Sprintf(" battery=%.0f%%", *u.BatteryPct)
			}
			fmt.Fprintf(&b, "  - id=%s callsign=%s subtype=%s status=%s pos=[%.4f,%.4f]%s%s capabilities=%v\n",
				u.Envelope.ID, u.Callsign, u.Subtype, u.Status, u.Lat, u.Lon, alt, bat, u.Capabilities)
		}
	}
	if len(req.UIContext.Entities) > 0 {
		b.WriteString("\nEntities on the picture:\n")
		for _, e := range req.UIContext.Entities {
			name := ""
			if e.Name != nil {
				name = " name=" + *e.Name
			}
			fmt.Fprintf(&b, "  - id=%s subtype=%s%s threat=%s pos=[%.4f,%.4f] confidence=%.2f\n",
				e.Envelope.ID, e.Subtype, name, e.ThreatLevel, e.Lat, e.Lon, e.Confidence)
		}
	}
	if len(req.UIContext.RecentEvents) > 0 {
		b.WriteString("\nRecent events (newest first):\n")
		for i, ev := range req.UIContext.RecentEvents {
			if i >= 8 {
				break
			}
			fmt.Fprintf(&b, "  - [%s] %s severity=%s desc=%q\n",
				ev.ObservedAt.Format(time.RFC3339), ev.Subtype, ev.Severity, truncate(ev.Description, 100))
		}
	}
	if len(req.UIContext.PendingRecs) > 0 {
		b.WriteString("\nPending recommendations awaiting operator decision:\n")
		for _, r := range req.UIContext.PendingRecs {
			fmt.Fprintf(&b, "  - id=%s action=%s confidence=%.2f rationale=%q\n",
				r.Envelope.ID, r.ProposedActionType, r.Confidence, truncate(r.Rationale, 120))
		}
	}
	return b.String()
}

func buildToolSchema(sqlEnabled bool) []openai.Tool {
	tools := []openai.Tool{}

	if sqlEnabled {
		tools = append(tools, openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name: "query_database",
				Description: "Run a single read-only SELECT query against the ontology database. " +
					"Use this to answer information questions (what / where / who / how many / status). " +
					"Always include FINAL when querying ReplacingMergeTree tables to dedupe versions. " +
					"Always include a LIMIT clause appropriate to the question (LIMIT 1 for single-row, LIMIT 20–50 for lists).",
				Parameters: jsonSchema{
					"type": "object",
					"properties": jsonSchema{
						"sql": jsonSchema{
							"type":        "string",
							"description": "A single SELECT or WITH (CTE) statement. Forbidden: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE.",
						},
						"limit": jsonSchema{
							"type":        "integer",
							"description": "Optional row cap (defaults to 50; hard max 200).",
						},
					},
					"required": []string{"sql"},
				},
			},
		})
	}

	tools = append(tools,
		openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name: "vectorUnit",
				Description: "Vector a friendly unit (drone) toward a target entity or geographic position. " +
					"Use when the operator wants to send / task / investigate / verify / intercept.",
				Parameters: jsonSchema{
					"type": "object",
					"properties": jsonSchema{
						"unit_id":          jsonSchema{"type": "string", "description": "ID of the unit to vector. Must be present in the provided unit roster."},
						"target_entity_id": jsonSchema{"type": "string", "description": "Optional: ID of the entity to vector toward."},
						"target_lat":       jsonSchema{"type": "number", "description": "Optional: target latitude if vectoring to a coord rather than an entity."},
						"target_lon":       jsonSchema{"type": "number", "description": "Optional: target longitude."},
						"stand_off_m":      jsonSchema{"type": "integer", "description": "Stand-off distance in meters. Default 600.", "default": 600},
					},
					"required": []string{"unit_id"},
				},
			},
		},
		openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "loiterUnit",
				Description: "Hold a unit on station — orbit a fixed point at altitude. Use for 'stop', 'loiter', 'hold', 'station-keeping' commands.",
				Parameters: jsonSchema{
					"type": "object",
					"properties": jsonSchema{
						"unit_id":    jsonSchema{"type": "string"},
						"radius_m":   jsonSchema{"type": "integer", "description": "Loiter radius in meters. Default 300.", "default": 300},
						"altitude_m": jsonSchema{"type": "number", "description": "Altitude in meters AGL."},
					},
					"required": []string{"unit_id"},
				},
			},
		},
		openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "launchSwarm",
				Description: "Launch a coordinated swarm of multiple drones. Use only when operator explicitly says swarm / sweep / area cover.",
				Parameters: jsonSchema{
					"type": "object",
					"properties": jsonSchema{
						"unit_ids":      jsonSchema{"type": "array", "items": jsonSchema{"type": "string"}},
						"pattern":       jsonSchema{"type": "string", "enum": []string{"lawnmower", "spiral", "perimeter"}},
						"area_radius_m": jsonSchema{"type": "integer"},
					},
					"required": []string{"unit_ids", "pattern"},
				},
			},
		},
		openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "reTaskUnit",
				Description: "Change a unit's mission. Use for 'return to base', 'recover', 'rebase', 'abort'.",
				Parameters: jsonSchema{
					"type": "object",
					"properties": jsonSchema{
						"unit_id":    jsonSchema{"type": "string"},
						"new_status": jsonSchema{"type": "string", "enum": []string{"idle", "en_route", "on_station", "returning", "offline"}},
					},
					"required": []string{"unit_id", "new_status"},
				},
			},
		},
	)
	return tools
}

// jsonSchema is shorthand for inline JSON schema fragments in the tool defs.
type jsonSchema map[string]any

// ─────────────────────────────────────────────────────────────────────────────
// Tool-call → Recommendation translation
// ─────────────────────────────────────────────────────────────────────────────

func buildRecommendationFromToolCall(tc openai.ToolCall, req *QueryRequest, now time.Time) (*ontology.Recommendation, IntentTag) {
	args := map[string]any{}
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
		return nil, IntentTag{Type: "tool_call_parse_error", Confidence: 0}
	}

	rec := &ontology.Recommendation{
		Envelope: ontology.Envelope{
			ID:         "rec_" + uuid.NewString()[:12],
			ObservedAt: now,
			IngestedAt: now,
			Source:     "agent:azure-openai",
		},
		ProposedActionType: tc.Function.Name,
		Confidence:         0.78,
		Status:             ontology.RecStatusPending,
		EvidenceRefs:       collectEvidenceRefs(req),
	}

	// Stash params back as JSON so the UI's existing rec.proposed_params
	// (string-keyed Record<string, unknown>) sees them faithfully.
	if b, err := json.Marshal(args); err == nil {
		rec.ProposedParams = string(b)
	} else {
		rec.ProposedParams = tc.Function.Arguments
	}

	intent := IntentTag{Type: tc.Function.Name, Confidence: 0.78}

	// If the tool call references a target entity, surface that on the rec.
	if entID, ok := args["target_entity_id"].(string); ok && entID != "" {
		rec.SubjectEntityID = &entID
	}

	rec.Rationale = fmt.Sprintf(
		"Operator transcript: %q. Action: %s.",
		truncate(req.Transcript, 120),
		tc.Function.Name,
	)
	return rec, intent
}

func collectEvidenceRefs(req *QueryRequest) []string {
	refs := []string{}
	for i, e := range req.UIContext.RecentEvents {
		if i >= 3 {
			break
		}
		if e != nil && e.Envelope.ID != "" {
			refs = append(refs, e.Envelope.ID)
		}
	}
	return refs
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
