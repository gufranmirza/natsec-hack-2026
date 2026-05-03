// Auto-generated from sim/scenarios/silent-eye-20260502/silent-eye.events.jsonl
// Do not edit by hand — re-run sim/.../compile-to-fixtures.mjs

import type { Unit } from '@/types/ontology';
export const UNITS: Unit[] = [
  {
    _type: "Unit",
    _id: "unit_blue_medical",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_blue_medical_t+15",
    _observed_at: "2026-05-02T08:20:30.000Z",
    _subtype: "vehicle",
    callsign: "LAZARUS",
    position: [
      48.63,
      37.72
    ],
    speed_mps: 0,
    status: "on_station",
    health: "healthy",
    fuel_pct: 80,
    capabilities: [],
    _version: 1,
    _ingested_at: "2026-05-02T08:20:30.000Z"
  },
  {
    _type: "Unit",
    _id: "unit_rook2",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_rook2_t-23",
    _observed_at: "2026-05-02T07:42:30.000Z",
    _subtype: "drone",
    callsign: "ROOK-2",
    position: [
      48.55,
      37.83
    ],
    altitude_m: 600,
    heading_deg: 215,
    speed_mps: 12,
    status: "on_station",
    health: "limited",
    battery_pct: 42,
    capabilities: [
      "optical",
      "eo"
    ],
    assigned_mission_id: "obj_silent_eye",
    _version: 1,
    _ingested_at: "2026-05-02T07:42:30.000Z"
  },
  {
    _type: "Unit",
    _id: "unit_blue_uas_falcon1",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_blue_uas_falcon1_t-25",
    _observed_at: "2026-05-02T07:40:00.000Z",
    _subtype: "drone",
    callsign: "FALCON-1",
    position: [
      48.74,
      37.85
    ],
    altitude_m: 3300,
    heading_deg: 215,
    speed_mps: 45,
    status: "on_station",
    health: "healthy",
    battery_pct: 85,
    fuel_pct: 62,
    capabilities: [
      "optical",
      "ir",
      "kinetic"
    ],
    assigned_mission_id: "obj_silent_eye",
    _version: 1,
    _ingested_at: "2026-05-02T07:40:00.000Z"
  },
  {
    _type: "Unit",
    _id: "unit_rook1",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_rook1_t-30",
    _observed_at: "2026-05-02T07:35:30.000Z",
    _subtype: "drone",
    callsign: "ROOK-1",
    position: [
      48.78,
      37.96
    ],
    altitude_m: 1100,
    heading_deg: 85,
    speed_mps: 18,
    status: "on_station",
    health: "healthy",
    battery_pct: 63,
    capabilities: [
      "optical",
      "ir",
      "sigint"
    ],
    assigned_mission_id: "obj_silent_eye",
    _version: 1,
    _ingested_at: "2026-05-02T07:35:30.000Z"
  },
  {
    _type: "Unit",
    _id: "unit_blue_cp",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_blue_cp",
    _observed_at: "2026-05-02T06:25:00.000Z",
    _subtype: "command_post",
    callsign: "ALPHA-6",
    position: [
      48.62,
      37.74
    ],
    status: "on_station",
    health: "healthy",
    capabilities: [
      "optical",
      "sigint"
    ],
    assigned_mission_id: "obj_silent_eye",
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  },
  {
    _type: "Unit",
    _id: "unit_blue_mech_pl1",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_blue_mech_pl1",
    _observed_at: "2026-05-02T06:25:00.000Z",
    _subtype: "vehicle",
    callsign: "PUNISHER-1",
    position: [
      48.6,
      37.8
    ],
    heading_deg: 90,
    speed_mps: 0,
    status: "on_station",
    health: "healthy",
    fuel_pct: 71,
    capabilities: [
      "optical",
      "ir"
    ],
    assigned_mission_id: "obj_silent_eye",
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  },
  {
    _type: "Unit",
    _id: "unit_blue_recon_team1",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_blue_recon_team1",
    _observed_at: "2026-05-02T06:25:00.000Z",
    _subtype: "vehicle",
    callsign: "SCOUT-1",
    position: [
      48.58,
      37.86
    ],
    heading_deg: 110,
    speed_mps: 0,
    status: "on_station",
    health: "healthy",
    fuel_pct: 88,
    capabilities: [
      "optical"
    ],
    assigned_mission_id: "obj_silent_eye",
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  },
  {
    _type: "Unit",
    _id: "unit_blue_recon_team2",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_blue_recon_team2",
    _observed_at: "2026-05-02T06:25:00.000Z",
    _subtype: "infantry",
    callsign: "SCOUT-2",
    position: [
      48.57,
      37.88
    ],
    status: "on_station",
    health: "healthy",
    capabilities: [
      "optical"
    ],
    assigned_mission_id: "obj_silent_eye",
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  },
  {
    _type: "Unit",
    _id: "unit_blue_fpv_team",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_blue_fpv_team",
    _observed_at: "2026-05-02T06:25:00.000Z",
    _subtype: "infantry",
    callsign: "HORNET",
    position: [
      48.61,
      37.81
    ],
    status: "on_station",
    health: "healthy",
    capabilities: [
      "kinetic"
    ],
    assigned_mission_id: "obj_silent_eye",
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  },
  {
    _type: "Unit",
    _id: "unit_blue_himars_pair",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_blue_himars_pair",
    _observed_at: "2026-05-02T06:25:00.000Z",
    _subtype: "vehicle",
    callsign: "LIGHTNING",
    position: [
      48.6,
      37.1
    ],
    status: "on_station",
    health: "healthy",
    fuel_pct: 92,
    capabilities: [
      "kinetic"
    ],
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  },
  {
    _type: "Unit",
    _id: "unit_bravo3",
    _source: "sim:silent-eye-20260502",
    _source_ref: "unit_bravo3",
    _observed_at: "2026-05-02T06:25:00.000Z",
    _subtype: "infantry",
    callsign: "BRAVO-3",
    position: [
      48.66,
      37.36
    ],
    heading_deg: 90,
    speed_mps: 0,
    status: "on_station",
    health: "healthy",
    capabilities: [
      "optical"
    ],
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  }
];
