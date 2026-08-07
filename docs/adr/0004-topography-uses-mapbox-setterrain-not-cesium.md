---
status: accepted
---

# Topography uses Mapbox `setTerrain`, not Cesium

CLEAR’s **Topography** basemap needs a real DEM-backed heightmesh (not hillshade-only)
while keeping the existing Mapbox crisis map (markers, focus mask, Roads, theme bridge).
We enable **terrain mesh** with Mapbox GL `setTerrain` on the already-loaded
`mapbox-terrain-dem-v1` source, and reject Cesium (or any second map runtime) for this
wedge — swapping engines would re-implement the whole overlay stack for little gain over
DEM we already pay for.

## Considered options

- **Mapbox `setTerrain` + hillshade (chosen).** Hybrid Topography: readable top-down
  with opt-in pitch; **Point altitude** via `queryTerrainElevation` on the same DEM.
- **Cesium (or other globe engine).** Rejected: replaces Mapbox runtime; markers, focus
  mask, Roads emphasis, and theme coupling would be rebuilt.
- **Hillshade-only forever.** Rejected: fails GH #137 / Expo #315 (“Topography ≈ Simple”)
  and does not deliver a true heightmap.
- **Pitch-required 3D only.** Rejected: Country-band briefing UX needs top-down by
  default; pitch stays opt-in.

## Consequences

- Topography owns DEM source, hillshade, `setTerrain`, pitch reset on leave, and point
  altitude sampling — all Mapbox-side in clear-mvp.
- Satellite / Simple stay flat in this wedge; DEM-derived **Terrain hazards** Access
  remains a later product decision, separate from LogIE **Blockages**.
