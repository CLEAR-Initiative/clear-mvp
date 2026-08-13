# clear-api: USGS Seismic GeoJSON ingest — backend & data-science handoff

> **Expo #465** (`cmsq40vy00001ju048zgfdci7`) · Related **#466** (ShakeMap intensity)  
> Do **not** call earthquake.usgs.gov from the browser in the production path.

This is the handoff brief for **clear-api** and **data science**. Frontend contract lives in
`src/lib/map/usgs-earthquakes.ts` and is smoke-tested via
`GET /api/dev/usgs-earthquakes` (development only — live USGS FDSN fetch).

---

## Data scientist quickstart — pipeline & aggregation

Use this section to design a scalable CLEAR ingest that replaces today’s FE spike.

### Pipeline (end-to-end)

```
USGS FDSN Event API          USGS ShakeMap product (optional per event)
  (epicenter FeatureCollection)   detail/{id}.geojson → download/cont_mmi.json
           │                                    │
           ▼                                    ▼
   clear-api scheduled job (cron ~10 min)
           │
           ├─ slim + upsert epicenters by USGS id
           ├─ attach/refresh MMI contours when has_shakemap
           └─ store meta.pulled_at
           │
           ▼
   GET clear-api /usgs/earthquakes  →  SeismicMapCollection (slim GeoJSON)
           │
           ▼
   clear-mvp BFF /api/usgs/earthquakes  →  Map Hazards layer
```

**FE never polls USGS.** Continuity is the clear-api job. The map fetches the slim
collection once when the layer is toggled on.

### Aggregation logic (what CLEAR derives vs what USGS owns)

| Step | Input | Output / rule | Notes |
|------|-------|---------------|-------|
| 1. Query | FDSN `format=geojson`, `eventtype=earthquake`, `minmagnitude`, `starttime` or `updatedafter`, optional bbox | Fat FeatureCollection | USGS is source of truth |
| 2. Identity | Feature **top-level** `id` (e.g. `us6000tjl2`) | Primary key | Not `properties.id` (often missing) |
| 3. Geometry | `Point` `[lng, lat, depth_km]` | Keep as Point; `depth_km` = coord[2] | Reject non-Point / null geometry |
| 4. Slim properties | Fat USGS `properties` | Keep only map fields (see slim table) | Drop `detail`, `nst`, `rms`, `gap`, etc. |
| 5. `has_shakemap` | `properties.types` string contains `shakemap` | boolean | Gate for contour fetch |
| 6. `age_days` | `floor((now - time) / 86400000)` from `properties.time` (ms) | number \| null | FE demotes when ≥ 30 |
| 7. `stale` | `age_days >= 30` | `0` \| `1` | Mapbox-friendly; **do not drop** in API |
| 8. Upsert | Existing row with same `id` | Replace iff USGS `updated` is newer | Incremental `updatedafter` keeps runs small |
| 9. ShakeMap attach | Detail product `contents["download/cont_mmi.json"]` | `shakemaps[]` entry keyed by `eventId` | Contours are **USGS isoseismals** — do not invent polygons |
| 10. Serve | Persisted slim rows + optional contours | `SeismicMapCollection` | Same contract as FE spike |

**What we do *not* aggregate:** we do not synthesize intensity zones, re-grid MMI,
or approximate shake radius. Contour **shape and MMI `value`** come only from USGS
`cont_mmi.json` (`MultiLineString` / `LineString` isoseismals). The map paints those
authoritative lines as thick bands for readability.

### Scalable CLEAR ingest (DS / clear-api target)

| Concern | Spike (today) | Scalable clear-api |
|---------|---------------|--------------------|
| Who calls USGS | Next.js route on each FE toggle | Cron every **~10 min** (5–15 ok) |
| Window | Full 30d query each request | Backfill once; then `updatedafter` |
| Geography | Hardcoded SA bbox in spike | Focus+adjacent bbox; optional global M5.5+ later |
| Magnitude | Spike uses M4.0 for testing | Prod default **M5.5+** |
| ShakeMaps | Fetched live per request for `has_shakemap` | Persist contours; refresh when product URL/`updated` changes |
| Payload | Slim GeoJSON (~60–75% smaller) | Same slim contract + optional `shakemaps[]` |
| Worldwide? | Not in spike | M5.5+ global epicenters are fine (~200–300/mo); global M4+ + all contours is the heavy path |

Full continuous-fetch algorithm: see **Continuous fetch playbook** below.

---

## Goal

Pull USGS FDSN Event data (earthquake epicenters) into **clear-api**, persist them, and
serve a **map-ready slim GeoJSON** that clear-mvp can fetch with the same shape as today's
spike — so `/map` → Seismic Signals never calls earthquake.usgs.gov from the client.
The FE spike also demonstrates **ShakeMap isoseismal** attachment for intensity bands;
clear-api should persist that path for scale (not re-fetch on every browser toggle).

## Trust / precision (product)

| Field | Meaning |
|-------|---------|
| `pulled_at` | When CLEAR last synced from USGS (ingest job) |
| `time` / `updated` | When USGS recorded / last updated the event |

USGS FDSN is the **source of truth** for significant earthquakes (prod: M5.5+). Scheduled
re-pull keeps CLEAR's copy current; it does **not** invent fresher event data than
upstream. FE demotes features with `age_days` ≥ **30 days** (reduced opacity) and
**never hides** them within the 30-day window.

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
- Require real-time USGS streaming (scheduled pull is enough).
- Invent intensity polygons — use USGS `cont_mmi.json` isoseismals only.
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

## Continuous fetch playbook (clear-api)

This is the recommended production cadence for Seismic Signals. The FE does **not**
poll USGS continuously; it loads once when the layer is toggled on. Continuity
belongs in **clear-api** (scheduled ingest), same pattern as LogIE.

### What the FE does today

| Layer | When it fetches | Polling? |
|-------|-----------------|----------|
| Dev spike (`/api/dev/usgs-earthquakes`) | Once when Hazards → Seismic Signals is enabled | No |
| Prod BFF (`/api/usgs/earthquakes`) | Once when toggle enabled (then clear-api cache) | No |

Re-toggling the layer re-fetches. There is **no** client-side interval.

### Why “All countries” still shows only Colombia waves

Two separate facts:

1. **Epicenters (dots)** — The current **dev spike** queries a **fixed South America bbox**
   (`[-82, -5, -60, 13]` ≈ Venezuela / Colombia / Ecuador), not the map country toggle.
   The top “All countries” control does **not** change the seismic query yet.
2. **ShakeMap shockwaves (bands)** — USGS only publishes ShakeMap products for some events
   (typically larger / better-instrumented). In the last 30 days for this bbox we often have
   ~15–20 M4+ quakes but **only 1 ShakeMap** (e.g. the M7.4 near San José del Palmar, Colombia).
   Venezuela dots can appear without yellow/orange bands — that is upstream coverage, not a
   missing Venezuela ingest filter.

### Recommended clear-api cadence

| Job | Cadence | USGS params | Purpose |
|-----|---------|-------------|---------|
| **Backfill** (once / on deploy) | Manual or first cron | `starttime=NOW-30d`, `minmagnitude=5.5`, focus+adjacent bbox | Seed store |
| **Incremental epicenters** | Every **10 minutes** (acceptable range **5–15 min**) | `updatedafter=<last_pulled_at>`, same filters | New / revised quakes |
| **ShakeMap attach** | Same run, only for events with `has_shakemap` / types containing `shakemap` | Detail → `download/cont_mmi.json` | Intensity bands |
| **Prune** | Daily | Drop `time` older than 30 days | Bound storage |

**Why ~10 minutes (not real-time):** USGS catalog updates are typically minutes-scale, not
seconds. Sub-minute polling wastes quota and adds little operational value for humanitarian
map awareness. Faster than 5 minutes is usually overkill; slower than 15–30 minutes is fine
for quiet regions but risks missing a significant event between analyst shifts.

### Continuous sync algorithm

```
every 10 minutes:
  1. last = stored pulled_at (or NOW-30d on first run)
  2. GET FDSN ?format=geojson&eventtype=earthquake
       &minmagnitude=5.5
       &updatedafter=<last>
       &bbox=<focus+adjacent>   # or omit bbox for global (see below)
  3. upsert each feature by USGS id (replace if properties.updated is newer)
  4. for each upserted feature where has_shakemap:
       fetch detail + cont_mmi.json (skip if contour hash/url unchanged)
  5. set pulled_at = now; emit meta.pulled_at on GET /usgs/earthquakes
```

Idempotent upserts + `updatedafter` keep each run small (often **0–few events**).

### Geography: regional first, global later — is worldwide overkill?

| Scope | M5.5+ / ~30 days | ShakeMaps | Verdict |
|-------|------------------|-----------|---------|
| Focus + adjacent bbox | ~10–50 points | 0–few | **v1 default** — matches ops focus countries |
| Worldwide M5.5+ | ~200–300 points | sparse | **Not overkill** for epicenters; still tiny GeoJSON |
| Worldwide M4.0+ | thousands | more contour payloads | Heavier; prefer regional or raise mag |
| Worldwide + every ShakeMap contour | points small; contours dominate bytes | Cache contours by event id; fetch only when product appears/updates |

**Recommendation:** Ship **regional bbox ingest** (CLEAR focus + adjacent) at M5.5+ on a
10-minute cron. Add **optional global M5.5+ epicenters** when product needs “All countries”
without per-country bbox — still cheap. Do **not** pull global M4.0+ + all ShakeMaps unless
DS confirms need; contour payloads are the scale risk, not point epicenters.

When the map country toggle should drive data: clear-api accepts `bbox` (or country codes →
server-derived bbox). FE passes the active country/“all” selection; spike hardcoding goes away.

### FE acceptance after continuous ingest lands

- Toggle on → `GET /api/usgs/earthquakes` returns slim collection + optional `shakemaps[]`
- `meta.pulled_at` within ~15 minutes of wall clock under normal cron health
- No browser calls to `earthquake.usgs.gov`
- Stale events (`age_days` ≥ 30) still returned but visually demoted

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

1. Run every **10 minutes** (tunable **5–15**; see Continuous fetch playbook above).
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

For a focus + adjacent bbox at M5.5+, 30-day count is typically **< 50 events**, so
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

## ShakeMap Intensity Visualization (Enhanced Implementation)

### Data Science Review Context

This section documents the **visualization approach** and **ShakeMap GeoJSON format** for data science review. The goal is to create an intuitive, topographic-style "shockwave" visualization that shows:
1. **Epicenter** (where the earthquake occurred)
2. **Intensity zones** (how far shaking spread, color-coded by severity)

### Visualization Strategy

**Mental Model:** Topographic map showing earthquake intensity as concentric bands radiating from epicenter

**Color Gradient:**
- **Green** (MMI I-III): Not felt / Weak shaking
- **Yellow** (MMI IV-V): Light / Moderate shaking
- **Orange** (MMI VI-VII): Strong / Very strong shaking
- **Red** (MMI VIII-X): Severe / Extreme shaking

**Visual Components:**
1. **Intensity bands** — Thick, overlapping contour lines with gradient blur (topographic appearance)
2. **Epicenter marker** — Prominent red circle (12px, 4px white border) marking ground zero
3. **Interactive popups** — Magnitude, location, depth, PAGER alert, age, USGS link

### ShakeMap GeoJSON Format

**Source:** `https://earthquake.usgs.gov/fdsnws/event/1/detail/{event_id}.geojson`
- Check `properties.products.shakemap[0]` (if exists)
- Fetch `contents["download/cont_mmi.json"].url` for MMI contours

**Contour Structure:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "MultiLineString",
        "coordinates": [[[lng, lat], [lng, lat], ...]]
      },
      "properties": {
        "value": 5.0,  // MMI intensity level (1-10)
        "units": "intensity"
      }
    }
    // ... more contours for MMI 4, 6, 7, etc.
  ]
}
```

**Key Properties:**
- `value`: MMI intensity (1-10, may include half-steps like 4.5)
- Contours are **boundaries** of equal intensity (isoseismals)
- Higher MMI values = closer to epicenter = more intense shaking

### Slim Response Format (with ShakeMaps)

The `SeismicMapCollection` type includes an optional `shakemaps` array:

```typescript
type SeismicMapCollection = {
  type: "FeatureCollection";
  features: SeismicMapFeature[];  // Epicenter points
  shakemaps?: ShakeMapContours[];  // Intensity contours
  meta: { /* ... */ }
}

type ShakeMapContours = {
  eventId: string;  // Links to SeismicMapFeature.properties.id
  type: "FeatureCollection";
  features: ShakeMapContourFeature[];
}

type ShakeMapContourFeature = {
  type: "Feature";
  geometry: {
    type: "MultiLineString";
    coordinates: number[][][];
  };
  properties: {
    value: number;  // MMI intensity level
  };
}
```

### Rendering Approach

1. **Sort contours** by MMI ascending (lowest first)
2. **Draw as thick lines** with increasing width for lower intensities
   - MMI 9-10: 8px width (dark red)
   - MMI 7-8: 12-16px width (orange)
   - MMI 5-6: 20-24px width (yellow)
   - MMI 3-4: 28-32px width (light green)
3. **Apply blur** (`line-blur: 4`) for soft gradient effect
4. **Layer order:** Lower intensities draw first, higher on top → creates gradient
5. **Epicenter on top:** 12px red circle with 4px white border

### Performance Considerations

**Contour Data Size:**
- Typical ShakeMap: 5-15 contour lines
- Each MultiLineString: ~100-500 coordinate pairs
- Total per event: **10-50 KB** (slim)
- For 10 events with ShakeMaps: **~100-500 KB**

**Scalability:**
- ✅ **Acceptable:** 10-50 events with ShakeMaps per 30-day window (typical)
- ⚠️ **Monitor:** 100+ events with ShakeMaps (major seismic period)
- 🔴 **Vector tiles needed:** 500+ events with ShakeMaps (unlikely)

**Why NOT Grid Data:**
- USGS `grid.xml` files are **28 MB+** (intensity at every lat/lng point)
- Contour lines are **1000x smaller** and sufficient for humanitarian needs
- Grid data would require server-side rasterization or huge client payloads

### Data Quality & Limitations

**When ShakeMaps are Available:**
- Earthquakes with `has_shakemap: true` (typically M4.5+, near populated areas)
- Generated **2-20 minutes** after earthquake (not instant)
- USGS updates as more data arrives (aftershocks, seismometer data)

**Coverage:**
- ✅ Well-covered: USA, Japan, Taiwan, Turkey, New Zealand
- ⚠️ Partial: Latin America, Mediterranean, Middle East
- 🔴 Limited: Africa, Central Asia, remote regions

**Incremental Sync:**
- Use `updatedafter` to detect when ShakeMap is added to existing event
- Event's `updated` timestamp changes when ShakeMap product is added

### Alternative Approaches Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Grid raster (heatmap)** | Most accurate intensity | 28 MB per event, requires server rasterization | ❌ Not scalable |
| **Contour polygons (filled)** | Clean zones | Requires polygon conversion from lines | 🤔 Possible future enhancement |
| **Thick overlapping contours** ✅ | Small payload, gradient effect, easy to render | Slightly less precise than polygons | ✅ **Current approach** |

### Recommended Next Steps for Data Scientists

1. **Review contour data quality:**
   - Test with recent M5+ earthquakes in different regions
   - Compare USGS contours to satellite damage imagery (where available)
   - Validate MMI values align with reported damage/felt reports

2. **Validate scalability assumptions:**
   - Historical query: How many M4+ earthquakes with ShakeMaps per month for our focus countries?
   - If count > 100/month, consider vector tiles or spatial pruning

3. **Assess alternative sources:**
   - Are there regional seismic networks (e.g., EMSC, local agencies) with better coverage for our target regions?
   - Would a hybrid approach (USGS + regional) provide better coverage?

4. **Integration with Detection pipeline:**
   - Can we auto-create Detection **Signals** from M5+ earthquakes?
   - What population/infrastructure thresholds trigger analyst alerts?

---

## Out of scope (future enhancements)

- Filled polygon zones (instead of thick contour lines)
- Peak Ground Acceleration (PGA) / Peak Ground Velocity (PGV) overlays
- Auto-ingest of Seismic Signals into the Detection **Signal** pipeline (analyst nudge)
- Historical archive beyond 30 days
- Real-time streaming (USGS updates are ~minutes latency; scheduled pull is sufficient)
- Satellite imagery cross-check for damage correlation

---

## References

- Expo #465: Map: Seismic Signals epicenters from USGS FDSN GeoJSON
- Expo #466: Map: Seismic Intensity overlay from USGS ShakeMap
- USGS FDSN Event Web Service: https://earthquake.usgs.gov/fdsnws/event/1/
- USGS ShakeMap Documentation: https://earthquake.usgs.gov/data/shakemap/
- FE contract: `src/lib/map/usgs-earthquakes.ts`
- FE spike: `src/app/api/dev/usgs-earthquakes/route.ts` (dev-only live FDSN fetch)
- FE BFF: `src/app/api/usgs/earthquakes/route.ts` (prod proxy → clear-api)
- Pattern to follow: `docs/clear-api-logie-ingest.md` (LogIE Blockages handoff)
