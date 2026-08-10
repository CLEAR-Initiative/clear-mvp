# CLEAR Map Design

Design spec for the crisis map (`src/components/map/crisis-map.tsx`). Every
paint decision in the map code should trace back to a rule here. When a rule
changes, change it here first.

## Who the map serves, at which zoom

The map is not one product - it is four, indexed by zoom. Each persona
operates in a band, and every layer must be tuned per band, not globally.
Mapbox paint properties are zoom-interpolated; a treatment that reads at
z12 can be invisible at z6. **Always verify changes at the band that
matters, not at the zoom the browser happens to be at.**

| Band | Zoom | Persona / task | What MUST read |
|------|------|----------------|----------------|
| Region | 0-4 | Global Response Coordinator scanning multiple countries | country shapes, focus country, marker clusters |
| Country | 5-8 | Field Program Manager - **the default and primary band** | A1 state boundaries, trunk road corridors (supply routes), major settlements, water |
| Area | 9-11 | Emergency Programmes Specialist planning deployment | A2 districts, secondary roads, towns, airports, wadis |
| Site | 12+ | Area/Field Coordinator in the operational zone | street grid, neighbourhoods, airstrips, rivers |

The app opens on the Country band (Sudan at z5-6). Any layer that only
performs in the Site band is a decoration, not a feature.

## Base maps

Three exclusive modes (Layers UI still labels Topography as **Terrain**), one
design language. Product language: **Simple** | **Topography** | **Satellite**
— see `CONTEXT.md` and [ADR-0004](adr/0004-topography-uses-mapbox-setterrain-not-cesium.md).

- **Simple** - Mapbox light-v11 / dark-v11 following the app theme. The
  clean canvas for data overlays. Flat camera; no DEM mesh.
- **Topography** (UI: Terrain) - **Hybrid Topography**: same light/dark
  cartography as Simple, plus hillshade **and** a Mapbox `setTerrain` mesh on
  `mapbox-terrain-dem-v1`. NOT a separate Mapbox style: outdoors-v12 was tried
  and rejected (pale landcover, no dark variant, drowned our overlays).
  - **Pitch opt-in** — camera stays top-down (`pitch: 0`) until the analyst
    tilts; no auto-pitch on select; no dedicated Layers “3D” toggle. Leaving
    Topography clears the mesh and resets pitch. A one-time dismissible tilt
    hint teaches the gesture.
  - **Country-band exaggeration** — visual mesh boost stronger at z5–8,
    relaxing toward Site. Paint/mesh only; **Point altitude** stays
    unexaggerated DEM metres.
  - **Point altitude** — approximate DEM elevation via
    `queryTerrainElevation` while Topography is active: orange ground probe
    under the cursor (fades over pitched sky) and a row on the open Marker
    detail panel beside Copyable coordinates. Soft “approx.” / DEM qualifier;
    not survey grade; not Access / Terrain hazards.
- **Satellite** - imagery (satellite-v9, or satellite-streets-v12 when
  Roads is on). Ground-truth mode for site assessment. Flat in this wedge
  (no DEM mesh / Point altitude).

Rules that hold across all three:

1. Overlay colors key off the **basemap's** lightness, not the app theme.
   Satellite is always a dark basemap, even in light mode.
2. Country-focus fills (mask/tint) insert **below the road layers**.
   Fills above roads bury the network (only symbols render above fills).
3. The blue focus tint exists only on Simple. On Topography/Satellite the
   focus is carried by border + outside mask, never a wash over imagery.
4. **Terrain mesh is Topography-only.** Simple and Satellite stay flat;
   do not drape DEM on those modes in this wedge.

## Roads = supply corridors

On humanitarian field maps roads are logistics infrastructure, not
navigation chrome. Mapbox's light/dark styles draw roads at 1-8% lightness
off the land color and 0-0.45px below z13 - deliberately camouflaged. The
Roads toggle therefore means **emphasis**, not existence: when ON, we
override paint on the style's road layers.

- **Corridors** (motorway/trunk/primary) - warm tan, the conventional
  supply-route color; must be clearly visible from z5, because "which
  corridor reaches this state" is a Country-band question.
- **Minor roads** (secondary and below) - neutral gray, fading in through
  the Area band, dense only in the Site band.
- Width curve is defined at z5/8/11/14/16 anchors - the z5 and z8 anchors
  are the ones that carry the humanitarian use case; never tune only the
  high end.
- Satellite: no paint override (satellite-streets styles its own roads);
  the toggle switches between satellite-v9 and satellite-streets-v12.

## Layer stack (bottom to top)

1. Basemap land / water / landuse
2. DEM terrain mesh (`setTerrain`) + hillshade (Topography only)
3. Focus mask (dims non-focus countries) + focus tint (Simple only)
4. Roads
5. Mapbox admin lines / A1 fallback borders
6. Backend admin boundaries (A1/A2 lines), focus country border
7. Population choropleth (opt-in)
8. Labels (style symbols; settlement labels relaxed inside focus country)
9. Markers, cluster donuts, marker detail (DOM); Point altitude probe (Topography)

## Color roles

| Role | On light basemap | On dark basemap (incl. satellite) |
|------|-----------------|-----------------------------------|
| Road corridor | hsl(28, 35%, 44%) | hsl(33, 30%, 56%) |
| Road minor | hsl(220, 6%, 70%) | hsl(0, 0%, 46%) |
| A1/A2 boundaries | #1D4ED8 | #60A5FA |
| A1 fallback (Mapbox tiles) | #475569 | #94A3B8 |
| Focus border | #1D4ED8 | #60A5FA |
| Focus tint (Simple only) | #1E40AF @ .35 | #1E3A5F @ .45 |
| Outside mask | #FFF @ .9 (Simple) / #000 @ .4 | #000 @ .55 (Simple) / #000 @ .4 |
| Markers | severity scale (critical red -> low green), orange accent rings; type glyph on unclustered pins | same |

Boundaries are blue, corridors tan, markers orange/severity - three
distinguishable information channels at every zoom and theme. On the
point density band, severity stays the disc color and type is a white
SVG glyph (`resolveMarkerIconSlug` → `/images/ui-kit/signals/icons/`).
Heatmap and donut bands stay severity-only so glyphs do not fight
aggregation.

## Known limits / roadmap

- DEM + hillshade are real relief: central Sudan is flat and will stay
  visually quiet on Topography even with Country-band exaggeration. The
  relief shows in Jebel Marra, the Nuba Mountains, and the Red Sea Hills.
  If flat regions need texture, add a landcover tint - do not swap the
  base style.
- Point altitude is a readout only (approx. DEM metres). Do not derive
  passability or **Terrain hazards** from it in this wedge; Access /
  Blockages stay LogIE-sourced
  ([ADR-0003](adr/0003-logie-is-access-constraint-source.md)).
- The durable version of all of this is a custom Mapbox Studio style pair
  ("CLEAR Light"/"CLEAR Dark") with these rules baked in, replacing the
  runtime overrides. Runtime overrides are the tactical layer.
- Admin boundaries come from the backend (OCHA CODs); the Mapbox A1
  fallback is only for countries without loaded geometry.
