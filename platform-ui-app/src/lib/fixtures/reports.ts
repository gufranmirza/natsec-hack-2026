// Auto-generated from sim/scenarios/silent-eye-20260502/silent-eye.events.jsonl
// Do not edit by hand — re-run sim/.../compile-to-fixtures.mjs

import type { Report } from '@/types/ontology';
export const REPORTS: Report[] = [
  {
    _type: "Report",
    _id: "rep_004",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_004",
    _observed_at: "2026-05-02T08:24:00.000Z",
    _subtype: "radio",
    author: "unit_blue_cp",
    channel: "TAC-1",
    text: "All elements ALPHA-6 SITREP. Breach repelled. Casualties: 1 KIA, 5 WIA, 1 BMP CAT-2 (recovered). RED losses: 2x T-72B3 destroyed, 3 of 4 Msta-S destroyed, 2x BTR-82A FPV-killed, 1x UR-77 destroyed, 1 dismount team neutralized. RED column withdrawing NE. Continue ISR coverage, expect additional probing within 4-6h.",
    entity_refs: [
      "ent_red_assault_co_01",
      "ent_red_armor_01",
      "ent_red_armor_02",
      "ent_red_arty_battery_01",
      "ent_red_engineer_01"
    ],
    classification: "cui",
    _version: 1,
    _ingested_at: "2026-05-02T08:24:00.000Z"
  },
  {
    _type: "Report",
    _id: "rep_012",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_012",
    _observed_at: "2026-05-02T08:13:30.000Z",
    _subtype: "operator",
    author: "unit_blue_cp",
    channel: "commander-notes",
    text: "Approving FPV-vs-stragglers (rec_004) under forbid-llm gating per OAG tier 3. Rationale: kinetic effects on personnel require human authorization regardless of confidence. Engagement window short — RED column withdrawal already initiated. Approve immediate, log decision, BDA via FALCON-1 EO post-action.",
    entity_refs: [
      "ent_red_assault_co_01",
      "unit_blue_fpv_team"
    ],
    classification: "cui",
    _version: 1,
    _ingested_at: "2026-05-02T08:13:30.000Z"
  },
  {
    _type: "Report",
    _id: "rep_011",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_011",
    _observed_at: "2026-05-02T08:11:00.000Z",
    _subtype: "radio",
    author: "LIGHTNING",
    channel: "FIRES-NET",
    text: "ALPHA, LIGHTNING, splash out, two M30A1 in flight to RED-BAT-7 grid 37U-CN-624, time of flight 95 seconds. Standby for BDA from FALCON-1.",
    entity_refs: [
      "ent_red_arty_battery_01",
      "unit_blue_himars_pair"
    ],
    classification: "cui",
    _version: 1,
    _ingested_at: "2026-05-02T08:11:00.000Z"
  },
  {
    _type: "Report",
    _id: "rep_003",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_003",
    _observed_at: "2026-05-02T08:08:30.000Z",
    _subtype: "radio",
    author: "PUNISHER-1",
    channel: "TAC-1",
    text: "ALPHA, PUNISHER-1, BMP-3 hit by Lancet, engine kill, crew out, two more WIA. Need CASEVAC, total three WIA. Holding line, RED dismounts neutralized, friendly FPV killing armor.",
    entity_refs: [
      "ent_red_lancet_01",
      "unit_blue_mech_pl1"
    ],
    classification: "cui",
    _version: 1,
    _ingested_at: "2026-05-02T08:08:30.000Z"
  },
  {
    _type: "Report",
    _id: "rep_010",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_010",
    _observed_at: "2026-05-02T08:06:30.000Z",
    _subtype: "radio",
    author: "HORNET",
    channel: "TAC-2",
    text: "ALPHA, HORNET, splash on T-72B3 number one, mobility kill confirmed, second pass for catastrophic kill. Cope cage dropped first FPV, second FPV through turret rear. Clear hot for follow-up targets.",
    entity_refs: [
      "ent_red_armor_01"
    ],
    classification: "cui",
    _version: 1,
    _ingested_at: "2026-05-02T08:06:30.000Z"
  },
  {
    _type: "Report",
    _id: "rep_009",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_009",
    _observed_at: "2026-05-02T07:59:30.000Z",
    _subtype: "sigint",
    author: "SIG-A",
    channel: "datalink",
    text: "Lancet-3 datalink emission detected, signature library match 0.76. Single munition airborne, vector convergent on SCOUT-1 grid. Comms degraded, low-confidence target attribution.",
    entity_refs: [
      "ent_red_lancet_01"
    ],
    classification: "confidential",
    _version: 1,
    _ingested_at: "2026-05-02T07:59:30.000Z"
  },
  {
    _type: "Report",
    _id: "rep_008",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_008",
    _observed_at: "2026-05-02T07:54:00.000Z",
    _subtype: "radio",
    author: "SCOUT-2",
    channel: "TAC-3",
    text: "ALPHA, SCOUT-2 forward, RED forward edge popped white phosphorus smoke, 600m frontage, bearing 045. Smoke hiding wheeled column movement, IR still picking up engine signatures.",
    entity_refs: [
      "ent_red_assault_co_01"
    ],
    classification: "cui",
    _version: 1,
    _ingested_at: "2026-05-02T07:54:00.000Z"
  },
  {
    _type: "Report",
    _id: "rep_007",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_007",
    _observed_at: "2026-05-02T07:48:00.000Z",
    _subtype: "sigint",
    author: "SIG-A",
    channel: "R-168",
    text: "Counter-battery analysis: crater impact azimuth 091 ± 3°, range fan 10-13 km E. Cross-fixed with R-168 fires-net source. RED-BAT-7 localization confidence rising (was 0.34, now 0.62). Recommend HIMARS prep.",
    entity_refs: [
      "ent_red_arty_battery_01",
      "ent_red_cmd_01"
    ],
    classification: "confidential",
    _version: 1,
    _ingested_at: "2026-05-02T07:48:00.000Z"
  },
  {
    _type: "Report",
    _id: "rep_002",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_002",
    _observed_at: "2026-05-02T07:47:30.000Z",
    _subtype: "radio",
    author: "PUNISHER-1",
    channel: "TAC-1",
    text: "ALPHA, PUNISHER-1, contact arty, six rounds one-five-two, take cover. One WIA, requesting LAZARUS, position holding.",
    entity_refs: [
      "ent_red_arty_battery_01"
    ],
    classification: "cui",
    _version: 1,
    _ingested_at: "2026-05-02T07:47:30.000Z"
  },
  {
    _type: "Report",
    _id: "rep_006",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_006",
    _observed_at: "2026-05-02T07:35:30.000Z",
    _subtype: "sigint",
    author: "SIG-A",
    channel: "R-168",
    text: "R-168 fires-net traffic detected on 6 narrowband freqs, burst pattern + brevity codes consistent with Russian battalion fires coordination. Bearing 091 cross-fixes with prior Leer-3 observation. Battalion-echelon C2 likely active.",
    entity_refs: [
      "ent_red_cmd_01",
      "ent_red_ew_leer3_01"
    ],
    classification: "confidential",
    _version: 1,
    _ingested_at: "2026-05-02T07:35:30.000Z"
  },
  {
    _type: "Report",
    _id: "rep_001",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_001",
    _observed_at: "2026-05-02T06:53:30.000Z",
    _subtype: "osint",
    author: "OSINT-Cell",
    channel: "@RVvoenkor",
    text: "Russian milblogger Telegram post (translated): \"The bird departed at 06:44Z, route west, target unspecified.\" Geolocates to grid 37U-CN-410 north of Donetsk via shadow-azimuth and skyline match. Strong predictor of Orlan-10 ISR sortie heading our axis.",
    entity_refs: [
      "ent_red_orlan_01"
    ],
    classification: "unclass",
    _version: 1,
    _ingested_at: "2026-05-02T06:53:30.000Z"
  },
  {
    _type: "Report",
    _id: "rep_005",
    _source: "sim:silent-eye-20260502",
    _source_ref: "rep_005",
    _observed_at: "2026-05-02T06:48:00.000Z",
    _subtype: "sigint",
    author: "SIG-A",
    channel: "L-band",
    text: "Leer-3 (RB-341V) UHF activation pattern observed at bearing 091. Library match 0.79. Historical correlation with RU offensive prep at 0.71 — recommend elevated readiness on PUNISHER axis. No SMS-spoof activity yet, suggests early window before main effort.",
    entity_refs: [
      "ent_red_ew_leer3_01"
    ],
    classification: "confidential",
    _version: 1,
    _ingested_at: "2026-05-02T06:48:00.000Z"
  }
];
