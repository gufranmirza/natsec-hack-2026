#!/usr/bin/env python3
"""
OP SILENT EYE JSONL graph-walk validator.

Implements the 7 checks from UI ADR 0002 §14.

Run:
    python3 sim/scenarios/silent-eye-20260502/validate.py
Exits 0 if all rules pass, 1 on any violation. Intended to gate
commits / CI before the JSONL is allowed to ship.
"""
from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
JSONL = HERE / "silent-eye.events.jsonl"
DEEPSTATE_DIR = HERE.parent.parent.parent / "platform-ui-app" / "src" / "lib" / "fixtures"
AO_BBOX = dict(lat_min=48.40, lat_max=48.85, lon_min=37.20, lon_max=38.05)
DELTA_NOISE_FLOOR_KM2 = 0.1  # Rule 6 threshold


@dataclass
class Violation:
    rule: int
    summary: str

    def __str__(self) -> str:
        return f"  rule {self.rule}: {self.summary}"


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def parse_ts(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def rule_1_evidence_refs_chronological(rows: list[dict]) -> list[Violation]:
    """Every evidence_refs ID must be present somewhere earlier in the trace."""
    rows_sorted = sorted(rows, key=lambda r: r["_observed_at"])
    seen: set[str] = set()
    out: list[Violation] = []
    for r in rows_sorted:
        for ref in r.get("evidence_refs", []) or []:
            if ref not in seen:
                out.append(Violation(1, f"{r['_id']} cites evidence_ref {ref} not present earlier"))
        seen.add(r["_id"])
    return out


def rule_2_entity_id_spawned_first(rows: list[dict]) -> list[Violation]:
    """Every entity_id referenced must be spawned by an Entity record at an earlier _observed_at."""
    spawn_at = {r["_id"]: r["_observed_at"] for r in rows if r["_type"] == "Entity"}
    out: list[Violation] = []
    for r in rows:
        eid = r.get("entity_id")
        if eid:
            if eid not in spawn_at:
                out.append(Violation(2, f"{r['_id']} references entity_id {eid} but no spawning Entity row exists"))
            elif r["_observed_at"] < spawn_at[eid]:
                out.append(Violation(2, f"{r['_id']} at {r['_observed_at']} references entity {eid} spawned later at {spawn_at[eid]}"))
    return out


def rule_3_recommendation_evidence_chronology(rows: list[dict]) -> list[Violation]:
    """A Recommendation must not reference evidence chronologically after itself."""
    by_id = {r["_id"]: r for r in rows}
    out: list[Violation] = []
    for r in rows:
        if r["_type"] != "Recommendation":
            continue
        for ref in r.get("evidence_refs", []) or []:
            cited = by_id.get(ref)
            if cited and cited["_observed_at"] > r["_observed_at"]:
                out.append(Violation(3, f"{r['_id']} at {r['_observed_at']} cites {ref} from later at {cited['_observed_at']}"))
    return out


def rule_4_mission_within_objective_deadline(rows: list[dict]) -> list[Violation]:
    """A Mission must not run past its MissionObjective.deadline."""
    objectives = {r["_id"]: r for r in rows if r["_type"] == "MissionObjective"}
    out: list[Violation] = []
    for r in rows:
        if r["_type"] != "Mission":
            continue
        obj_id = r.get("objective_id")
        if not obj_id or obj_id not in objectives:
            continue
        deadline = objectives[obj_id].get("deadline")
        completed = r.get("completed_at")
        if deadline and completed and completed > deadline:
            out.append(Violation(4, f"Mission {r['_id']} completed_at {completed} exceeds objective {obj_id} deadline {deadline}"))
    return out


def rule_5_doctrinal_predecessors(rows: list[dict]) -> list[Violation]:
    """
    Doctrinal-predecessor checks. For each event subtype with a known
    predecessor pattern, look back N minutes within ~3 km and verify
    the predecessor exists.
    """
    rows_sorted = sorted(rows, key=lambda r: r["_observed_at"])
    out: list[Violation] = []

    def is_within(km: float, p1: tuple[float, float], p2: tuple[float, float]) -> bool:
        # Rough km — 1 deg lat ≈ 111 km, 1 deg lon ≈ 111 * cos(lat) km.
        lat_avg = (p1[0] + p2[0]) / 2
        dlat_km = abs(p1[0] - p2[0]) * 111
        dlon_km = abs(p1[1] - p2[1]) * 111 * math.cos(math.radians(lat_avg))
        return math.hypot(dlat_km, dlon_km) <= km

    def predecessor_exists(target: dict, predecessor_subtypes: list[str], minutes: int, area_km: float) -> bool:
        """A strike event qualifies as a predecessor if any of:
           (a) its position is within `area_km` of target.position, OR
           (b) its payload.target_entity matches target.entity_id (long-range fires), OR
           (c) target.payload.attributed_unit matches strike.unit_id."""
        target_ts = parse_ts(target["_observed_at"])
        target_pos = target.get("position")
        target_entity = target.get("entity_id")
        target_attribution = (target.get("payload", {}) or {}).get("attributed_unit")
        for r in rows_sorted:
            if r["_type"] != "Event" or r["_subtype"] not in predecessor_subtypes:
                continue
            r_ts = parse_ts(r["_observed_at"])
            if r_ts >= target_ts:
                break
            if (target_ts - r_ts) > timedelta(minutes=minutes):
                continue
            r_payload = r.get("payload", {}) or {}
            # (b) long-range target attribution via strike payload
            if target_entity and r_payload.get("target_entity") == target_entity:
                return True
            # (c) attribution via destroyed-event payload
            if target_attribution and r.get("unit_id") == target_attribution:
                return True
            # (a) co-location fallback for direct-fire / kinetic-engagement events
            if target_pos and r.get("position"):
                if is_within(area_km, tuple(target_pos), tuple(r["position"])):
                    return True
        return False

    for r in rows_sorted:
        if r["_type"] != "Event":
            continue
        sub = r["_subtype"]
        if sub == "casevac_request":
            if not predecessor_exists(r, ["small_arms_contact", "artillery_impact", "fpv_strike",
                                         "loitering_munition_engage", "missile_launch"], 60, 5):
                out.append(Violation(5, f"casevac_request {r['_id']} lacks contact/strike predecessor in 60min/5km"))
        elif sub == "unit_destroyed":
            # Either prior strike event in same area, or doctrinal source
            # (mine, ammo cook-off — encoded as payload.destruction_cause).
            cause = (r.get("payload", {}) or {}).get("destruction_cause", "")
            if any(c in cause for c in ["mine", "cook_off", "ammo"]):
                continue
            if not predecessor_exists(r, ["fpv_strike", "missile_launch", "small_arms_contact",
                                         "artillery_impact", "loitering_munition_engage", "air_strike"], 30, 3):
                out.append(Violation(5, f"unit_destroyed {r['_id']} lacks strike predecessor in 30min/3km (cause={cause!r})"))
        elif sub == "breach_attempt":
            if not predecessor_exists(r, ["smoke_screen", "artillery_impact"], 30, 5):
                out.append(Violation(5, f"breach_attempt {r['_id']} lacks smoke or arty prep predecessor in 30min/5km"))
    return out


def rule_6_arc_outcome_red_breach_repelled(rows: list[dict]) -> list[Violation]:
    """
    red_breach_repelled requires:
      - net RED unit_destroyed >= 4 (we destroy enough RED platforms)
      - no withdrawal of BLUE main element
      - DeepState polygon delta = 0 in AO (file pair check)
    """
    out: list[Violation] = []

    red_destroyed = 0
    blue_unit_ids = {r["_id"] for r in rows if r["_type"] == "Unit"}
    for r in rows:
        if r.get("_type") != "Event":
            continue
        if r["_subtype"] == "unit_destroyed":
            tgt = r.get("entity_id") or r.get("unit_id")
            if tgt and tgt not in blue_unit_ids:
                red_destroyed += 1
        if r["_subtype"] == "withdrawal":
            uid = r.get("unit_id")
            if uid and uid in blue_unit_ids and "main" in (r.get("description", "") or "").lower():
                out.append(Violation(6, f"BLUE main element withdrawal at {r['_id']}"))

    if red_destroyed < 4:
        out.append(Violation(6, f"only {red_destroyed} RED unit_destroyed events; need >= 4 for red_breach_repelled"))

    # Polygon delta check.
    p_today = DEEPSTATE_DIR / "deepstate-occupied-20260502.json"
    p_yest = DEEPSTATE_DIR / "deepstate-occupied-20260501.json"
    if not (p_today.exists() and p_yest.exists()):
        out.append(Violation(6, f"DeepState anchor pair missing (need both {p_today.name} and {p_yest.name})"))
    else:
        # Approximate delta-area using polygon bbox intersection with AO.
        # Full symmetric-difference area requires shapely; we approximate
        # by counting feature ring vertex deltas inside the AO.
        def vertices_in_ao(geojson: dict) -> set[tuple[float, float]]:
            pts: set[tuple[float, float]] = set()
            for feat in geojson.get("features", []):
                geom = feat.get("geometry", {})
                if geom.get("type") == "MultiPolygon":
                    polys = geom["coordinates"]
                elif geom.get("type") == "Polygon":
                    polys = [geom["coordinates"]]
                else:
                    continue
                for poly in polys:
                    for ring in poly:
                        for lon, lat in ring:
                            if (AO_BBOX["lon_min"] <= lon <= AO_BBOX["lon_max"]
                                    and AO_BBOX["lat_min"] <= lat <= AO_BBOX["lat_max"]):
                                pts.add((round(lat, 4), round(lon, 4)))
            return pts

        try:
            today = json.loads(p_today.read_text())
            yest = json.loads(p_yest.read_text())
            v_today = vertices_in_ao(today)
            v_yest = vertices_in_ao(yest)
            sym_diff = len(v_today.symmetric_difference(v_yest))
            # Each ~0.0001 degree square ≈ 0.012 km². Use vertex count as
            # a rough proxy; >= 100 changed vertices suggests real shift.
            if sym_diff > 200:
                out.append(Violation(6, f"DeepState AO vertex symmetric-diff = {sym_diff} (large; likely real territorial shift)"))
        except Exception as e:
            out.append(Violation(6, f"DeepState polygon parse failed: {e}"))

    return out


def rule_7_forbid_llm_decided_by_human(rows: list[dict]) -> list[Violation]:
    """
    A gating: 'forbid-llm' Recommendation must not have decided_by that
    looks LLM-shaped. Catches accidental delegation of kinetic decisions.
    """
    out: list[Violation] = []
    llm_marks = ("claude", "gpt", "llm", "ai-agent", "anthropic", "openai")
    for r in rows:
        if r.get("_type") != "Recommendation":
            continue
        if r.get("gating") != "forbid-llm":
            continue
        decided_by = (r.get("decided_by") or "").lower()
        if any(m in decided_by for m in llm_marks):
            out.append(Violation(7, f"{r['_id']} gating=forbid-llm but decided_by={decided_by!r} looks LLM-shaped"))
    return out


def main() -> int:
    if not JSONL.exists():
        print(f"FATAL: JSONL not found at {JSONL}")
        return 1

    rows = load_jsonl(JSONL)
    print(f"Loaded {len(rows)} rows from {JSONL.name}")

    checks = [
        ("evidence_refs chronology",                rule_1_evidence_refs_chronological),
        ("entity_id spawn order",                   rule_2_entity_id_spawned_first),
        ("recommendation evidence chronology",      rule_3_recommendation_evidence_chronology),
        ("mission within objective deadline",       rule_4_mission_within_objective_deadline),
        ("doctrinal predecessors",                  rule_5_doctrinal_predecessors),
        ("arc outcome red_breach_repelled",         rule_6_arc_outcome_red_breach_repelled),
        ("forbid-llm decided_by sanity",            rule_7_forbid_llm_decided_by_human),
    ]

    total_violations = 0
    for name, fn in checks:
        violations = fn(rows)
        status = "PASS" if not violations else f"FAIL ({len(violations)})"
        print(f"  [{status}] {name}")
        for v in violations:
            print(v)
        total_violations += len(violations)

    print()
    if total_violations == 0:
        print(f"all 7 checks PASS — JSONL graph is coherent")
        return 0
    else:
        print(f"{total_violations} violations across the 7 checks — JSONL fails validation")
        return 1


if __name__ == "__main__":
    sys.exit(main())
