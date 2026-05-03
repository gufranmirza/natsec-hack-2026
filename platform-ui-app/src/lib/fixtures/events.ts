// Auto-generated from sim/scenarios/silent-eye-20260502/silent-eye.events.jsonl
// Do not edit by hand — re-run sim/.../compile-to-fixtures.mjs

import type { Event } from '@/types/ontology';
export const EVENTS: Event[] = [
  {
    _type: "Event",
    _id: "evt_phase9_004",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase9_004",
    _observed_at: "2026-05-02T08:25:00.000Z",
    _subtype: "position_report",
    unit_id: "unit_blue_cp",
    position: [
      48.62,
      37.74
    ],
    severity: "info",
    description: "ALPHA-6 SITREP closes demo window. Net result: breach repelled, 1 KIA / 5 WIA / 1 BMP CAT-2 (recovered), RED lost 2 tanks + 3 Msta-S + 2 BTRs + 1 UR-77 + 1 dismount team. DeepStateMap polygon delta = 0 in AO confirmed. Ready for next contact.",
    verb: "Reported.",
    payload: {
      casualties_kia: 1,
      casualties_wia: 5,
      vehicle_losses: "1x BMP CAT-2 (recovered)",
      red_losses: {
        t72b3: 2,
        msta_s: 3,
        btr82a: 2,
        ur77: 1,
        dismount_teams: 1
      },
      deepstate_delta_km2: 0,
      arc_outcome: "red_breach_repelled"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:25:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase9_003",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase9_003",
    _observed_at: "2026-05-02T08:22:00.000Z",
    _subtype: "defensive_consolidation",
    unit_id: "unit_blue_mech_pl1",
    position: [
      48.6,
      37.8
    ],
    severity: "info",
    description: "PUNISHER-1 reorganizes: damaged BMP recovered to maintenance line, casualties evacuated, perimeter resumed.",
    verb: "Consolidated.",
    payload: {
      action: "reorganization",
      wia_evacuated: 3,
      vehicles_recovered: 1
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:22:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase9_002",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase9_002",
    _observed_at: "2026-05-02T08:20:00.000Z",
    _subtype: "track_lost",
    entity_id: "ent_red_assault_co_01",
    unit_id: "unit_blue_uas_falcon1",
    position: [
      48.78,
      37.96
    ],
    severity: "info",
    description: "FALCON-1 EO range exceeded. RED column passed beyond observation horizon.",
    verb: "Lost.",
    payload: {
      loss_cause: "sensor_range_exceeded",
      last_known_bearing_deg: 45
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:20:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase9_001",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase9_001",
    _observed_at: "2026-05-02T08:18:00.000Z",
    _subtype: "withdrawal",
    entity_id: "ent_red_assault_co_01",
    position: [
      48.74,
      37.93
    ],
    severity: "warn",
    description: "Surviving RED-ASSAULT-1 elements withdraw NE toward depth positions. Estimated 5-6 BTR-82A still operational.",
    verb: "Withdrew.",
    payload: {
      bearing_deg: 45,
      surviving_strength_estimate: "5-6 BTR-82A",
      destination: "red_depth_position"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:18:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase8_007",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase8_007",
    _observed_at: "2026-05-02T08:17:00.000Z",
    _subtype: "visual_detection",
    entity_id: "ent_red_dismount_03",
    unit_id: "unit_rook1",
    position: [
      48.74,
      37.94
    ],
    severity: "warn",
    description: "ROOK-1 EO: dismounted RED team approaching RED-ARMOR-1 wreck, attempting to recover wounded. ~6 personnel.",
    verb: "Detected.",
    payload: {
      sensor: "eo",
      detection_confidence: 0.71,
      activity: "casualty_recovery"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:17:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase8_006",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase8_006",
    _observed_at: "2026-05-02T08:15:00.000Z",
    _subtype: "comms_outage",
    entity_id: "ent_red_cmd_01",
    position: [
      48.78,
      38.05
    ],
    severity: "warn",
    description: "RED command-net silent for 90s. C2 disruption likely — possibly relocating after counter-battery threat.",
    verb: "Silent.",
    payload: {
      silence_duration_s: 90,
      likely_cause: "displacement_after_himars_threat"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:15:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase8_005",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase8_005",
    _observed_at: "2026-05-02T08:14:00.000Z",
    _subtype: "fpv_strike",
    entity_id: "ent_red_assault_co_01",
    unit_id: "unit_blue_fpv_team",
    position: [
      48.74,
      37.92
    ],
    severity: "critical",
    description: "HORNET FPV pass on RED-ASSAULT-1 stragglers. 2 BTR-82A destroyed in single sortie.",
    verb: "Struck.",
    payload: {
      weapon: "fpv_one_way_attack",
      kill_count: 2,
      target_subtype: "BTR-82A"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:14:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase8_004",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase8_004",
    _observed_at: "2026-05-02T08:13:00.000Z",
    _subtype: "unit_destroyed",
    entity_id: "ent_red_armor_02",
    position: [
      48.75,
      37.95
    ],
    severity: "critical",
    description: "RED-ARMOR-2 confirmed destroyed. Both T-72B3 attached to assault element neutralized.",
    verb: "Destroyed.",
    payload: {
      destruction_cause: "fpv_strike",
      attributed_unit: "unit_blue_fpv_team"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:13:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase8_003",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase8_003",
    _observed_at: "2026-05-02T08:12:30.000Z",
    _subtype: "fpv_strike",
    entity_id: "ent_red_armor_02",
    unit_id: "unit_blue_fpv_team",
    position: [
      48.75,
      37.95
    ],
    severity: "critical",
    description: "HORNET FPV destroys RED-ARMOR-2. Cope cage failure on top-attack profile.",
    verb: "Struck.",
    payload: {
      weapon: "fpv_one_way_attack",
      attack_profile: "top_attack",
      cope_cage_outcome: "failure"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:12:30.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase8_002",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase8_002",
    _observed_at: "2026-05-02T08:12:00.000Z",
    _subtype: "unit_destroyed",
    entity_id: "ent_red_arty_battery_01",
    position: [
      48.65,
      38.03
    ],
    severity: "critical",
    description: "Msta-S battery (RED-BAT-7) struck. 3 of 4 SPHs confirmed destroyed by HIMARS counter-battery. Surviving tube displaces.",
    verb: "Destroyed.",
    payload: {
      destruction_cause: "himars_counter_battery",
      attributed_unit: "unit_blue_himars_pair",
      kill_count: 3,
      survivors: 1
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:12:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase8_001",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase8_001",
    _observed_at: "2026-05-02T08:10:30.000Z",
    _subtype: "missile_launch",
    unit_id: "unit_blue_himars_pair",
    position: [
      48.6,
      37.1
    ],
    severity: "critical",
    description: "LIGHTNING shot, 2x M30A1 alternate-warhead rounds in flight to RED-BAT-7 grid. Time of flight ~95s.",
    verb: "Launched.",
    payload: {
      weapon: "M30A1",
      rounds: 2,
      target_entity: "ent_red_arty_battery_01",
      time_of_flight_s: 95
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:10:30.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase7_006",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase7_006",
    _observed_at: "2026-05-02T08:08:00.000Z",
    _subtype: "unit_damaged",
    unit_id: "unit_blue_mech_pl1",
    position: [
      48.6,
      37.8
    ],
    severity: "critical",
    description: "PUNISHER-1: 1 BMP immobilized by Lancet-1 strike on engine deck. Crew evacuated, 2 additional WIA.",
    verb: "Damaged.",
    payload: {
      damaged_vehicle: "BMP-2 #3",
      damage_state: "CAT-2_mobility_kill",
      new_wia: 2,
      crew_evacuation: "complete"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:08:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase7_005",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase7_005",
    _observed_at: "2026-05-02T08:07:30.000Z",
    _subtype: "track_acquired",
    entity_id: "ent_red_arty_battery_01",
    position: [
      48.65,
      38.03
    ],
    severity: "warn",
    description: "RF source localization upgrade: SIG-A direction-finding cross + crater back-azimuth + R-168 fires-net traffic correlation. RED-BAT-7 confirmed at grid 37U-CN-624. Conf 0.81.",
    verb: "Localized.",
    payload: {
      new_confidence: 0.81,
      localization_method: "df_cross+crater_azimuth+rf_correlation",
      grid: "37U-CN-624"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:07:30.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase7_004",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase7_004",
    _observed_at: "2026-05-02T08:07:00.000Z",
    _subtype: "unit_destroyed",
    entity_id: "ent_red_dismount_01",
    position: [
      48.703,
      37.81
    ],
    severity: "warn",
    description: "RED-DM-1 neutralized by PUNISHER-1 small arms + 30mm cannon.",
    verb: "Neutralized.",
    payload: {
      destruction_cause: "small_arms_and_30mm",
      attributed_unit: "unit_blue_mech_pl1"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:07:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase7_003",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase7_003",
    _observed_at: "2026-05-02T08:06:30.000Z",
    _subtype: "unit_destroyed",
    entity_id: "ent_red_armor_01",
    position: [
      48.74,
      37.94
    ],
    severity: "critical",
    description: "RED-ARMOR-1 confirmed destroyed. Crew presumed combat-ineffective.",
    verb: "Destroyed.",
    payload: {
      destruction_cause: "fpv_strike",
      attributed_unit: "unit_blue_fpv_team"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:06:30.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase7_002",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase7_002",
    _observed_at: "2026-05-02T08:06:00.000Z",
    _subtype: "fpv_strike",
    entity_id: "ent_red_armor_01",
    unit_id: "unit_blue_fpv_team",
    position: [
      48.74,
      37.94
    ],
    severity: "critical",
    description: "HORNET FPV strike on RED-ARMOR-1. Cope cage absorbed first hit; second FPV penetrated turret rear, mobility kill confirmed.",
    verb: "Struck.",
    payload: {
      weapon: "fpv_one_way_attack",
      strike_outcome: "mobility_kill",
      penetration_path: "turret_rear",
      fpv_count: 2
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:06:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase7_001",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase7_001",
    _observed_at: "2026-05-02T08:05:30.000Z",
    _subtype: "small_arms_contact",
    entity_id: "ent_red_dismount_01",
    unit_id: "unit_blue_mech_pl1",
    position: [
      48.703,
      37.81
    ],
    severity: "critical",
    description: "PUNISHER-1 in contact with RED dismounts at 250m. Suppressive fire, RED held in tree line.",
    verb: "Engaged.",
    payload: {
      engagement_range_m: 250,
      red_action: "suppressed_in_tree_line",
      blue_posture: "defending"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:05:30.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase6_008",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase6_008",
    _observed_at: "2026-05-02T08:04:00.000Z",
    _subtype: "fpv_strike",
    entity_id: "ent_red_engineer_01",
    unit_id: "unit_blue_fpv_team",
    position: [
      48.71,
      37.86
    ],
    severity: "critical",
    description: "HORNET FPV destroys UR-77 mid-deployment. Breach lane denied. RED engineer element non-functional.",
    verb: "Struck.",
    payload: {
      weapon: "fpv_one_way_attack",
      strike_outcome: "target_destroyed",
      cope_cage_present: "false",
      secondary_explosion: "true"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:04:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase6_007",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase6_007",
    _observed_at: "2026-05-02T08:03:00.000Z",
    _subtype: "breach_attempt",
    entity_id: "ent_red_engineer_01",
    position: [
      48.71,
      37.86
    ],
    severity: "critical",
    description: "UR-77 Meteorit deploys mine-clearing line charge across UA obstacle belt. Breach lane opening.",
    verb: "Breaching.",
    payload: {
      breach_method: "line_charge",
      breach_lane_width_m: 6,
      breach_lane_length_m: 140
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:03:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase6_006",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase6_006",
    _observed_at: "2026-05-02T08:00:00.000Z",
    _subtype: "loitering_munition_engage",
    entity_id: "ent_red_lancet_01",
    unit_id: "unit_blue_recon_team1",
    position: [
      48.7,
      37.88
    ],
    severity: "critical",
    description: "LANCET-1 enters loiter pattern over SCOUT-1 area. Acquisition under degraded comms; outcome uncertain.",
    verb: "Loitering.",
    payload: {
      target_unit_likely: "unit_blue_recon_team1",
      target_uncertainty: "high",
      comms_state: "degraded"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:00:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase6_005",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase6_005",
    _observed_at: "2026-05-02T07:57:00.000Z",
    _subtype: "medevac_dispatched",
    unit_id: "unit_blue_medical",
    position: [
      48.63,
      37.72
    ],
    severity: "info",
    description: "LAZARUS dispatched to PUNISHER-1 location. Route via grid 37U-CM-589 to avoid impact corridor.",
    verb: "Dispatched.",
    payload: {
      target_unit: "unit_blue_mech_pl1",
      route_grid: "37U-CM-589",
      eta_min: 4
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:57:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase6_004",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase6_004",
    _observed_at: "2026-05-02T07:55:00.000Z",
    _subtype: "rf_ping",
    entity_id: "ent_red_cmd_01",
    position: [
      48.78,
      38.05
    ],
    severity: "info",
    description: "RED command-net traffic spike, R-168 multi-channel burst pattern. Battalion-echelon fires coordination.",
    verb: "Pinged.",
    payload: {
      band: "R-168",
      traffic_pattern: "burst",
      correlation: "fires_coordination"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:55:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase6_003",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase6_003",
    _observed_at: "2026-05-02T07:53:00.000Z",
    _subtype: "ground_advance",
    entity_id: "ent_red_assault_co_01",
    position: [
      48.71,
      37.88
    ],
    severity: "critical",
    description: "RED-ASSAULT-1 column advances ~800m toward UA obstacle belt. Bearing toward PUNISHER-1 prepared positions.",
    verb: "Advanced.",
    payload: {
      distance_m: 800,
      bearing_to_blue_main: "south-southwest",
      obstacle_belt_distance_m: 300
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:53:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase6_002",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase6_002",
    _observed_at: "2026-05-02T07:51:00.000Z",
    _subtype: "terrain_obscuration",
    unit_id: "unit_blue_uas_falcon1",
    position: [
      48.72,
      37.9
    ],
    severity: "warn",
    description: "FALCON-1 EO confidence drops to 0.41 in smoke-affected sector. IR remains nominal.",
    verb: "Obscured.",
    payload: {
      sensor_affected: "eo",
      sensor_alt: "ir",
      eo_confidence: 0.41,
      ir_confidence: 0.79
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:51:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase6_001",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase6_001",
    _observed_at: "2026-05-02T07:50:00.000Z",
    _subtype: "smoke_screen",
    entity_id: "ent_red_assault_co_01",
    position: [
      48.72,
      37.9
    ],
    severity: "warn",
    description: "RED forward edge deploys smoke. Visual coverage of approach axis degrading.",
    verb: "Screened.",
    payload: {
      smoke_type: "phosphorus_burst",
      frontage_m: 600
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:50:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase5_006",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase5_006",
    _observed_at: "2026-05-02T07:47:00.000Z",
    _subtype: "casevac_request",
    unit_id: "unit_blue_mech_pl1",
    position: [
      48.6,
      37.8
    ],
    severity: "critical",
    description: "PUNISHER-1: 1 WIA from artillery fragment, requests CASEVAC. Position holding, BMPs operational.",
    verb: "Requested.",
    payload: {
      wia: 1,
      kia: 0,
      vehicle_status: "all_operational",
      priority: "urgent"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:47:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase5_005",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase5_005",
    _observed_at: "2026-05-02T07:46:00.000Z",
    _subtype: "artillery_impact",
    entity_id: "ent_red_arty_battery_01",
    unit_id: "unit_blue_mech_pl1",
    position: [
      48.6,
      37.8
    ],
    severity: "critical",
    description: "Adjustment lands. 6 rounds 152mm on PUNISHER-1 line, fragments through canopy positions.",
    verb: "Impacted.",
    payload: {
      caliber_mm: 152,
      rounds: 6,
      target_unit: "unit_blue_mech_pl1",
      crater_pattern: "linear-tight"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:46:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase5_004",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase5_004",
    _observed_at: "2026-05-02T07:45:00.000Z",
    _subtype: "artillery_impact",
    entity_id: "ent_red_arty_battery_01",
    position: [
      48.602,
      37.792
    ],
    severity: "critical",
    description: "First 152mm rounds impact 200m short of PUNISHER-1 prepared positions. Spotter adjustment expected.",
    verb: "Impacted.",
    payload: {
      caliber_mm: 152,
      rounds: 2,
      impact_offset_m: 200,
      target_unit: "unit_blue_mech_pl1",
      crater_pattern: "linear"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:45:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase5_003",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase5_003",
    _observed_at: "2026-05-02T07:43:00.000Z",
    _subtype: "comms_outage",
    unit_id: "unit_blue_recon_team1",
    position: [
      48.58,
      37.86
    ],
    severity: "warn",
    description: "SCOUT-1 datalink degraded by Leer-3 jamming, falling back to HF voice for SITREP relay.",
    verb: "Degraded.",
    payload: {
      primary_link: "datalink",
      fallback: "hf_voice",
      attributed_emitter: "ent_red_ew_leer3_01"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:43:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase5_002",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase5_002",
    _observed_at: "2026-05-02T07:42:00.000Z",
    _subtype: "gps_denied_zone",
    unit_id: "unit_rook2",
    position: [
      48.55,
      37.82
    ],
    severity: "warn",
    description: "ROOK-2 falls back to MAVLink local-frame dead reckoning. Position uncertainty growing 5 m/s.",
    verb: "Denied.",
    payload: {
      fallback_mode: "mavlink_local_frame",
      drift_rate_mps: 5
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:42:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase5_001",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase5_001",
    _observed_at: "2026-05-02T07:41:00.000Z",
    _subtype: "jam_pulse",
    unit_id: "unit_rook2",
    position: [
      48.55,
      37.82
    ],
    severity: "warn",
    description: "UHF jamming detected, 18s burst. ROOK-2 dropped GPS lock. Origin direction-finds to Leer-3 vector (091).",
    verb: "Jammed.",
    payload: {
      duration_s: 18,
      affected_band: "UHF",
      attributed_emitter: "ent_red_ew_leer3_01",
      gps_loss: "true"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:41:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase4_002",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase4_002",
    _observed_at: "2026-05-02T07:40:00.000Z",
    _subtype: "visual_detection",
    entity_id: "ent_red_armor_01",
    unit_id: "unit_rook1",
    position: [
      48.74,
      37.94
    ],
    severity: "critical",
    description: "ROOK-1 EO confirms two T-72B3 tanks attached to RED-ASSAULT-1 column. Cope cages present. Conf 0.92.",
    verb: "Confirmed.",
    payload: {
      sensor: "eo",
      detection_confidence: 0.92,
      composition_addition: "2x T-72B3",
      cope_cages: "observed"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:40:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase4_001",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase4_001",
    _observed_at: "2026-05-02T07:36:00.000Z",
    _subtype: "classification_upgrade",
    entity_id: "ent_red_assault_co_01",
    position: [
      48.74,
      37.92
    ],
    severity: "critical",
    description: "Fusion: column formation + bearing-toward-PUNISHER-1 + DeepState polygon edge proximity + Leer-3 EW prep + Orlan ISR overhead all consistent with deliberate attack. Reclassify hostile, conf 0.88.",
    verb: "Reclassified.",
    payload: {
      new_affiliation: "hostile",
      new_confidence: 0.88,
      new_threat_level: "high",
      evidence_event_ids: [
        "evt_phase3_006",
        "evt_phase1_003",
        "evt_phase2_003"
      ],
      correlated_pattern: "deliberate_attack_signature"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:36:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase3_006",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase3_006",
    _observed_at: "2026-05-02T07:35:00.000Z",
    _subtype: "visual_detection",
    entity_id: "ent_red_assault_co_01",
    unit_id: "unit_blue_uas_falcon1",
    position: [
      48.74,
      37.92
    ],
    severity: "warn",
    description: "FALCON-1 EO at 3200m: column of 8+ tracked/wheeled vehicles in approach formation, hull-down terrain. Composition unclear at range, likely RED motorized rifle element.",
    verb: "Detected.",
    payload: {
      sensor: "eo",
      vehicle_count_estimate: "8+",
      formation: "column_approach",
      detection_confidence: 0.65,
      composition_uncertainty: "high"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:35:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase3_005",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase3_005",
    _observed_at: "2026-05-02T07:30:00.000Z",
    _subtype: "visual_detection",
    entity_id: "ent_civ_truck_01",
    unit_id: "unit_blue_uas_falcon1",
    position: [
      48.71,
      37.55
    ],
    severity: "info",
    description: "FALCON-1 EO clutter pickup on civilian truck transiting M-03. Auto-classified non-combatant.",
    verb: "Detected.",
    payload: {
      sensor: "eo",
      auto_classification: "civilian",
      threat_assessment: "none"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:30:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase3_004",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase3_004",
    _observed_at: "2026-05-02T07:25:00.000Z",
    _subtype: "position_report",
    unit_id: "unit_blue_recon_team1",
    position: [
      48.71,
      37.55
    ],
    severity: "info",
    description: "SCOUT-1: civilian utility truck observed transiting M-03 westbound, no military signatures. Filed for awareness only.",
    verb: "Reported.",
    payload: {
      observed_entity: "ent_civ_truck_01",
      threat_assessment: "none"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:25:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase3_003",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase3_003",
    _observed_at: "2026-05-02T07:15:00.000Z",
    _subtype: "regained_track",
    entity_id: "ent_red_orlan_01",
    unit_id: "unit_blue_uas_falcon1",
    position: [
      48.86,
      37.7
    ],
    severity: "info",
    description: "FALCON-1 IR reacquires Orlan as it emerges from cloud. Continuous track resumed, conf 0.78.",
    verb: "Reacquired.",
    payload: {
      sensor: "ir",
      track_confidence: 0.78
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:15:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase3_002",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase3_002",
    _observed_at: "2026-05-02T07:10:00.000Z",
    _subtype: "track_lost",
    entity_id: "ent_red_orlan_01",
    unit_id: "unit_rook1",
    position: [
      48.86,
      37.7
    ],
    severity: "warn",
    description: "ROOK-1 EO track lost as Orlan crosses cloud cover. Reverting to RF-only tracking via SIG-A.",
    verb: "Lost.",
    payload: {
      loss_cause: "cloud_cover",
      fallback_track: "rf_only"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:10:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase3_001",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase3_001",
    _observed_at: "2026-05-02T07:07:00.000Z",
    _subtype: "visual_detection",
    entity_id: "ent_red_orlan_01",
    unit_id: "unit_rook1",
    position: [
      48.86,
      37.7
    ],
    severity: "info",
    description: "ROOK-1 EO confirms Orlan-10 silhouette at 1800m altitude. Confidence 0.91. Twin-tail pusher-prop airframe, low-observable scheme.",
    verb: "Confirmed.",
    payload: {
      sensor: "eo",
      detection_confidence: 0.91,
      airframe: "twin-tail-pusher"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:07:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase2_004",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase2_004",
    _observed_at: "2026-05-02T07:05:00.000Z",
    _subtype: "cued_search",
    entity_id: "ent_red_orlan_01",
    unit_id: "unit_rook1",
    position: [
      48.65,
      37.78
    ],
    severity: "info",
    description: "ROOK-1 vectored to Orlan suspected position to obtain optical confirmation. Bearing 071 from current position, range ~18 km.",
    verb: "Vectored.",
    payload: {
      vector_bearing_deg: 71,
      vector_range_km: 18,
      target_entity: "ent_red_orlan_01"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:05:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase2_003",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase2_003",
    _observed_at: "2026-05-02T07:00:00.000Z",
    _subtype: "classification_upgrade",
    entity_id: "ent_red_orlan_01",
    position: [
      48.86,
      37.7
    ],
    severity: "warn",
    description: "Fusion: RF intercept (0.84) + IR track (0.71) + OSINT geotag corroborate Orlan-10. Reclassify hostile, confidence 0.86.",
    verb: "Reclassified.",
    payload: {
      new_affiliation: "hostile",
      new_confidence: 0.86,
      new_threat_level: "med",
      evidence_event_ids: [
        "evt_phase1_004",
        "evt_phase2_002",
        "evt_phase2_001"
      ]
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:00:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase2_002",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase2_002",
    _observed_at: "2026-05-02T06:55:00.000Z",
    _subtype: "track_acquired",
    entity_id: "ent_red_orlan_01",
    unit_id: "unit_blue_uas_falcon1",
    position: [
      48.86,
      37.7
    ],
    severity: "info",
    description: "FALCON-1 IR sensor confirms airborne contact at 1800m, signature consistent with Orlan-class twin-tail pusher. Track confidence 0.71.",
    verb: "Tracked.",
    payload: {
      sensor: "ir",
      tracking_unit: "unit_blue_uas_falcon1",
      signature_match: "orlan_silhouette",
      track_confidence: 0.71
    },
    _version: 1,
    _ingested_at: "2026-05-02T06:55:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase2_001",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase2_001",
    _observed_at: "2026-05-02T06:53:00.000Z",
    _subtype: "geotagged_social_post",
    entity_id: "ent_red_orlan_01",
    position: [
      48.05,
      37.8
    ],
    severity: "info",
    description: "OSINT pickup: Telegram channel @RVvoenkor — photo geolocates near Donetsk N, caption suggests Orlan-10 launch (translated: 'bird departed'). Timestamp 6 min before our RF acquisition.",
    verb: "Tagged.",
    payload: {
      source_channel: "@RVvoenkor",
      post_id: "telegram_quoted_via_bellingcat_2026q2",
      geolocation_basis: "shadow-azimuth-and-skyline",
      time_offset_min: -6
    },
    _version: 1,
    _ingested_at: "2026-05-02T06:53:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase1_004",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase1_004",
    _observed_at: "2026-05-02T06:50:00.000Z",
    _subtype: "rf_ping",
    entity_id: "ent_red_orlan_01",
    position: [
      48.86,
      37.7
    ],
    severity: "warn",
    description: "L-band emission, freq 901.4 MHz, bearing 271, signature match Orlan-10 control link confidence 0.84. Track persistent 90s+, suggests Orlan launched and on station.",
    verb: "Pinged.",
    payload: {
      band: "L",
      freq_mhz: 901.4,
      bearing_deg: 271,
      signature_match: "orlan_10_uplink",
      match_confidence: 0.84,
      track_persistence_s: 94
    },
    _version: 1,
    _ingested_at: "2026-05-02T06:50:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase1_003",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase1_003",
    _observed_at: "2026-05-02T06:47:00.000Z",
    _subtype: "sigint_intercept",
    entity_id: "ent_red_ew_leer3_01",
    position: [
      48.78,
      37.95
    ],
    severity: "warn",
    description: "SIG-A: pattern consistent with EW activation prep. Leer-3 typically provides ISR uplink + tactical jamming for offensive operations. Heads up.",
    verb: "Analyzed.",
    payload: {
      channel: "L-band",
      author: "SIG-A",
      analysis_basis: "signature_pattern_lookup",
      historical_correlation: "red_offensive_prep_signature_0.71"
    },
    _version: 1,
    _ingested_at: "2026-05-02T06:47:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase1_002",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase1_002",
    _observed_at: "2026-05-02T06:45:00.000Z",
    _subtype: "rf_ping",
    entity_id: "ent_red_ew_leer3_01",
    position: [
      48.78,
      37.95
    ],
    severity: "info",
    description: "UHF emission burst, bearing 091, signature library: Leer-3 EW (RB-341V). Brief activation, possibly link check.",
    verb: "Pinged.",
    payload: {
      band: "UHF",
      bearing_deg: 91,
      signature_match: "leer3_uhf",
      match_confidence: 0.79,
      duration_s: 4
    },
    _version: 1,
    _ingested_at: "2026-05-02T06:45:00.000Z"
  },
  {
    _type: "Event",
    _id: "evt_phase1_001",
    _source: "sim:silent-eye-20260502",
    _source_ref: "evt_phase1_001",
    _observed_at: "2026-05-02T06:40:00.000Z",
    _subtype: "position_report",
    unit_id: "unit_blue_cp",
    position: [
      48.62,
      37.74
    ],
    severity: "info",
    description: "ALPHA-6 morning standup. PUNISHER-1, SCOUT-1, SCOUT-2 in prepared positions. ROOK-1 / ROOK-2 / FALCON-1 on station. HIMARS LIGHTNING in support range. All elements green. Visibility 1500m, light fog clearing.",
    verb: "Reported.",
    payload: {
      all_green: true,
      visibility_m: 1500,
      weather: "light_fog_clearing"
    },
    _version: 1,
    _ingested_at: "2026-05-02T06:40:00.000Z"
  }
];
