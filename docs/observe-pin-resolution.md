# Observe pin resolution

How `/observe` chooses map geometry for a filed **Signal**, and what still
needs clear-api / pipeline work for CLEAR's location ontology.

## Product terms (CONTEXT.md)

| Term | Role here |
| --- | --- |
| **Signal** | Raw field observation created by Observe |
| **Location** | Gazetteer / admin row (levels 0–4) with optional Point geometry |
| **landmark-geocoded** | `pointType` on an L4 whose name came from text (e.g. "Nyala Airport") via the pipeline geoparser + `findOrCreateLandmarkL4` |
| **Location challenge / correction** | Analyst trust wedge on Signal pins — separate from intake geocoding |

Observe must leave a **Signal** with geometry the map can paint
(`generalLocation` Point, or lat/lng resolved at create into an L4).

## What this FE PR does

1. **Catalog resolve** — `@chip`, trailing `@token`, or unique free-text admin
   name → `locationId`. When one toponym matches several admin levels
   (e.g. two "Khartoum" rows), pick the **most specific** level instead of
   aborting (aborting created Signals with **no** location — invisible on
   team-scoped Detection / `/map`).
2. **Mapbox POI refine** — when there is no GPS, geocode
   `draft + catalog label`. If Mapbox returns a **poi / address / landmark**,
   submit `lat`/`lng` so clear-api `createPointLocation` pins there
   (e.g. "National Museum" inside Khartoum). Bare city `place` hits are
   ignored so we keep the catalog centroid.
3. **GPS** — exclusive; no catalog / geocode override.
4. **Observe Signals list** — paginated `signalsPage` for manual sources,
   **without** team location filter (team scope hid out-of-AO GPS pins).

## What still needs BE / pipeline (not in this PR)

| Gap | Why FE alone is incomplete | Ontology-aligned fix |
| --- | --- | --- |
| Named landmark L4 | `createPointLocation(lat,lng)` labels `"Point 15.6, 32.5"` — not a reusable named place | Extend `CreateManualSignalInput` with `pointName` (already on pipeline `CreateSignalInput`) and call `findOrCreateLandmarkL4` with `pointType: landmark-geocoded` |
| LLM / geoparser on manual text | Mapbox is string geocode, not crisis NER; multilingual / messy field notes need the same geoparser Dataminr uses | `process_manual_signal` Celery task should run the pipeline geoparser when intake only had a coarse admin `locationId` (requires Redis/Celery healthy in every env) |
| Team scope vs GPS abroad | `/map` `signals.forMap(teamId)` filters by team locations — Chile GPS never appears for a Sudan-scoped team | Product choice: show creator-visible field Signals on map, or keep AO filter and document that GPS must be in-theater for Layers → Signals |

`findOrCreateLandmarkL4` is **admin/pipeline only** today — Observe must not
call it from the browser without a new authorized mutation.

## Manual test plan (add to PR)

- [ ] `/observe` → GPS → short note → Observe **Signals** tab shows the new card after submit (and after refresh)
- [ ] Same signal on Detection → Signals (team AO) when GPS/place is in-theater
- [ ] `/observe` → `@Khartoum` chip (no GPS) → `/map` Layers → Signals: pin near Khartoum
- [ ] `/observe` → `@Khartoum` + body mentioning **National Museum** (or another Mapbox POI) → pin near the museum, not a random city centroid
- [ ] Free-text `Flooding in Khartoum` without chip → catalog pin (or POI if Mapbox returns one)
- [ ] Two distinct places in one note (`Khartoum` and `Al-Fashir`) without chip → submit OK, **no** guessed pin
- [ ] Offline queue → drain keeps lat/lng or locationId
- [ ] Map search accepts Observe GPS chip format `33.4445°S 70.6452°W` and flies to that point
