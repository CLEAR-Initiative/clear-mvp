# clear-api: USGS Seismic GeoJSON ingest — backend requirements

> **Expo #465** (`cmsq40vy00001ju048zgfdci7`) · Blocks **#466** (ShakeMap intensity)  
> Do **not** call earthquake.usgs.gov from the browser in the production path.

This is the handoff brief for clear-api. Frontend contract lives in
`src/lib/map/usgs-earthquakes.ts` and is smoke-tested via
`GET /api/dev/usgs-earthquakes` (development only — live USGS FDSN fetch).

---

## Goal

Pull USGS FDSN Event data (earthquake epicenters) into **clear-api**, persist them, and
serve a **map-ready slim GeoJSON** that clear-mvp can fetch with the same shape as today's
spike — so `/map` → Seismic Signals never calls earthquake.usgs.gov from the client.

## Trust / precision (product)

| Field | Meaning |
|-------|---------|
| `pulled_at` | When CLEAR last synced from USGS (ingest job) |
| `time` / `updated` | When USGS recorded / last updated the event |

USGS FDSN is the **source of truth** for significant earthquakes (M5.5+). Scheduled
re-pull keeps CLEAR's copy current; it does **not** invent fresher event data than
upstream. FE demotes features with `age_days` ≥ **30 days** (reduced opacity) and
**never hides** them within the 30-day window. Fresher earthquake data and intensity
overlays (ShakeMap) are **out of scope** for #465 (next ticket: #466).

---

## Must do

1. **Server-side pull** of USGS FDSN Event GeoJSON (`format=geojson`, `eventtype=earthquake`)
   for focus + adjacent countries. Credentials / API keys (if any) stay in clear-api.
2. **Persist** by USGS event `id` (upsert on `updated` timestamp changes) and expose an
   authenticated map endpoint that returns the **slim Seismic FeatureCollection**.
3. Include **`pulled_at`** on the response `meta` (and preferably a job id / run timestamp)
   so FE can distinguish sync age vs event age.
4. **Auth / ACL** consistent with other CLEAR operational data — not a public
   unauthenticated dump.
5. Document refresh cadence (cron / queue). Prefer scheduled job over on-demand browser triggers.
6. Support **incremental sync** via USGS `updatedafter` parameter after the initial backfill
   to avoid re-fetching the entire 30-day window on every run.

## Must not

- Proxy raw USGS FDSN through Next.js / the browser (use the BFF pattern instead).
- Drop events server-side because they're "stale" (FE demotes them visually but shows all).
- Block #465 on ShakeMap intensity polygons or real-time streaming (those are #466+).
- Require satellite imagery cross-check or camp detection for v1.

---

## v1 scope

| Topic | Expectation |
|-------|-------------|
| Geography | Focus country + adjacent (server-derived bbox) first; global later |
| Magnitude | **M5.5+** (FDSN `minmagnitude=5.5`) |
| Time window | **30 days** (FDSN `starttime=NOW-30d`) |
| Event types | **earthquakes only** (FDSN `eventtype=earthquake`) |
| Serving | Slim GeoJSON for map; vector tiles later if point density forces it |

### USGS FDSN Event API

- Base: `https://earthquake.usgs.gov/fdsnws/event/1/query`
- Method: `query` with `format=geojson`
- Required params: `format=geojson`, `eventtype=earthquake`, `minmagnitude=5.5`, `starttime=<ISO>`, bbox
- Optional: `orderby=time`, `limit=20000` (hard USGS max; use `count` + `offset` for pagination if needed)
- Incremental sync: `updatedafter=<ISO>` (last successful pull timestamp)

### Query example (Sudan + adjacent)

```
GET https://earthquake.usgs.gov/fdsnws/event/1/query
  ?format=geojson
  &eventtype=earthquake
  &minmagnitude=5.5
  &starttime=2026-07-13T00:00:00Z
  &minlatitude=3&maxlatitude=23
  &minlongitude=20&maxlongitude=50
  &orderby=time
  &limit=20000
```

For incremental pulls after the first backfill:

```
  &updatedafter=2026-08-12T12:00:00Z
```

### Upstream feature shape (USGS response)

- `type: "Feature"`
- `id: string` (e.g. `"us6000tk74"`)
- `geometry: { type: "Point", coordinates: [lng, lat, depth_km] }`
- `properties: Record<string, unknown>` — includes `mag`, `magType`, `place`, `title`, `time`, `updated`, `alert`, `mmi`, `url`, `types`, `status`, etc.

### Slim feature properties (map-ready)

Keep only what paint/popup need — drop `detail`, `ids`, `sources`, `nst`, `dmin`, `rms`, `gap`, `sig`, `net`, `code`, etc.

| Prop | Notes |
|------|--------|
| `id` | USGS event id (also Feature.id) |
| `mag` / `mag_type` | sizing + label |
| `place` / `title` | popup |
| `time` / `updated` | ms epoch → also derive `age_days`, `stale` (0\|1) |
| `depth_km` | from geometry[2] |
| `alert` | PAGER green/yellow/orange/red \| null |
| `mmi` | optional; foreshadows #466 intensity overlay |
| `url` | USGS eventpage link |
| `has_shakemap` | boolean — derived from `types` containing `shakemap` (for #466) |
| `status` | automatic/reviewed \| null |
| `age_days` | whole days since `time` (null if unknown) |
| `stale` | 0 when `age_days` < 30; 1 when ≥ 30 (Mapbox-friendly) |

`meta`: `source` (`usgs-ingest`), `feature_count`, `pulled_at`, `min_magnitude`, `window_days`, `bbox`, `bytes_in` / `bytes_out`.

---

## FE contract (clear-mvp expectations)

### Endpoint

**`GET /api/usgs/earthquakes`** (clear-api) — returns `SeismicMapCollection` (FeatureCollection + meta).

Optional query params (for future filtering):
- `minmagnitude` (default 5.5)
- `bbox` (comma-separated `minLng,minLat,maxLng,maxLat`)

### Response schema (TypeScript reference)

See `src/lib/map/usgs-earthquakes.ts`:

```typescript
type SeismicMapCollection = {
  type: "FeatureCollection";
  features: SeismicMapFeature[];
  meta: {
    source: "usgs-ingest";
    feature_count: number;
    min_magnitude: number | null;
    window_days: number | null;
    bbox: [number, number, number, number] | null;
    pulled_at: string; // ISO timestamp
    bytes_in: number;
    bytes_out: number;
    reduction_ratio: number;
  };
};
```

### Auth

Same-origin BFF (`/api/usgs/earthquakes` in clear-mvp) forwards session cookie to clear-api.
Map client never calls earthquake.usgs.gov directly in prod.

### Caching

- **Upstream:** `cache: "no-store"` on USGS FDSN fetch
- **Response:** `Cache-Control: private, max-age=60` (short-lived; job refreshes every N minutes)

---

## Ingest design (recommended)

### Phase 1 — Initial backfill

1. Fetch USGS FDSN with `starttime=NOW-30d`, `minmagnitude=5.5`, bbox for focus + adjacent.
2. Parse GeoJSON; validate `type === "FeatureCollection"`.
3. For each feature:
   - Extract USGS `id` (primary key)
   - Transform to slim properties (see table above)
   - Persist with `time`, `updated`, raw USGS `properties` (for future audit)
4. Record `pulled_at` timestamp for next incremental sync.

### Phase 2 — Incremental sync (scheduled job)

1. Run every **5–15 minutes** (tunable; USGS updates are not real-time but ~minutes latency).
2. Fetch USGS FDSN with `updatedafter=<last_pulled_at>`, same filters.
3. **Upsert** by USGS `id`:
   - If `updated` timestamp is newer → replace
   - If event is new → insert
4. **Prune** events older than 30 days from `time` (optional; FE filters by `age_days` anyway).
5. Update `pulled_at` timestamp on success.

### Pagination (if needed)

USGS hard limit is 20,000 events per query. If the result set exceeds this:
1. Call `GET /query?...&limit=1` with `format=geojson` to get `metadata.count`
2. If `count > 20000`, paginate with `offset=0`, `offset=20000`, etc.
3. Merge all pages before persisting.

For the Sudan + adjacent bbox at M5.5+, 30-day count is typically **< 50 events**, so
pagination is unlikely needed in practice.

---

## Performance / scale notes

- **Point volume:** M5.5+ globally is ~200–300 events/month. Focus + adjacent ~10–50/month.
  No vector tiles or clustering server-side needed yet.
- **Geometry simplification:** N/A (Points have no vertices to simplify).
- **Reduction ratio:** Slim transform typically drops ~60–70% of upstream JSON (fat USGS properties).
- **Future:** If global coverage or lower magnitudes push event count > 10k, consider:
  - Vector tiles (`.pbf`) instead of GeoJSON
  - Serverless edge cache (Cloudflare / Vercel edge)
  - Spatial index (PostGIS / MongoDB geospatial) for bbox queries

---

## Out of scope (later tickets)

- **Seismic Intensity** overlay (ShakeMap contours/gradient) — #466, separate ingest
- Auto-ingest of Seismic Signals into the Detection **Signal** pipeline (analyst nudge) — separate epic
- Historical archive beyond 30 days
- Real-time streaming (USGS updates are ~minutes latency; scheduled pull is sufficient)
- Satellite imagery cross-check

---

## References

- Expo #465: Map: Seismic Signals epicenters from USGS FDSN GeoJSON
- Expo #466: Map: Seismic Intensity overlay from USGS ShakeMap (blocked by #465)
- USGS FDSN Event Web Service: https://earthquake.usgs.gov/fdsnws/event/1/
- FE contract: `src/lib/map/usgs-earthquakes.ts`
- FE spike: `src/app/api/dev/usgs-earthquakes/route.ts` (dev-only live FDSN fetch)
- FE BFF: `src/app/api/usgs/earthquakes/route.ts` (prod proxy → clear-api)
- Pattern to follow: `docs/clear-api-logie-ingest.md` (LogIE Blockages handoff)
