# COP demo — Kursk incursion (Aug 6–10, 2024)

Real-data + synthetic-but-realistically-shaped entity layers for the Mission Commander common-operating-picture demo, viewable in **kepler.gl**.

The visualization is **Phase 1** — quickest path to seeing the full multi-source picture. Phase 2 will be a custom Mission Commander UI in MapLibre per UI ADR 0001; this exists to validate that the data shape is right before building chrome.

## Files

| File | Source | Schema | Contents |
|---|---|---|---|
| `data/frontline_kursk_aug2024.geojson` | **Real** — [DeepStateMap](https://deepstatemap.live/) | DeepStateMap GeoJSON | 5 daily MultiPolygons of Russian-occupied territory (Aug 6–10, 2024). One feature per day with a `timestamp` property for animation. |
| `data/aircraft_tracks_kursk_aug2024.geojson` | Synthetic | [OpenSky Network](https://opensky-network.org/) field schema | 11 aircraft trips (NATO ISR loiter, Russian strike sorties, AWACS, transport, civilian transit). LineStrings with 4D coords `[lon, lat, alt_m, epoch_s]` so kepler.gl detects them as Trips. |
| `data/ground_tracks_kursk_aug2024.geojson` | Synthetic | Generic blue/red force tracker | 5 convoys (Ukrainian armored brigades pushing into Kursk Oblast, Russian logistics + reaction force). 4D LineStrings. |
| `data/incidents_kursk_aug2024.csv` | Synthetic | [ACLED](https://acleddata.com/) field schema | 26 point events (Battles / Explosions / Strategic developments) with timestamp, lat/lon, actors, fatalities. |
| `data/thermal_anomalies_kursk_aug2024.csv` | Synthetic | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) field schema | 520 thermal detections (VIIRS/MODIS) clustered around the active frontline. |

The synthetic files are tagged `source: synthetic_<schema>_schema` in their properties so it is unambiguous they are not real intel — only their shape matches the real source so the UI can later swap to live feeds with no code change.

Schemas chosen to match what would arrive over a real production ingest:
- `aircraft.icao24, .callsign, .model, .kind` ← OpenSky `state_vectors_data4`
- `incidents.event_type, .sub_event_type, .actor1, .actor2, .fatalities` ← ACLED v6
- `thermal.brightness, .frp, .confidence, .satellite` ← FIRMS NRT VIIRS C2

## Quickstart — open in kepler.gl

1. Open <https://kepler.gl/demo> in your browser.
2. The "Add Data To Map" modal opens automatically. Click **"Files"**.
3. Drag and drop **all five files** from `cop/data/` into the dropzone.
4. Click **"Add data"** at the bottom. Kepler detects each layer's geometry type automatically.
5. Pan/zoom to **51.4°N, 35.3°E** (Kursk Oblast). The frontline polygons render first.
6. Add a **time filter** (the small clock icon in the right panel):
   - Pick the `timestamp` column for points (incidents, thermal).
   - For Trip layers (aircraft, ground), kepler auto-uses the 4th coordinate as time.
   - Drag the slider window to a 5-day span starting Aug 6, 2024 00:00 UTC. Press play.
7. Change the basemap to **Satellite** in the Base Map panel for a real-world look.

## Layer styling tips

| Layer | Suggested type | Color | Notes |
|---|---|---|---|
| Frontline | Polygon | red, 25 % opacity, red stroke | use `timestamp` for time filter so day flips at 03:00 UTC |
| Aircraft | Trip | by `kind` (NATO blue / Russia red / civilian grey) | trail length 5–10 minutes |
| Ground tracks | Trip | by `kind` (UA blue / RU red) | thicker line, shorter trail |
| Incidents | Point | by `event_type` (Battle red, Explosion orange, Strategic yellow) | size by `fatalities` |
| Thermal | Heatmap | brightness or FRP | radius 18 px, intensity by `frp` |

## Save the kepler config

When the layers + time + colors look right, click **Share → Export Map → Export Config** in kepler.gl. Save the resulting JSON as `cop/kepler_config.json` in this folder so the demo is reproducible — anyone can reload that config to get back to the same state.

## Regenerating the synthetic layers

```sh
python3 cop/scripts/generate_synthetic.py
```

Edit the script to change scenario timing, add/remove entities, or shift the geographic anchors.

## Phase 2 (later)

- Custom MapLibre UI matching UI ADR 0001 (editorial-daylight aesthetic).
- Live drone overlay from PX4 SITL (`launch.sh` in repo root) — set `PX4_HOME_LAT=51.4 PX4_HOME_LON=35.3` so drones spawn over Kursk.
- Replace synthetic feeds with live ingest sources via `platform-control-plane` (per ADR 0001).
