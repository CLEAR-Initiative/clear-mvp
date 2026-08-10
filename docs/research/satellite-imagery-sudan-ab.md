# Spike: Sudan satellite imagery source / color profile (#160)

**Status:** spike + temp A/B shipped — default still Mapbox pending analyst comparison  
**Issue:** [#160](https://github.com/CLEAR-Initiative/clear-mvp/issues/160) (from [#137](https://github.com/CLEAR-Initiative/clear-mvp/issues/137) Part B)  
**Related:** Expo #283 (Sudan satellite vs position), `docs/research/displacement-camps-satellite.md`  
**Opened:** 2026-08-10

## Problem

Satellite on `/map` was locked to Mapbox (`satellite-v9` / `satellite-streets-v12`).
Sudan ops reported odd color cast / contrast, and we had no in-product way to
compare alternate mosaics before changing the default.

## What this PR delivers

1. **Spike report** (this doc): candidates, why Mapbox vs Esri look different,
   freshness reality, recommended alternatives.
2. **Temp A/B UI** on Satellite: flip **Mapbox ↔ Esri World Imagery** (Layers +
   floating chip). Zero new vendor SDK — Esri is a public XYZ raster Mapbox GL
   already hosts.
3. **Default unchanged:** Mapbox remains production default until comparison
   chooses otherwise (no silent provider swap).

## Candidates evaluated

| Source | Mapbox GL drop-in? | Sudan useful? | Cost / license | Notes |
|--------|--------------------|---------------|----------------|-------|
| **Mapbox Satellite** | Yes (live) | Yes | Mapbox token (already) | Mosaic; Maxar/Vantor Vivid at high zoom; MODIS at low zoom; color-corrected |
| **Esri World Imagery** | Yes (XYZ raster) | Yes | Public tiles; attribution required | Same Maxar Vivid family often; Identify/Wayback expose capture dates |
| **NASA GIBS** (MODIS/VIIRS/Landsat WMTS) | Yes | Partial | Free | Often fresher / daily, but **coarse** — monitoring, not basemap clarity |
| **USGS / Mapbox NAIP** | Yes | **No** | Free | Contiguous US only |
| **Google / Bing** | Not freely | Yes in theory | Keys + ToS | Not a silent drop-in |
| **Planet / Maxar tasking / Sentinel Hub** | No | Yes (NRT / archive) | Contract + API | Real EO pipeline — out of scope for basemap A/B |

### Out-of-the-box peers (no new integration)

For basemap-quality imagery on the current Mapbox runtime, the practical toggle
set is **Mapbox Satellite ↔ Esri World Imagery**. GIBS is the only other free
global raster worth a later toggle if the question is *landscape change
freshness*, not street/camp clarity.

## Why Mapbox and Esri look different

Usually **both** processing and scene choice — not a CSS filter:

1. **Color grading** — Mapbox deliberately color-corrects for a consistent
   “pretty Earth”; Esri/Maxar Vivid mosaics have their own balance. Same Sahel
   can look warmer/cooler/punchier.
2. **Mosaic vintage** — same lat/lng may use different Maxar acquisition dates →
   real change (roads, camps, flood scars) *or* different season/lighting.
3. **Resolution / product tier** — ~30 cm metro Vivid vs ~50–120 cm regional
   strips changes how roofs and tracks read.
4. **Resampling & compression** — tile pipeline sharpness/haze differences.
5. **Occasional georef offset** — features can sit a few meters apart.

**Analyst rule of thumb:** shapes/camps/roads appear/disappear or move →
**imagery date / scene**. Scene identical but tint/contrast differ → **color
profile / processing**.

## Which is more recent?

**Neither is globally newer.** Both are mosaics updated region-by-region.

- High zooms often share **Maxar (Vantor) Vivid** lineage.
- Cities refresh more often; **rural Sudan / Darfur** can sit on older strips
  for years on either stack.
- Esri is better at exposing **per-tile capture date** (Identify / [World
  Imagery Wayback](https://livingatlas.arcgis.com/wayback/)). Mapbox does not
  expose an easy on-map capture date in GL.

For a given Khartoum vs Nyala tile, “who’s newest” is a **local metadata**
question, not a product-wide winner.

## Roads-on behavior (defined)

| Source | Roads ON | Roads OFF |
|--------|----------|-----------|
| Mapbox | `satellite-streets-v12` | `satellite-v9` |
| Esri | light/dark carrier + Esri raster; Mapbox road layers with existing boost | Same, roads hidden |

## Recommendation (pending Sudan flip comparison)

**Interim (this PR):** keep **Mapbox as default**; ship temp A/B so analysts can
compare Country / Area / Site bands on Sudan.

**After comparison, choose one:**

| Outcome | Action |
|---------|--------|
| A. Mapbox clarity + color OK for Sudan | Keep Mapbox; remove A/B UI; note “odd cast accepted” |
| B. Esri clearer / fresher at key sites | Switch Satellite default to Esri raster; keep Mapbox as optional alt or drop A/B |
| C. Color-only issue on Mapbox | Explore Mapbox raster paint tweaks / LUT before vendor switch |
| D. Neither adequate for camp/LogIE cross-check | Keep basemap as-is; pursue EO path (Sentinel/Planet) per camps research — separate from Satellite basemap |

**Recommended next alternatives if A/B shows basemap mosaics are insufficient:**

1. **NASA GIBS** true-color (or Landsat) as a *secondary* “recent change” overlay —
   not a Satellite replacement.
2. **Sentinel-2** (analyst workflow / tiles) for free mid-res refresh over known
   sites — see `docs/research/displacement-camps-satellite.md`.
3. **Commercial EO** (Planet / Maxar tasking) only with cost owner — not for
   default basemap.

## How to run the A/B

1. Open `/map`, set basemap to **Satellite**.
2. Use floating **Imagery A/B (temp)** chip (or Layers control).
3. Compare Mapbox vs Esri at Country (~z5–6), Area, and Site zooms over:
   Khartoum, Nile corridor, Darfur settlement/camp areas of interest.
4. Note: color cast, road/settlement contrast, alignment vs COD boundaries /
   landmarks, and (for Esri) capture date via Wayback if needed.
5. Record outcome A–D above; then remove temp UI or flip default.

## Implementation pointers

- `src/lib/map/satellite-imagery-ab.ts` — style resolve + Esri raster sync
- `src/components/map/crisis-map.tsx` — prop + sync effect + roads boost for Esri
- `src/app/(app)/map/page.tsx` — state + floating chip
- `src/app/(app)/map/_components/map-panel-bar.tsx` — Layers segment

## Out of scope (unchanged from #160)

- Full multi-provider marketplace in Layers for all users
- Replacing Mapbox as map runtime
- Live satellite tasking / true NRT APIs as the default basemap
- Terrain / Topography (already shipped)
