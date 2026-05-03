# OSINT extracts — OP SILENT EYE

Raw outputs from the deferred fetch pass per ADR 0002 §16.3.
All sources are public Wikipedia / no auth required. Format is JSON
per platform/place; ready to be merged into `Entity.attributes` on
the next JSONL refinement pass.

## Coverage

| Source | File | Used to ground |
| ------ | ---- | -------------- |
| Wikipedia BTR-82                | `btr-82a.json`     | `ent_red_assault_co_01.attributes` |
| Wikipedia Orlan-10              | `orlan-10.json`    | `ent_red_orlan_01.attributes` |
| Wikipedia 2S19 Msta             | `2s19-msta-s.json` | `ent_red_arty_battery_01.attributes` |
| Wikipedia ZALA Lancet           | `lancet-3.json`    | `ent_red_lancet_01.attributes` |
| Wikipedia BM-21 Grad            | `bm-21-grad.json`  | `ent_red_grad_battery_01.attributes` |
| Wikipedia Sukhoi Su-34          | `su-34.json`       | `ent_red_su34.attributes` |
| Wikipedia M142 HIMARS           | `m142-himars.json` | `unit_blue_himars_pair.attributes` |
| Wikipedia UR-77 Meteorit        | `ur-77.json`       | `ent_red_engineer_01.attributes` |
| Wikipedia T-72                  | `t-72b3.json`      | `ent_red_armor_01..02.attributes` |
| Wikipedia Chasiv Yar            | `chasiv-yar.json`  | `obj_silent_eye.target_area` centroid; map labels |
| Wikipedia Klishchiivka          | `klishchiivka.json`| nearby village reference; map label expansion |

## Failed (404) — to be sourced manually if needed

- **Leer-3 (RB-341V)** — no English Wikipedia page; specs available via FOI / OSINT analyses, can be added by hand
- **Ivanivske, Bakhmut Raion** — no English Wikipedia article at expected URL; coordinates known from OSM (~48.598°N, 37.94°E)

## Provenance convention (per ADR §16.4)

When merged into JSONL, each entity citing this corpus uses:

```json
{
  "_source": "wikipedia.<topic-slug>",
  "_source_ref": "https://en.wikipedia.org/wiki/<page>"
}
```

so a judge can independently verify any fact in the entity tree.
