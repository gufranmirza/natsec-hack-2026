# nsh-2026 — Mission Commander

Edge-native AI mission command surface that fuses tactical data into one operational picture and supports human-in-the-loop tasking.

This repo holds the three pieces of the platform:

| Directory | What it is | Stack |
|---|---|---|
| [`platform-control-plane/`](./platform-control-plane) | The AIP layer. Owns the typed Ontology, mediates LLM reasoning, executes Actions, and serves the live mission API the UI talks to. See [its ADR 0001](./platform-control-plane/docs/0001-platform-architecture.md) for the spine. | Go 1.24 · ClickHouse |
| [`platform-ui-app/`](./platform-ui-app) | The Mission Commander dashboard — the operator-facing surface. 50/25/25 OODA layout with map, fusion sources, and voice-first copilot column. | Next.js · TypeScript · shadcn |
| [`simulation/`](./simulation) | Off-line world that drives the demo. `replayer/` paces a scenario JSONL through the control-plane ingest API at scaled wall-clock; `scenarios/silent-eye-20260502/` is the OP SILENT EYE 2-hour script; `cop-data/` is the kepler.gl COP layer set (real frontline GeoJSON + synthetic OpenSky/ACLED/FIRMS-shaped feeds). | Go · Python · JSONL |

## End-to-end flow

```
simulation/scenarios/*.jsonl
        ↓
   simulation/replayer  ──POST──►  platform-control-plane  ──WS──►  platform-ui-app
                                   (fusion → recengine →
                                    copilot → wsfeed)
```

Run order for a full local demo: bring up ClickHouse → `platform-control-plane` → `platform-ui-app` → `simulation/replayer`. Each subdirectory has its own README with quick-start steps.
