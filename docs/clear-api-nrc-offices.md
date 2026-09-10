# clear-api: NRC offices / locations — backend requirements

> **Expo #516 / #471** (multi-country Operational layers) · Related FE **#278** (Sudan wire-up)  
> Do **not** hardcode only Sudan in clear-api. CLEAR deployments today: **SDN, AFG, VEN**.

This is the handoff brief for clear-api. Frontend Sudan smoke today lives in
`src/lib/data/sudan-nrc-offices.ts` and paints via `src/lib/map/nrc-office-markers.ts`.
Production must replace that static import with an authenticated country-scoped
API so Afghanistan and Venezuela get the same Layers → **NRC locations** path.

---

## Goal

Persist and serve **NRC office / presence pins** (city/locality centroids — not
surveyed premises) filtered by **ISO3**, so `/map` can request the working
country (or merge team countries on All Countries) without shipping AFG/VEN
datasets inside the Next.js bundle.

Ontology framing (CLEAR Domain Model v0.3.0): these are **Operational** /
reference presence points about **Places**, not Signals or Events. Coordinates
are approximate centroids; product copy must keep the centroid disclaimer.

---

## Trust / precision (product)

| Field | Meaning |
|-------|---------|
| `as_of` / `source.asOf` | Publication date of the source report / directory |
| `pulled_at` | When CLEAR last synced or published this country’s set |
| `latitude` / `longitude` | **City/locality centroid**, not a verified building footprint |

Never present pins as street-level premises unless a later verified address
pipeline exists. FE already shows a centroid disclaimer for Sudan; the API
must carry enough source metadata for the same disclaimer per country.

---

## Must do

1. **Serve by ISO3** — at least `SDN`, `AFG`, and `VEN` (CLEAR app countries).
   Endpoint accepts `iso3` the same way Blockages does
   (`GET /api/nrc/offices?iso3=AFG`). Missing country → **empty FeatureCollection
   / empty list** (HTTP 200), not Sudan leftovers, not a hard 500.
2. **Persist** the slim office record (see contract below) with stable `id`
   per country (`{iso3}:{slug}` or UUID + `iso3`).
3. Include **`pulled_at`** and **source citation** (`report`, `reportUrl`,
   `pages`, `asOf`, `coordinatePrecision`) on the response `meta`.
4. **Auth / ACL** consistent with other CLEAR operational data — not a public
   unauthenticated dump. Prefer scoping to the caller’s Operation Places.
5. Document how AFG / VEN office lists are authored (NRC country annual
   report, CO directory, or ops spreadsheet) and who owns updates.

## Must not

- Return Sudan offices when `iso3=AFG` or `iso3=VEN`.
- Require the browser to import `sudan-nrc-offices.ts` for non-Sudan countries.
- Invent street addresses or building footprints from centroids.
- Block this contract on Access / LogIE Blockages work (parallel track).

---

## v1 scope

| Topic | Expectation |
|-------|-------------|
| Country | **`iso3` ∈ {SDN, AFG, VEN}** first; more Operations later |
| Geometry | Point `[lng, lat]` WGS84 city/locality centroids |
| Types | Same enum as FE Sudan smoke: `country_office`, `area_office`, `field_office`, `planned_or_expansion`, `former_country_office` |
| Status | `active`, `hibernating_remote`, `expansion`, `relocated` |
| Serving | JSON list or GeoJSON FeatureCollection; FE can adapt |

Sudan FE shape today (`SudanNrcOffice`) is the reference implementation —
generalize names to `NrcOffice` / drop the Sudan prefix in the API.

---

## Map response contract

Prefer a **FeatureCollection** so the map path matches Blockages / Seismic:

```ts
{
  type: "FeatureCollection",
  features: Array<{
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      id: string,
      iso3: "SDN" | "AFG" | "VEN" | string,
      name: string,
      city: string,
      state: string,           // ADM1-ish label when known
      office_type: "country_office" | "area_office" | "field_office" | "planned_or_expansion" | "former_country_office",
      area_office: string | null,
      status: "active" | "hibernating_remote" | "expansion" | "relocated",
      address: string | null,  // imprint text only; pin still uses centroid
      notes: string,
    },
  }>,
  meta: {
    source: "nrc-offices",
    iso3: string,              // single-country responses
    feature_count: number,
    pulled_at: string,         // ISO — CLEAR publish / sync time
    citation: {
      report: string,
      reportUrl: string | null,
      pages: string | null,
      asOf: string,
      coordinatePrecision: string, // must state “centroid, not premises”
    },
  },
}
```

### Client wiring (clear-mvp follow-up)

1. BFF `GET /api/nrc/offices?iso3=` (cookie forward), mirror LogIE Blockages.
2. Map country picker → ISO3 via `countryNameToBlockagesIso3` (or a shared
   `countryNameToIso3` helper) — same SDN / AFG / VEN table.
3. Replace `SUDAN_NRC_OFFICES` hard-import with fetch when API is ready;
   keep Sudan static file as **dev fallback** only.
4. Empty AFG/VEN responses show an honest empty state / hint, not Sudan pins.

Until clear-api ships AFG/VEN payloads, FE may keep Sudan-only paint; this
doc is the **contract** so BE can deliver without another FE redesign.

---

## Acceptance

1. `GET …?iso3=SDN` returns the Sudan office set (parity with today’s FE list).
2. `GET …?iso3=AFG` and `GET …?iso3=VEN` return that country’s set **or** an
   empty collection with `meta.iso3` set — never another country’s pins.
3. Every feature carries `office_type`, `status`, and centroid coordinates.
4. `meta.citation.coordinatePrecision` states centroids, not premises.
5. Auth required; undocumented public dump is not acceptable.
6. Out of scope: verified building footprints; LogIE Blockages; Access IA.

## Related

- FE Sudan smoke: `src/lib/data/sudan-nrc-offices.ts`
- FE markers: `src/lib/map/nrc-office-markers.ts`
- Multi-country layer gap: Expo **#516** / **#471**
- Blockages ISO3 parallel: [`docs/clear-api-logie-ingest.md`](./clear-api-logie-ingest.md),
  `src/lib/map/blockages-countries.ts`
- CONTEXT.md: **NRC locations**, **Operation**
