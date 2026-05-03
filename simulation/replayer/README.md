# sim/replayer

Paces the OP SILENT EYE world-state JSONL through the
`platform-control-plane` ingest API at scaled wall-clock time.

Per UI ADR 0002 §13 (Runtime architecture):

```
sim/scenarios/silent-eye-20260502/silent-eye.events.jsonl
                          ↓
                  sim/replayer/  (this)
                          ↓
            POST /api/v1/ingest/{type}  (×9 endpoints)
                          ↓
                platform-control-plane
                          ↓
          fusion → recengine → copilot → wsfeed
                          ↓
                       UI (live)
```

## Run

CP must be reachable at the URL you pass to `--cp` (default
`http://localhost:8080`).

```bash
# 30× speed (default) — 2-hour scenario completes in ~4 minutes
go run ./cmd/replayer \
  --jsonl=../scenarios/silent-eye-20260502/silent-eye.events.jsonl

# 1× realtime
go run ./cmd/replayer \
  --jsonl=../scenarios/silent-eye-20260502/silent-eye.events.jsonl \
  --speed=1

# Dry-run (no network, just log what would be sent)
go run ./cmd/replayer \
  --jsonl=../scenarios/silent-eye-20260502/silent-eye.events.jsonl \
  --dry-run --log-bodies
```

## What it does

1. Loads the JSONL (101 rows for OP SILENT EYE), parses each line as
   a typed ontology object.
2. Sorts chronologically by `_observed_at`.
3. **Initial conditions** (everything at the earliest timestamp =
   `2026-05-02T06:25:00Z`) are bulk-POSTed per type before the
   temporal loop starts. This includes 11 BLUE Units, 3
   MissionObjectives, and 3 civilian Entities so the world has a
   populated snapshot before any temporal event arrives.
4. **Temporal loop**: for each subsequent row, sleep until its
   wall-clock deadline (computed from `_observed_at − startTS` ÷
   `--speed`), then POST it as a 1-row array to the matching ingest
   endpoint.

## Wire-format transformations

The JSONL is in TS-friendly shape; the CP Go handlers expect the Go
ontology shape. The replayer applies these per-row before POSTing:

| Field | JSONL shape | Wire shape |
|---|---|---|
| `position` | `[lat, lon]` | `lat`, `lon` (split into two flat fields) |
| `target_area` | `[[lat, lon], ...]` | `[{lat, lon}, ...]` (Position objects) |
| `waypoints` | `[[lat, lon], ...]` | `[{lat, lon}, ...]` (Position objects) |
| `Event.payload` | object | JSON-encoded string |
| `Recommendation.proposed_params` | object | JSON-encoded string |

Stripped before POST:

- `_type` (endpoint determines)
- `_ingested_at`, `_version` (server-stamped per CP ADR 0003 I-003)
- `Entity.affiliation` (TS-only; UI computes from `threat_level` +
  `_subtype` + `_source`)
- `Event.verb` (TS-only display field)
- `Recommendation.{verb, short, asset_callsign, eta, why, gating}`
  (TS-only display fields; CP rec engine sets these from
  `proposed_action_type` + `rationale` when emitting live)

`_id` is **kept** (CP ADR 0003 I-004 first rule: producer-supplied
`_id` wins over UUIDv5 derivation), so `evidence_refs[]` chain
across the trace exactly as authored.

## Endpoint mapping

| JSONL `_type` | Path |
|---|---|
| `Entity` | `POST /api/v1/ingest/entities` |
| `Event` | `POST /api/v1/ingest/events` |
| `Report` | `POST /api/v1/ingest/reports` |
| `Unit` | `POST /api/v1/ingest/units` |
| `Recommendation` | `POST /api/v1/ingest/recommendations` |
| `MissionObjective` | `POST /api/v1/ingest/mission-objectives` |
| `Plan` | `POST /api/v1/ingest/plans` |
| `Mission` | `POST /api/v1/ingest/missions` |
| `TaskingOrder` | `POST /api/v1/ingest/tasking-orders` |

## Output

```
loaded 101 rows from .../silent-eye.events.jsonl
startTS=2026-05-02T06:25:00Z · initial=17 rows · temporal=84 rows · speed=30.0x
[bulk] POST /api/v1/ingest/entities           3 rows
[bulk] POST /api/v1/ingest/mission-objectives 3 rows
[bulk] POST /api/v1/ingest/units              11 rows
[Event    ] evt_phase1_001       position_report — ALPHA-6 morning standup …
[Event    ] evt_phase1_002       rf_ping — UHF emission burst, bearing 091 …
[Entity   ] ent_red_ew_leer3_01  LEER-3
...
replay complete · 101 rows posted over 240.0s wall-clock
```

## Future (not in v1)

- Pause/rewind/jump-to-phase via HTTP control endpoint
- Branching on operator decisions (different downstream events
  fire when operator approves vs rejects a Recommendation from CP)
- `--start-phase=phase-4` skip-ahead support
