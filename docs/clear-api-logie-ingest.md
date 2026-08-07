# clear-api: LogIE GeoJSON ingest — backend requirements

> **Expo #317** (`cms2d9w3z0001l804uk12eixw`) · Blocked by **#280** · Blocks **#277**  
> Do **not** fold into #277. Do **not** expose ArcGIS LogIE to the browser.

This is the handoff brief for clear-api. Frontend contract lives in
`src/lib/map/logie-blockages.ts` and is smoke-tested via
`GET /api/dev/logie-blockages` (development only).

---

## Goal

Pull LogIE access-issue features into **clear-api**, persist them, and serve a
**map-ready slim GeoJSON** that clear-mvp can fetch with the same shape as today’s
spike smoke — so `/map` → Blockages never calls LogIE ArcGIS from the client.

## Trust / precision (product)

| Field | Meaning |
|-------|---------|
| `pulled_at` | When CLEAR last synced from LogIE (ingest job) |
| `status_as_of` | When partners last reported that segment’s status (LogIE) |

LogIE is Access **source of truth** (ADR-0003), not near-real-time. Scheduled
re-pull keeps CLEAR’s copy current with LogIE; it does **not** invent fresher
corridor status than upstream. FE demotes features with `status_as_of` ≥ **15 days**
(dashed / warn) and **never hides** them. Satellite cross-check is **out of scope**
for #317 (parked research).

---

## Must do

1. **Server-side pull** of LogIE (or accept a controlled upload from the spike script
   shape) for at least `iso3=SDN`. Credentials / ArcGIS URLs stay in clear-api.
2. **Persist** (see field map below) and expose an authenticated map endpoint that
   returns the **slim Blockages FeatureCollection** (or raw persist + transform to
   that contract before response).
3. Include **`pulled_at`** (and preferably a run / job id) on the response `meta`
   and/or headers so FE can distinguish sync age vs feature status age.
4. **Auth / ACL** consistent with other CLEAR operational data — not a public
   unauthenticated dump.
5. Document refresh cadence (cron / queue). Prefer scheduled job over on-demand
   browser triggers.

## Must not

- Proxy raw LogIE Feature Services through Next.js / the browser.
- Require Overpass, icon sprites, or Access IA comps for v1.
- Invent `source_reliability` when LogIE leaves `currinforely` null.
- Drop stale features server-side because FE demotes them (hiding ≈ “road open”).
- Block #317 on satellite imagery or camp detection.

---

## v1 scope

| Topic | Expectation |
|-------|-------------|
| Country | `iso3=SDN` first; multi-country later |
| Blockages layers | **road + bridge** only (blocked codes per layer) |
| Later layers | crossing, aerodrome; port/PAC as data allows — separate FE toggles |
| Status model | Persist status field name, code, resolved label, `status_as_of` |
| Identity | `feature_type` + `route_id` (`osmid` when present) |
| Class | Persist `fclass` when present (optional; ~8% on SDN blocked) |
| Serving | Slim GeoJSON for map; vector tiles later if needed |

### Sudan spike inventory (2026-07-26 / re-pulled 2026-07-27)

| Layer | Blocked | All |
|-------|--------:|----:|
| road | 28 | 102 |
| bridge | 3 | 13 |
| crossing | 14 | 17 |
| aerodrome | 7 | 160 |
| port | 0 | 5 |
| pac_report | 0 | — |

Blocked road+bridge statuses on the spike were typically **≥15–30+ days** old —
expected; FE treats that as demoted, not missing.

### LogIE → persist field map

| Persist / serve | LogIE / notes |
|-----------------|---------------|
| `feature_type` | Spike-shaped layer: `road` \| `bridge` \| … |
| `route_id` | `osmid` when present |
| `name` | `routenameen` / name (often null on SDN roads) |
| `status_field` | e.g. `currstatus_physical` (road/bridge) |
| `status_code` | Layer domain code (road/bridge blocked `{3,4}`) |
| `status` | Domain label; fix LogIE typo `Damanged` → `Damaged` if convenient |
| `status_as_of` | `currasofdate` — **required** for freshness UX |
| `status_remark` | Remark / description |
| `source_name` | `currsourcename` (often `WFP-LC` / messy variants) |
| `source_reliability_code` | `currinforely` 0–4 when present |
| `fclass` | Optional |
| `pulled_at` | Ingest job timestamp (CLEAR metadata) |
| `geometry` | GeoJSON; simplify LineStrings for map (RDP ~0.0008°) |

Road/bridge **blocked** codes (spike): `{3,4}` on `currstatus_physical`  
(3 = Passable with restrictions/Damaged, 4 = Not Passable).  
Aerodrome live domain uses `{2,3}` — not needed for Blockages v1.

---

## Map response contract (required for #277)

clear-mvp expects a **FeatureCollection** matching
`BlockagesMapCollection` in `src/lib/map/logie-blockages.ts`.

Either:

- **A.** clear-api applies the same slim/simplify transform server-side, or  
- **B.** clear-api returns persisted features and clear-mvp runs `toBlockagesMapCollection`
  once on the payload (still no ArcGIS in the browser).

Prefer **A** so clients never download fat dumps (~450KB blocked SDN → ~60KB slim).

### Feature properties (slim)

```ts
{
  feature_type: "road" | "bridge",
  route_id: string | number | null,
  name: string | null,
  label: string, // always set: name → remark snippet → "Road · {status}"
  status_code: number,
  status: string,
  status_as_of: string | null, // ISO
  status_remark: string | null,
  source_name: string | null,
  source_label: string | null, // optional normalized LC / partner label
  source_reliability_code: number | null,
  source_reliability: string | null,
  age_days: number | null, // whole days since status_as_of
  stale: 0 | 1, // 1 when age_days >= 15
  // geometry: LineString | MultiLineString | Point (bridges)
}
```

### Collection `meta` (recommended)

```ts
{
  source: "logie-ingest",
  feature_types: ["road", "bridge"],
  feature_count: number,
  simplify_tolerance_deg?: number,
  pulled_at: string, // ISO — CLEAR sync time
  iso3?: "SDN"
}
```

### Paint semantics (FE — do not change server-side)

| Signal | Meaning |
|--------|---------|
| Color dark red `#B91C1C` | Not passable (`status_code` 4) |
| Color amber `#D97706` | Restricted / damaged (`status_code` 3) |
| Solid line | `stale === 0` (`age_days` < 15) |
| Dashed + lower opacity | `stale === 1` (`age_days` ≥ 15) |

### Client wiring after #317

```bash
NEXT_PUBLIC_LOGIE_BLOCKAGES_URL=<auth’d clear-api slim blockages URL>
```

Swap point: `src/lib/map/fetch-blockages.ts`. Without that env, production keeps
Blockages as **Coming soon**; development uses `/api/dev/logie-blockages`.

Delivery model: [`docs/logie-blockages-delivery.md`](./logie-blockages-delivery.md).

---

## Acceptance (Expo #317)

1. clear-api can pull (or accept) LogIE access-issue features for at least SDN.
2. Persists geometry, identity, status code + label, `status_as_of`, `source_name`,
   `source_reliability_code` when present, `fclass` when present, and ingest
   `pulled_at`.
3. Documented refresh path; provenance = LogIE / OSM.
4. clear-mvp can fetch persisted slim features **without** embedding ArcGIS in Next.js.
5. Response matches (or transforms to) `src/lib/map/logie-blockages.ts`, including
   freshness fields at the **15-day** threshold.
6. Out of scope: Access IA comps; Overpass; sprites; #277 paint work; inventing
   reliability; satellite double-check.

## Related

- Spike findings: [`docs/logie-spike-sudan.md`](./logie-spike-sudan.md)
- ADR: [`docs/adr/0003-logie-is-access-constraint-source.md`](./adr/0003-logie-is-access-constraint-source.md)
- Local pull: `npm run logie:spike` → `scripts/logie/out/` (gitignored)
- Reference gist: https://gist.github.com/eoglethorpe/90f2b9e645d43fe8d74c7b442d7e9ce9
- CONTEXT.md: **LogIE**, **LogIE spike**, **LogIE ingest**, **Blockages**
