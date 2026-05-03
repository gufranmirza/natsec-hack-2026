#!/usr/bin/env python3
"""Generate kepler.gl-friendly synthetic entity layers for the Kursk Aug 6-10 2024 demo.

All entities are SYNTHESIZED for visualization — not real intel. Schemas mimic the
original source feeds (OpenSky, ACLED, FIRMS) so this can later be swapped for live
data with no UI changes.

Output (in ../data/):
  aircraft_tracks_kursk_aug2024.geojson    LineString trips with 4D coords (lon,lat,alt_m,epoch_s)
  ground_tracks_kursk_aug2024.geojson      LineString trips for ground convoys
  incidents_kursk_aug2024.csv              ACLED-style point events
  thermal_anomalies_kursk_aug2024.csv      FIRMS-style point detections
"""
from __future__ import annotations

import csv
import json
import math
import pathlib
import random
from datetime import datetime, timezone

random.seed(42)
OUT = pathlib.Path(__file__).resolve().parent.parent / "data"
OUT.mkdir(parents=True, exist_ok=True)


def epoch(iso: str) -> int:
    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp())


WINDOW_START = epoch("2024-08-06T00:00:00Z")
WINDOW_END = epoch("2024-08-10T23:59:59Z")

# Geographic anchors (real Kursk-area coordinates)
SUDZHA = (51.215, 35.273)        # border crossing
KORENEVO = (51.430, 34.866)
LGOV = (51.658, 35.288)
SUMY_UA = (50.907, 34.795)        # Ukrainian staging
KURSK_CITY = (51.730, 36.193)     # Russian regional capital
VORONEZH_AB = (51.814, 39.226)    # Russian airbase

# NATO ISR loiter region (well behind Polish/Romanian border)
NATO_LOITER_CENTER = (49.2, 24.0)


def lerp(a, b, t):
    return a + (b - a) * t


def linspace(a, b, n):
    return [a + (b - a) * i / max(1, n - 1) for i in range(n)]


def jitter(coord, scale_deg=0.02):
    return (coord[0] + random.gauss(0, scale_deg), coord[1] + random.gauss(0, scale_deg))


def racetrack(center, radius_deg, alt_m, n=30, period_s=2400, t0=WINDOW_START, n_loops=8):
    """Make an oval racetrack loiter pattern around a point."""
    pts = []
    for loop in range(n_loops):
        for i in range(n):
            theta = 2 * math.pi * i / n
            lat = center[0] + radius_deg * 0.6 * math.sin(theta)
            lon = center[1] + radius_deg * 1.4 * math.cos(theta)
            t = t0 + loop * period_s + (period_s * i / n)
            if t > WINDOW_END:
                return pts
            pts.append([round(lon, 5), round(lat, 5), alt_m, t])
    return pts


def transit(start, end, alt_m, t0, duration_s, n=40):
    """Straight-ish transit between two points."""
    pts = []
    for i in range(n):
        f = i / (n - 1)
        lat = lerp(start[0], end[0], f) + random.gauss(0, 0.005)
        lon = lerp(start[1], end[1], f) + random.gauss(0, 0.005)
        t = int(t0 + duration_s * f)
        pts.append([round(lon, 5), round(lat, 5), alt_m, t])
    return pts


# ------------------------------------------------------------------ aircraft
aircraft = [
    # (icao24, callsign, type, kind, coords)
    ("ae1146", "JAKE21",  "RC-135V",  "nato_isr",
     racetrack(NATO_LOITER_CENTER, 1.2, 9700, period_s=3000, n_loops=20)),
    ("ae5b21", "FORTE10", "RQ-4B",    "nato_isr",
     racetrack((48.5, 27.5), 1.5, 17600, period_s=4200, n_loops=18)),
    ("ae6d19", "DRAGON91","E-3F",     "nato_isr",
     racetrack((48.2, 22.0), 1.1, 9000, period_s=2400, n_loops=20)),
    ("4242a1", "RFF7034", "Su-34",    "ru_strike",
     transit(VORONEZH_AB, jitter(SUDZHA, 0.1), 6000, WINDOW_START + 7*3600, 1500)),
    ("4242b8", "RFF7041", "Su-34",    "ru_strike",
     transit(VORONEZH_AB, jitter(KORENEVO, 0.1), 5500, WINDOW_START + 23*3600, 1700)),
    ("4242c2", "RFF8810", "Su-25",    "ru_strike",
     transit(jitter(KURSK_CITY, 0.05), jitter(SUDZHA, 0.05), 3500,
             WINDOW_START + 15*3600, 1100)),
    ("4242d4", "RFF1102", "A-50U",    "ru_aewc",
     racetrack((52.4, 39.5), 0.8, 8500, period_s=2700, n_loops=22)),
    ("4242e5", "RFF6620", "Mi-8",     "ru_helo",
     transit(jitter(KURSK_CITY, 0.04), jitter(LGOV, 0.04), 250,
             WINDOW_START + 36*3600, 900)),
    ("502a51", "AFL2541", "A320",     "civilian",
     transit((55.0, 37.5), (45.5, 32.0), 11000, WINDOW_START + 8*3600, 4500)),
    ("4ca7f9", "TVF63B",  "A320",     "civilian",
     transit((52.5, 21.0), (40.6, 28.7), 10500, WINDOW_START + 30*3600, 5400)),
    ("4ca8e1", "RYR91KP", "B738",     "civilian",
     transit((52.2, 13.7), (44.4, 33.8), 11500, WINDOW_START + 50*3600, 6300)),
]

ac_features = []
for icao24, callsign, model, kind, coords in aircraft:
    ac_features.append({
        "type": "Feature",
        "properties": {
            "icao24": icao24,
            "callsign": callsign,
            "model": model,
            "kind": kind,
            "source": "synthetic_opensky_schema",
        },
        "geometry": {"type": "LineString", "coordinates": coords},
    })

(OUT / "aircraft_tracks_kursk_aug2024.geojson").write_text(
    json.dumps({"type": "FeatureCollection", "features": ac_features}, ensure_ascii=False))
print(f"aircraft: {len(ac_features)} tracks, "
      f"{sum(len(f['geometry']['coordinates']) for f in ac_features)} waypoints")


# ----------------------------------------------------- ground convoys
def road_points(waypoints, alt_m, t0, duration_s, n=60):
    """Path through several waypoints."""
    coords = []
    for i in range(n):
        f = i / (n - 1)
        seg_f = f * (len(waypoints) - 1)
        idx = min(int(seg_f), len(waypoints) - 2)
        local = seg_f - idx
        lat = lerp(waypoints[idx][0], waypoints[idx + 1][0], local) + random.gauss(0, 0.003)
        lon = lerp(waypoints[idx][1], waypoints[idx + 1][1], local) + random.gauss(0, 0.003)
        t = int(t0 + duration_s * f)
        coords.append([round(lon, 5), round(lat, 5), alt_m, t])
    return coords


ground = [
    ("ua_brigade_1", "47-OMBr", "ua_armor",
     road_points([SUMY_UA, jitter(SUDZHA, 0.05), KORENEVO], 200,
                 WINDOW_START + 2*3600, 36*3600, n=80)),
    ("ua_brigade_2", "82-OAEMBr", "ua_armor",
     road_points([(50.85, 34.45), jitter(SUDZHA, 0.08), (51.32, 35.0)], 210,
                 WINDOW_START + 6*3600, 30*3600, n=70)),
    ("ua_drone_team_1", "TARANTULA-3", "ua_isr",
     road_points([(50.95, 34.7), (51.18, 35.30), (51.21, 35.27)], 200,
                 WINDOW_START + 9*3600, 24*3600, n=50)),
    ("ru_logistics_1", "RU-LOG-1107", "ru_logistics",
     road_points([KURSK_CITY, (51.6, 35.7), jitter(LGOV, 0.04)], 220,
                 WINDOW_START + 18*3600, 22*3600, n=55)),
    ("ru_reaction_1", "RU-MOTRIF-114", "ru_armor",
     road_points([VORONEZH_AB, (51.85, 38.0), KURSK_CITY, (51.55, 35.5)], 200,
                 WINDOW_START + 30*3600, 32*3600, n=65)),
]

g_features = []
for eid, label, kind, coords in ground:
    g_features.append({
        "type": "Feature",
        "properties": {
            "entity_id": eid,
            "label": label,
            "kind": kind,
            "source": "synthetic_blue_force_tracker",
        },
        "geometry": {"type": "LineString", "coordinates": coords},
    })

(OUT / "ground_tracks_kursk_aug2024.geojson").write_text(
    json.dumps({"type": "FeatureCollection", "features": g_features}, ensure_ascii=False))
print(f"ground: {len(g_features)} convoys, "
      f"{sum(len(f['geometry']['coordinates']) for f in g_features)} waypoints")


# ----------------------------------------------------- incidents (ACLED schema)
incidents = []
incident_specs = [
    # (offset_h, lat, lon, event_type, sub_event_type, actor1, actor2, fatalities)
    (0.5,  51.215, 35.273, "Battles", "Armed clash",      "UA forces", "RU forces", 0),
    (1.5,  51.198, 35.301, "Explosions/Remote violence", "Shelling/artillery/missile attack", "UA forces", "RU forces", 0),
    (3.0,  51.232, 35.247, "Battles", "Armed clash",      "UA forces", "RU forces", 4),
    (5.5,  51.260, 35.190, "Battles", "Government regains territory", "UA forces", "RU forces", 8),
    (8.0,  51.305, 35.084, "Explosions/Remote violence", "Air/drone strike",   "RU forces", "UA forces", 2),
    (11.5, 51.430, 34.866, "Battles", "Armed clash",      "UA forces", "RU forces", 6),
    (14.0, 51.211, 35.272, "Strategic developments", "Change to group/activity", "UA forces", "Civilians", 0),
    (18.0, 51.512, 35.208, "Battles", "Government regains territory", "UA forces", "RU forces", 11),
    (22.5, 51.578, 35.123, "Explosions/Remote violence", "Shelling/artillery/missile attack", "RU forces", "UA forces", 1),
    (28.0, 51.482, 34.940, "Battles", "Armed clash",      "UA forces", "RU forces", 3),
    (32.5, 51.612, 35.180, "Explosions/Remote violence", "Air/drone strike",   "UA forces", "RU forces", 0),
    (37.0, 51.658, 35.288, "Battles", "Armed clash",      "UA forces", "RU forces", 7),
    (41.0, 51.215, 35.625, "Battles", "Armed clash",      "UA forces", "RU forces", 2),
    (44.5, 51.392, 35.512, "Explosions/Remote violence", "Shelling/artillery/missile attack", "RU forces", "UA forces", 4),
    (50.5, 51.580, 35.420, "Battles", "Government regains territory", "UA forces", "RU forces", 9),
    (55.0, 51.713, 35.080, "Explosions/Remote violence", "Air/drone strike",   "UA forces", "RU forces", 1),
    (60.0, 51.298, 35.730, "Battles", "Armed clash",      "UA forces", "RU forces", 5),
    (66.5, 51.418, 35.605, "Battles", "Armed clash",      "UA forces", "RU forces", 0),
    (72.0, 51.605, 35.318, "Explosions/Remote violence", "Shelling/artillery/missile attack", "RU forces", "UA forces", 2),
    (78.5, 51.730, 36.193, "Explosions/Remote violence", "Air/drone strike",   "UA forces", "RU forces", 0),
    (84.0, 51.815, 36.060, "Strategic developments", "Disrupted weapons use", "UA forces", "RU forces", 0),
    (90.5, 51.660, 35.500, "Battles", "Armed clash",      "UA forces", "RU forces", 4),
    (96.0, 51.500, 35.300, "Battles", "Armed clash",      "UA forces", "RU forces", 6),
    (102.0,51.200, 35.500, "Explosions/Remote violence", "Shelling/artillery/missile attack", "RU forces", "UA forces", 1),
    (108.0,51.800, 36.200, "Strategic developments", "Change to group/activity", "RU forces", "Civilians", 0),
    (113.0,51.420, 35.080, "Explosions/Remote violence", "Air/drone strike", "UA forces", "RU forces", 3),
]
with (OUT / "incidents_kursk_aug2024.csv").open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp", "iso_time", "latitude", "longitude", "event_type",
                "sub_event_type", "actor1", "actor2", "fatalities", "source"])
    for offset_h, lat, lon, et, set_, a1, a2, fat in incident_specs:
        ts = WINDOW_START + int(offset_h * 3600)
        iso = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
        w.writerow([ts, iso, lat, lon, et, set_, a1, a2, fat, "synthetic_acled_schema"])
print(f"incidents: {len(incident_specs)} events")


# ----------------------------------------------- FIRMS-style thermal anomalies
random.seed(2024)
thermal = []
hotspots = [
    SUDZHA, KORENEVO, LGOV, (51.300, 35.400), (51.500, 35.600),
    (51.215, 35.625), (51.730, 36.193), (51.612, 35.180),
]
satellites = [("VIIRS", "Suomi-NPP"), ("VIIRS", "NOAA-20"), ("MODIS", "Aqua")]

with (OUT / "thermal_anomalies_kursk_aug2024.csv").open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp", "iso_time", "latitude", "longitude", "brightness",
                "frp", "confidence", "satellite", "source"])
    for hour in range(0, 5 * 24, 3):
        density = 1 + int(2 * abs(math.sin(hour / 18)))
        for _ in range(density * len(hotspots)):
            spot = random.choice(hotspots)
            lat = spot[0] + random.gauss(0, 0.04)
            lon = spot[1] + random.gauss(0, 0.06)
            ts = WINDOW_START + hour * 3600 + random.randint(0, 3 * 3600)
            iso = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
            brightness = round(310 + random.uniform(0, 80), 1)
            frp = round(random.uniform(2.0, 80.0), 1)
            conf = random.choice(["nominal", "high", "high", "low"])
            sensor, sat = random.choice(satellites)
            w.writerow([ts, iso, round(lat, 5), round(lon, 5),
                        brightness, frp, conf, sat, "synthetic_firms_schema"])
            thermal.append(1)
print(f"thermal: {len(thermal)} detections")
print(f"\nall files in: {OUT}")
print("\nfiles:")
for p in sorted(OUT.iterdir()):
    print(f"  {p.name:48} {p.stat().st_size/1024:8.1f} KB")
