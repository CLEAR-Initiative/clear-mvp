# LogIE spike — Sudan (`iso3=SDN`)

Expo **#280** (retargeted): validate Ewan’s LogIE pull before **LogIE ingest** and
Expo **#277** Blockages.

## How to regenerate

```bash
npm run logie:spike
# optional full network dump:
npx tsx scripts/logie/cli.ts --iso3 SDN --full
```

Artifacts (gitignored): `scripts/logie/out/sdn_*.json` / `*.geojson`.

Use **tsx** (`npx tsx` / `npm run logie:spike`). System Bun 1.0.x wrote 0-byte dumps.

## Pull summary

**Pulled at:** `2026-07-26` (via `npm run logie:spike` / tsx)

| Layer | Blocked | All | Open / other |
|-------|--------:|----:|-------------:|
| road | 28 | 102 | 74 |
| bridge | 3 | 13 | 10 |
| port | 0 | 5 | 5 |
| aerodrome | 7 | 160 | 153 |
| crossing | 14 | 17 | 3 |
| pac_report | 0 | — | — |

**Blocked total (shaped FC):** 52 features. **Errors:** none.

### Blocked status mix (labels)

| Layer | Status | Count |
|-------|--------|------:|
| road | Passable with restrictions/Damaged | 16 |
| road | Not Passable | 12 |
| bridge | Passable with restrictions/Damaged | 2 |
| bridge | Not Passable | 1 |
| aerodrome | Restricted / Closed (codes 2–3) | 7 |
| crossing | Restricted | 11 |
| crossing | Closed | 3 |

Crossing `access_denied` (humanitarian usage = No): **0** in this blocked pull.

## Status domains (live)

Each layer has its own status field — there is **no** single global status enum.
See `scripts/logie/out/sdn_status_domains.json`.

| Layer | Field | Blocked codes (spike) | Domain notes |
|-------|-------|----------------------|--------------|
| road / bridge | `currstatus_physical` | `{3,4}` | Matches gist |
| port | `status` | `{3,4}` | Restricted / Closed |
| aerodrome | `currstatus_operational` | `{2,3}` | **Live domain ≠ gist** — Open/Restricted/Closed (not Normal/Damaged/4/5). Spike port uses `{2,3}` |
| crossing | `currstatus_operational` | `{2,3}` | Matches gist Restricted/Closed |
| pac_report | `type_of_access_constraint` | all reports | SDN returned **0** PAC rows |

## Missing road names (e.g. near Al Marwahah)

Most SDN blocked roads have **null** `routenameen` / `name` in LogIE (27/31
road+bridge features in the spike). Segments around Al Marwahah (South Darfur,
~11.65°N 24.90°E) are in that set — not a CLEAR bug and not literal `"???"` in the
data. The map smoke now always sets a `label`: real name → else status remark → else
`Road · {status}` / `Bridge · {status}`. Hover tooltip uses that label.

## `fclass` coverage (blocked pull)

| Metric | Value |
|--------|-------|
| Features with `fclass` | **4 / 52** (~8%) |
| By type | roads only (4/28); bridges/aerodromes/crossings: 0 |
| Top values | coded `2`, `3`, `4` (not OSM surface strings) |

**Implication:** `fclass` alone is a thin class proxy for SDN. Keep **Overpass surface** on the follow-up list if paint/symbology needs road class. Do not block #280 on Overpass.

## LogIE → Access mapping (proposal from inventory)

Working hypothesis updated with SDN counts:

| LogIE `feature_type` | Proposed Access home | Notes |
|----------------------|----------------------|-------|
| road | **Blockages** (v1) | Strongest signal: 28 blocked / 102 total |
| bridge | **Blockages** (v1) | Small but clear (3 blocked) |
| crossing | Later Access subtype or Blockages+ | 14/17 constrained; distinct hum-usage axis |
| aerodrome | Later Access subtype | 7 blocked / 160 total after domain fix |
| port | Later / low priority for SDN | 0 blocked / 5 total |
| pac_report | Defer | Empty for SDN in this pull |

**Recommendation for #277:** ship **roads + bridges** as Blockages first; ticket crossings (and optionally aerodromes) as a follow-on once ingest exists.

## Local map smoke (dev)

1. `npm run logie:spike` (writes gitignored GeoJSON under `scripts/logie/out/`)
2. `npm run dev` → `/map` → Layers → **Blockages** (enabled only in `NODE_ENV=development`)
3. Toggle loads `GET /api/dev/logie-blockages` → roads+bridges, slim props, simplified lines
4. Hint shows feature count and approximate byte reduction vs full spike dump
5. Freshness: tooltip shows exact status date + age; features ≥ **15 days** old are
   dashed / lower opacity with a “may no longer be accurate” warning (never hidden)

## Freshness / source notes (SDN)

On a 2026-07-27 pull, blocked road+bridge statuses were typically **≥15–30+ days** old;
`currinforely` was usually null; reporter strings were messy `WFP-LC` / `LC` variants.
Policy: **warn + demote at 15 days**, always show exact date; authoritative refresh is
scheduled LogIE re-pull (#317), not a second public feed.

Prod still shows Blockages as Coming soon until **LogIE ingest** + #277. Same transform module (`src/lib/map/logie-blockages.ts`) is the contract ingest should match.

## Follow-ups (not #280 done)

- LogIE sprite / `download_icons` for map symbology
- Overpass surface enrichment (`fclass` thin on SDN)
- Access IA comps ticket if still needed
- ADR: LogIE as Access SoT (now that domains are concrete — open with ingest or after)
- Expo **#317** LogIE ingest (opened; blocked by #280; blocks #277) — see
  [`clear-api-logie-ingest.md`](./clear-api-logie-ingest.md)
- Align aerodrome domain docs with live LogIE (gist drift)

## References

- Gist: https://gist.github.com/eoglethorpe/90f2b9e645d43fe8d74c7b442d7e9ce9
- Script: `scripts/logie/`
