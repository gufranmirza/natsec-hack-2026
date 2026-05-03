// Auto-generated from sim/scenarios/silent-eye-20260502/silent-eye.events.jsonl
// Do not edit by hand — re-run sim/.../compile-to-fixtures.mjs

import type { MissionObjective } from '@/types/ontology';
export const MISSIONS: MissionObjective[] = [
  {
    _type: "MissionObjective",
    _id: "obj_silent_eye",
    _source: "sim:silent-eye-20260502",
    _source_ref: "obj_silent_eye",
    _observed_at: "2026-05-02T06:25:00.000Z",
    title: "OP SILENT EYE",
    description: "Deny RED breakthrough in Chasiv Yar / Bakhmut axis AO. Maintain persistent ISR coverage, counter-fire RED indirect fires, protect UA mech infantry prepared positions. Repel any deliberate attack with light losses; preserve combat power for sustained defense.",
    priority: "P1",
    target_area: [
      [
        48.4,
        37.2
      ],
      [
        48.4,
        38.05
      ],
      [
        48.85,
        38.05
      ],
      [
        48.85,
        37.2
      ],
      [
        48.4,
        37.2
      ]
    ],
    deadline: "2026-05-02T18:00:00.000Z",
    status: "active",
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  },
  {
    _type: "MissionObjective",
    _id: "obj_night_eagle",
    _source: "sim:silent-eye-20260502",
    _source_ref: "obj_night_eagle",
    _observed_at: "2026-05-02T06:25:00.000Z",
    title: "OP NIGHT EAGLE",
    description: "Long-range ISR over Sea of Azov coastal approach sector D-7. Hand-off to JADE-2 at 1800Z relief. Placeholder tab for v1 demo, no live data.",
    priority: "P2",
    deadline: "2026-05-02T22:00:00.000Z",
    status: "open",
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  },
  {
    _type: "MissionObjective",
    _id: "obj_red_horizon",
    _source: "sim:silent-eye-20260502",
    _source_ref: "obj_red_horizon",
    _observed_at: "2026-05-02T06:25:00.000Z",
    title: "OP RED HORIZON",
    description: "Search-and-rescue handoff complete. Awaiting after-action review. Placeholder tab for v1 demo, no live data.",
    priority: "P0",
    status: "completed",
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  }
];

export const ACTIVE_MISSION_ID = 'obj_silent_eye';
