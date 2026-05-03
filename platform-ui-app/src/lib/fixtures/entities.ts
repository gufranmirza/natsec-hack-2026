// Auto-generated from sim/scenarios/silent-eye-20260502/silent-eye.events.jsonl
// Do not edit by hand — re-run sim/.../compile-to-fixtures.mjs

import type { Entity } from '@/types/ontology';
export const ENTITIES: Entity[] = [
  {
    _type: "Entity",
    _id: "ent_red_assault_co_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_assault_co_01_withdraw",
    _observed_at: "2026-05-02T08:18:30.000Z",
    _subtype: "Vehicle",
    affiliation: "hostile",
    name: "RED-ASSAULT-1",
    position: [
      48.74,
      37.93
    ],
    heading_deg: 45,
    speed_mps: 18,
    confidence: 0.71,
    threat_level: "med",
    attributes: {
      class: "motorized rifle company",
      platform: "5-6x BTR-82A surviving",
      platform_role: "Russian motorized rifle assault element withdrawing NE",
      note: "surviving elements after BLUE counter-fire"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:18:30.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_dismount_03",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_dismount_03",
    _observed_at: "2026-05-02T08:17:00.000Z",
    _subtype: "Person",
    affiliation: "hostile",
    name: "RED-DM-3",
    position: [
      48.74,
      37.94
    ],
    heading_deg: 70,
    speed_mps: 0.8,
    confidence: 0.71,
    threat_level: "med",
    attributes: {
      class: "dismounted recovery team",
      platform_role: "Russian wounded recovery, ~6 personnel near RED-ARMOR-1 wreck",
      signature_ir: "warm-cluster"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:17:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_dismount_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_dismount_01",
    _observed_at: "2026-05-02T08:05:30.000Z",
    _subtype: "Person",
    affiliation: "hostile",
    name: "RED-DM-1",
    position: [
      48.705,
      37.82
    ],
    heading_deg: 230,
    speed_mps: 1.4,
    confidence: 0.74,
    threat_level: "high",
    attributes: {
      class: "dismounted infantry team",
      platform_role: "Russian motorized rifle dismount, ~8 personnel",
      signature_ir: "warm-cluster",
      weapon: "AK-12, RPG-7, 7.62mm PKM"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:05:30.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_engineer_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_engineer_01",
    _observed_at: "2026-05-02T08:03:00.000Z",
    _subtype: "Vehicle",
    affiliation: "hostile",
    name: "RED-ENG-1",
    position: [
      48.71,
      37.86
    ],
    heading_deg: 230,
    speed_mps: 4,
    confidence: 0.87,
    threat_level: "high",
    attributes: {
      class: "UR-77 Meteorit + IMR-2 escort",
      platform_role: "Russian mine-clearing line charge + engineering breach",
      signature_visual: "tracked-with-rocket-charge"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:03:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_lancet_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_lancet_01",
    _observed_at: "2026-05-02T08:00:00.000Z",
    _subtype: "Aircraft",
    affiliation: "hostile",
    name: "LANCET-1",
    position: [
      48.7,
      37.88
    ],
    altitude_m: 600,
    heading_deg: 260,
    speed_mps: 31,
    confidence: 0.81,
    threat_level: "high",
    attributes: {
      class: "Lancet-3 (Izdeliye-52)",
      platform_role: "Russian loitering munition",
      signature_visual: "x-wing-small",
      signature_ir: "hot-prop",
      warhead_kg: "3-5",
      endurance_min: "40",
      cruise_mps: "30-40"
    },
    _version: 1,
    _ingested_at: "2026-05-02T08:00:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_cmd_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_cmd_01",
    _observed_at: "2026-05-02T07:55:00.000Z",
    _subtype: "Vehicle",
    affiliation: "hostile",
    name: "RED-BN-COMMAND",
    position: [
      48.78,
      38.05
    ],
    confidence: 0.55,
    threat_level: "med",
    attributes: {
      class: "R-149 BMR command vehicle",
      platform_role: "Russian battalion command, providing fires support to assault",
      signature_rf: "r-168-multi-channel-burst",
      off_map: "true",
      echelon: "battalion"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:55:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_grad_battery_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_grad_battery_01",
    _observed_at: "2026-05-02T07:50:00.000Z",
    _subtype: "Vehicle",
    affiliation: "hostile",
    name: "RED-GRAD-3",
    position: [
      48.62,
      38.04
    ],
    confidence: 0.51,
    threat_level: "med",
    attributes: {
      class: "BM-21 Grad battery",
      platform: "6x BM-21 Grad MRL",
      platform_role: "Russian battalion-level area-fires MRL",
      caliber_mm: "122",
      tubes: "40 per launcher",
      off_map: "true",
      activity: "observed_but_not_firing",
      note: "second RED indirect-fires asset in AO; did not engage in this window"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:50:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_armor_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_armor_01",
    _observed_at: "2026-05-02T07:40:00.000Z",
    _subtype: "Vehicle",
    affiliation: "hostile",
    name: "RED-ARMOR-1",
    position: [
      48.74,
      37.94
    ],
    heading_deg: 250,
    speed_mps: 10,
    confidence: 0.92,
    threat_level: "high",
    attributes: {
      class: "T-72B3",
      platform_role: "Russian main battle tank",
      signature_visual: "tracked-armor-with-cope-cage",
      signature_ir: "hot-engine-deck",
      main_gun: "125mm 2A46M",
      weight_t: "44.5",
      road_speed_kmh: "60",
      crew: "3",
      cope_cage_present: "true"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:40:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_armor_02",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_armor_02",
    _observed_at: "2026-05-02T07:40:00.000Z",
    _subtype: "Vehicle",
    affiliation: "hostile",
    name: "RED-ARMOR-2",
    position: [
      48.75,
      37.95
    ],
    heading_deg: 250,
    speed_mps: 10,
    confidence: 0.92,
    threat_level: "high",
    attributes: {
      class: "T-72B3",
      platform_role: "Russian main battle tank",
      signature_visual: "tracked-armor-with-cope-cage",
      signature_ir: "hot-engine-deck",
      main_gun: "125mm 2A46M",
      cope_cage_present: "true"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:40:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_arty_battery_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_arty_battery_01",
    _observed_at: "2026-05-02T07:40:00.000Z",
    _subtype: "Vehicle",
    affiliation: "unknown",
    name: "RED-BAT-7",
    position: [
      48.65,
      38.03
    ],
    confidence: 0.34,
    threat_level: "low",
    attributes: {
      class: "2S19 Msta-S battery",
      platform: "4x 152mm self-propelled howitzer",
      platform_role: "Russian battalion fire support",
      signature_rf: "r-168-fhf",
      caliber_mm: "152",
      max_range_km: "24",
      standoff_km: "~12",
      off_map: "true"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:40:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_civ_truck_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_civ_truck_01_moving",
    _observed_at: "2026-05-02T07:25:00.000Z",
    _subtype: "Vehicle",
    affiliation: "neutral",
    name: "CIV-TRK-A",
    position: [
      48.69,
      37.5
    ],
    heading_deg: 280,
    speed_mps: 17,
    confidence: 0.81,
    threat_level: "none",
    attributes: {
      class: "civilian utility truck",
      platform_role: "non-combatant",
      route: "M-03 highway westbound, ~3 km from initial observation"
    },
    _version: 1,
    _ingested_at: "2026-05-02T07:25:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_orlan_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_orlan_01",
    _observed_at: "2026-05-02T06:50:00.000Z",
    _subtype: "Aircraft",
    affiliation: "unknown",
    name: "ORLAN-10",
    position: [
      48.86,
      37.7
    ],
    altitude_m: 1800,
    heading_deg: 270,
    speed_mps: 35,
    confidence: 0.42,
    threat_level: "low",
    attributes: {
      class: "Orlan-10",
      platform_role: "Russian primary ISR UAV",
      signature_rf: "l-band-901-mhz-uplink",
      signature_visual: "twin-tail-pusher-prop-low-observable",
      signature_ir: "low",
      nominal_speed_mps: "40",
      endurance_h: "16",
      parent_formation: "unknown_red_isr_unit"
    },
    _version: 1,
    _ingested_at: "2026-05-02T06:50:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_red_ew_leer3_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_red_ew_leer3_01",
    _observed_at: "2026-05-02T06:45:00.000Z",
    _subtype: "Vehicle",
    affiliation: "unknown",
    name: "LEER-3",
    position: [
      48.78,
      37.95
    ],
    confidence: 0.41,
    threat_level: "low",
    attributes: {
      class: "Leer-3 EW (RB-341V)",
      platform_role: "Russian electronic warfare system",
      signature_rf: "uhf-vhf-jam-and-intercept",
      signature_visual: "vehicle-mounted-eo",
      parent_formation: "unknown_red_ew_unit"
    },
    _version: 1,
    _ingested_at: "2026-05-02T06:45:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_civ_car_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_civ_car_01",
    _observed_at: "2026-05-02T06:25:00.000Z",
    _subtype: "Vehicle",
    affiliation: "neutral",
    name: "CIV-CAR-1",
    position: [
      48.52,
      37.62
    ],
    heading_deg: 350,
    speed_mps: 18,
    confidence: 0.65,
    threat_level: "none",
    attributes: {
      class: "civilian car",
      platform_role: "non-combatant"
    },
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  },
  {
    _type: "Entity",
    _id: "ent_civ_air_01",
    _source: "sim:silent-eye-20260502",
    _source_ref: "ent_civ_air_01",
    _observed_at: "2026-05-02T06:25:00.000Z",
    _subtype: "Aircraft",
    affiliation: "neutral",
    name: "TWA-247",
    position: [
      48.6,
      37.5
    ],
    altitude_m: 11270,
    heading_deg: 265,
    speed_mps: 245,
    confidence: 0.99,
    threat_level: "none",
    attributes: {
      class: "civilian airliner",
      platform_role: "FL370 transit",
      ads_b_squawk: "6712"
    },
    _version: 1,
    _ingested_at: "2026-05-02T06:25:00.000Z"
  }
];
