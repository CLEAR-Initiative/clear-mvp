# clear-api: LogIE GeoJSON ingest (draft)

> **Status:** Opened as Expo **#317** (`cms2d9w3z0001l804uk12eixw`).
> Blocked by **#280** (spike); blocks Expo **#277** (Blockages wire-up). Do not fold into #277.

## Problem

CLEAR’s BFF (`clear-mvp`) owns no domain data. The TypeScript LogIE pull under
`scripts/logie/` can produce Access-constraint GeoJSON for Sudan, but **clear-api has no
ingest / persistence path** for that GeoJSON. Live **Blockages** on `/map` cannot ship
until the API can store and serve LogIE features.

## Source of truth

- WFP Logistics Cluster **LogIE** (public ArcGIS Feature Services)
- Geometry: OSM-derived (`osmid` join where present)
- Status: partner-reported, IMO-validated; **per-layer** status fields + coded domains
- Reference: [logie.py gist](https://gist.github.com/eoglethorpe/90f2b9e645d43fe8d74c7b442d7e9ce9)
- Spike evidence: `scripts/logie/` + [`docs/logie-spike-sudan.md`](./logie-spike-sudan.md)

## Sudan inventory (spike, 2026-07-26)

| Layer | Blocked | All |
|-------|--------:|----:|
| road | 28 | 102 |
| bridge | 3 | 13 |
| crossing | 14 | 17 |
| aerodrome | 7 | 160 |
| port | 0 | 5 |
| pac_report | 0 | — |

`fclass` present on ~8% of blocked features (roads only) — optional enrichment later.

## Proposed ingest scope (v1)

| Topic | Expectation |
|-------|-------------|
| Country | `iso3=SDN` first; multi-country later |
| Layers for Blockages | **road + bridge** (blocked codes per layer) |
| Later layers | crossing, aerodrome; port/PAC as data allows |
| Status model | Persist `status_field`, `status_code`, resolved `status` label, `status_as_of` |
| Identity | `feature_type` + `route_id` (`osmid` when present) |
| Class | Persist `fclass` when present; Overpass not required for v1 |
| Refresh | Scheduled job preferred; document freshness from `currasofdate` |
| Serving | **Map-ready slim GeoJSON** (see below) for clear-mvp — BFF does not own ArcGIS pulls at runtime. Vector tiles later if multi-country / denser networks need it. |

### Map payload contract (required for #277)

clear-mvp already shapes Blockages via `src/lib/map/logie-blockages.ts` (`toBlockagesMapCollection`):

1. **Filter** to `road` + `bridge` only (Blockages v1)
2. **Slim properties** — `feature_type`, `route_id`, `name`, `label`, `status_code`,
   `status`, `status_as_of`, `status_remark`, optional `source_name`
3. **Simplify** LineString / MultiLineString (RDP, default ~0.0008°)

Ingest should either apply this server-side or return an equivalent contract so the map never downloads full LogIE dumps (~450KB blocked SDN today; roads dominate).

**Local smoke (not prod):** `GET /api/dev/logie-blockages` (development only) reads `scripts/logie/out/sdn_access_blocked.geojson`, applies the transform, and powers the Layers → Blockages toggle on `/map`.

### Shape sketch (from spike)

```ts
{
  feature_type: "road" | "bridge" | /* … */,
  route_id: string | number | null, // osmid when present
  name: string | null,
  iso3: string | null,
  status_field: string,
  status_code: number,
  status: string, // domain label
  status_as_of: string | null, // ISO timestamp
  fclass: string | null,
  geometry: GeoJSON
}
```

## Expo ticket draft

**Title:** LogIE → clear-api GeoJSON ingest / persist

**Depends on:** Expo #280 LogIE spike (this doc + Sudan findings)

**Blocks:** Expo #277 Blockages wire-up

**Acceptance:**

1. clear-api can pull (or accept) LogIE access-issue features for at least SDN.
2. Persists geometry, identity (`feature_type` + `route_id`/`osmid`), per-layer status
   code + label, `status_as_of`, and `fclass` when present.
3. Documented refresh path; provenance noted (LogIE / OSM).
4. clear-mvp can fetch persisted features for map paint without embedding ArcGIS pulls in
   the Next.js request path.
5. Map endpoint returns (or is transformable to) the slim Blockages contract in
   `src/lib/map/logie-blockages.ts` — not full LogIE dumps.
6. Out of scope: nested Access IA comps; Overpass; icon sprites; painting #277 itself.

## Related

- Findings: [`docs/logie-spike-sudan.md`](./logie-spike-sudan.md)
- Run spike: `npm run logie:spike` → `scripts/logie/out/`
- CONTEXT.md: **LogIE**, **LogIE spike**, **LogIE ingest**, **Blockages**
