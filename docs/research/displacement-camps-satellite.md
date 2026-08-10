# Research: displacement camp locations + satellite-assisted presence

**Branch:** `research/displacement-camps-satellite`  
**Expo:** [#319](https://www.exponential.im) — RESEARCH (grill locked 2026-07-27; artifacts rehydrated 2026-08-04)  
**Status:** research only — no production Camps layer / prod Expo tickets / prod PRs until NRC protection/IM approval  
**Opened:** 2026-07-27 · **Rebased onto:** `origin/dev` 2026-08-04

## Problem

CLEAR’s map may want **current displacement / IDP camp locations**. Public “live”
camp coordinates are scarce: sites move under conflict pressure, and RSF/SAF (or
access policy) dynamics make static HDX/IOM snapshots go stale quickly — sometimes
on a **multi-day** cadence near active fighting.

Satellite imagery (and published humanitarian EO products) may help **confirm or
challenge** whether a reported site still looks occupied — without inventing a
live camp registry from basemap tiles alone.

A longer product horizon (not this ticket’s ship gate): if we can hold **time-stamped
presence** plus nearby conflict context, we may later explore **short-horizon
displacement migration forecasts**. That raises the sensitivity bar further —
treat forecasting as a separate, gated research track after presence is credible.

## Locked decisions (grill 2026-07-27)

| Decision | Choice |
|----------|--------|
| Primary goal | Current **IDP / camp presence** on the map, as fresh as responsible |
| Satellite role | Assist **site presence** checks — not LogIE |
| LogIE / Blockages on this branch | **Out** (reuse EO pattern later, separate ticket) |
| Pipeline model | **Hybrid queue**: partner + stale/uncertain + high-movement → imagery review |
| Freshness ambition | **≤14–21 days** for priority/mobile; always show **age + source + demote** |
| High-mobility reality | Near conflict, sites may move **every few days** — treat ≤21d as ambition for *priority* sites only; many will be older and must be demoted, not hidden |
| Publisher (product hypothesis) | CLEAR proposes → **NRC confirms** |
| This phase | Research + **FE prototype** only |
| Site types | Formal + informal scored separately; north star = **informal/mobile** |
| Geography | Sudan catalog + **2 EO contrast sites** |
| EO stack | Sentinel-2 + UNOSAT-class first; commercial only if needed |
| Safety | Fuzz in shared artifacts; **NRC protection/IM before any prod ticket** |
| Map object | Research judges **Camps/sites** layer; **IDP Density** can come later |
| Go/no-go | Technical bar on partner path + usable EO review; may be “technically go, blocked on NRC” |
| Prototype | `/research/camps` (dev flag): mock queue UX + **gitignored** official camps smoke set |
| Leak discipline | **One research ticket** + one-pager + docs + prototype. **No** prod branch / prod PRs / prod Expo tickets until NRC approval |
| Forecasting | **Horizon only** — not in #319 go/no-go. Requires presence history + conflict context + stronger ACL than presence |

## Non-goals (for now)

- Implementing a production Camps layer on the main Layers list.
- Replacing LogIE with CV / imagery for Access status (ADR-0003 stands).
- Scraping partner systems or publishing PII / precise household locations.
- Buying commercial imagery without a product decision + cost owner.
- Shipping displacement **forecast** polygons or predicted move arrows on FE.
- Writing precise camp coordinates into git, CI, tickets, or public docs.

## Research questions

### Presence (this ticket)

1. What public datasets exist for Sudan IDP / informal sites today (IOM DTM, CCCM,
   UNHCR, REACH, HDX), and what is their typical **as-of lag**?
2. Which EO sources are realistic for CLEAR (Sentinel-2 free; commercial Planet /
   Maxar; UNOSAT products; Mapbox/Google satellite basemap alone is **not** enough)?
3. Can camp detection be **human-in-the-loop** (analyst marks sites from imagery)
   rather than fully automated CV for v1?
4. What refresh cadence is “good enough” given multi-day mobility — and how do we
   **confirm a temporary location** without claiming permanence?
5. Legal / Do No Harm: publishing precise camp coords can endanger people — what
   aggregation / fuzzing / access control does NRC expect?

### High-mobility confirmation (next research depth)

6. What is the minimum evidence stack to label a pin **“observed as-of T”** vs
   **“still current”** (partner report, EO scene date, field confirm, silence)?
7. How do we model **site identity** when a camp relocates 5–20 km (same ID + move
   event vs new site + abandonment of old)?
8. For sites near active conflict, is the honest product object a **trail of
   time-stamped observations** rather than a single live pin?
9. What demotion / expiry rules match multi-day mobility (e.g. auto-demote at 7d
   near conflict AOIs vs 21d elsewhere)?

### Forecasting horizon (separate track after presence)

10. Given observation history + nearby violence (Detection events/signals), what
    short-horizon products are ethical and useful (directionality hints for
    planners vs public “predicted next camp” pins)?
11. What must **never** leave the API (full history, precise trails, model scores)
    vs what FE may show (coarse region, confidence band, “under review”)?
12. Who is allowed to run / see forecasts (NRC IM / protection only)?

## Candidate tracks (presence)

| Track | Idea | Pros | Cons |
|-------|------|------|------|
| A. Curated partner feed | IOM DTM / CCCM / NRC field GIS as GeoJSON ingest | Trusted, attributed | Lag; may not include informal sites |
| B. UNOSAT / activation products | Consume published damage / site maps | Humanitarian pedigree | Irregular cadence; not always Sudan-wide |
| C. Free EO + analyst workflow | Sentinel-2 (or similar) tiles + internal review UI | Controllable freshness | Analyst cost; detection skill; cloud cover; revisit ~5d |
| D. Commercial EO API | Planet / Maxar tasking or archive | Higher resolution / revisit | Cost; contracts; still needs interpretation |
| E. CV camp detector | Train/fine-tune on known footprints | Scale | High false positives; ethics; hard in sparse scrub |
| F. Basemap-only | Rely on Mapbox satellite underlay | Zero new data | No structured camp layer; not queryable |

**Likely v0:** A and/or C (partner points + optional imagery-assisted verification),
not E. Forecasting is **not** a v0 track.

## Sensitivity & data architecture (presence → forecast)

Treat camp coordinates as **protection-sensitive**, not ordinary map chrome.

| Layer | Presence (near-term) | Forecast (later, gated) |
|-------|----------------------|-------------------------|
| **Source inputs** | Partner extracts, EO scene metadata, analyst review status | + Detection conflict features near prior sites; never scrape PII |
| **API / DB** | Authoritative store: site id, geometry (precision per ACL), `as_of`, source, review status, moved-from/to links | Observation history + model runs in **restricted** tables; role-gated; audit log |
| **BFF (clear-mvp)** | Serve slim GeoJSON for authorized roles only; no precise pins in logs/Sentry | Same; never embed forecast trails in public RSC payloads |
| **FE paint** | Default: fuzzed / aggregated / demoted styling; precise pins only for approved roles | Prefer **region-level** or directional hints; avoid “predicted pin at lat/lng” unless NRC explicitly wants it |
| **Git / tickets / CI** | Names + fuzz only; precise fixtures in `.local/` only | Same — no sample forecast GeoJSON with real coords in-repo |
| **Retention** | Define max history retention with NRC (shorter near conflict) | Model outputs may need shorter TTL than presence |

**Hard rules for this branch**

1. Precise official coordinates → `.local/` (gitignored) or env-pointed path only.
2. Committed mock sites use **dummy** coordinates (non-Sudan).
3. Docs and tickets: site **names** and qualitative AOIs — no paste of lat/lng.
4. Production Camps / forecast tickets stay closed until NRC protection/IM signs the
   precision + ACL policy.
5. Forecasting must not auto-publish predicted locations to the general analyst map
   without an explicit product + protection decision.

## Partner-layer catalog (Sudan) — 2026-07-27

Inventoried public HDX / DTM / CCCM / UNHCR / REACH surfaces. **No precise
coordinates are recorded in this doc.**

| Source | What it is | Geometry / grain | As-of / lag | License | Formal vs informal | Ingestible for CLEAR sites? |
|--------|------------|------------------|-------------|---------|----------------------|------------------------------|
| **IOM DTM — Displacement & Return Snapshot (HDX)** | Current public masterlists; Snapshot (6) titled **25-May-2026**, file on HDX ~18 Jun 2026 | **Admin1 / Admin2 only** (state + locality counts). Sheets explicitly ADM1/ADM2 — **no site pins** | ~weeks–months; HDX `data_update_frequency` ≈ 90 days; freshest public snapshot still lagging field | CC BY (credit IOM DTM) | Mix of shelter typologies in narrative products; **public tables are caseload aggregates**, not camp footprints | **Density / admin overlay only** — not a Camps layer. Good future feed for **IDP Density**, not sites. |
| **IOM DTM API (`sdn-iom-dtm-from-api` on HDX)** | Machine API of non-sensitive aggregates | Country / Admin1 / Admin2 | ~weekly metadata cadence | DTM terms + HDX | Same limitation | Same — no site pins |
| **IOM DTM — location (Admin3) masterlists** | Full location lists used internally (~10k–13k locations cited in 2026 snapshots) | Location-level; coords typically in restricted extracts | Tracks mobility rounds / snapshots | Via **Data Access Form**; not on public HDX | Includes camps, gatherings, host-community locations, etc. | **Yes, if NRC/IOM grant access** — strongest partner path for hybrid queue. Protection review required before any FE use. |
| **HDX “Sudan IDP camps” (OCHA Sudan / IOM)** | Legacy XLSX (~89 rows; ~74 typed `camp`) with GPS columns | Point GPS | **Dataset date 20 Feb 2020** (modified Mar 2020) — **~6 years stale** | Public Domain / CC0 | Mostly formal **camp** class on a 2020 baseline; poor for post-Apr-2023 mobility | **Smoke-test / historical only.** Useful for `/research/camps` official fixture experiments **locally**; must not be treated as current. |
| **Site Management / CCCM Sudan** | Site assessment factsheets; partner fact sheets for named Darfur sites | Narrative + maps in PDFs; **no public monthly GeoJSON masterlist** | Irregular; assessment batches | Cluster products; contact SMC IM | Planned sites, collective centres, **informal settlements** in scope | **Partner ask** — request current site master / sharing MoU. |
| **REACH / IMPACT — Emergency Site Mapping & Site Master DB (ToR Jul 2025)** | Multi-phase mapping aiming ~**2500 IDP gathering sites**; remote sensing + field; SMC partnership | Site ID + spatial layout (planned) | Phased 2025+ rollout; HDX listed as a *possible* share destination in ToR — **not confirmed published** | Partner / IMPACT terms | Explicit focus on hard-to-reach + informal / under-reported | **High-value partner track** for informal north star. Ask NRC whether they already receive SMC/REACH extracts. |
| **UNHCR Sudan ops portal / dashboards** | Counts of IDP / refugee camps; IDP totals from IOM/OCHA | Dashboard / PDF — not an open site GeoJSON for IDP camps in this pass | Dashboard as-of dates (months) | UNHCR ops data policies | Formal camps counted; most IDPs still outside formal camps | Refugee camp layers may exist in UNHCR GIS channels; **IDP camp pins not found as public bulk download** here. |
| **UNOSAT products** | Activation maps (e.g. damage SHP/PDF) | Damage / AOI polygons; **not a maintained IDP camp registry** | Irregular activations | UNOSAT terms | N/A (damage ≠ camp presence) | **EO assist / context**, not partner SoT for camps |
| **Mapbox satellite basemap** | Visual underlay only | Imagery tiles, undated for ops | N/A | Mapbox ToS | N/A | **Insufficient** as structured camp layer |

### Catalog conclusions

1. **No public, current, site-level camp GeoJSON** for Sudan that meets the ≤14–21 day ambition.
2. **Ingestible public path today** = Admin2 DTM snapshots → supports **density**, not **sites**.
3. **Site-level partner path** = DTM Data Access Form and/or SMC / REACH masterlist sharing — **required** for technical “go” on Camps.
4. **2020 HDX camps file** = only easy public points with GPS; use for **local smoke fixture** only.
5. Informal / mobile sites (north star) are exactly where public catalogs are weakest → **EO review queue is not optional** if we pursue sites.
6. Multi-day mobility means partner lag alone will often miss truth → presence must be modeled as **observations over time**, not a single authoritative pin.

## EO contrast sites (picked for spike)

Names only — **no coordinates in-repo**.

| Role | Site (public narrative) | Why |
|------|-------------------------|-----|
| **Formal / known** | **Krinik Camp** (West Darfur) — typed `camp` on the 2020 IOM baseline; named in Darfur displacement reporting | Tests whether 10 m Sentinel-2 can confirm a **planned/formal** footprint; minutes-per-site baseline for “easy” case |
| **Informal / mobile** | **Qarni** gathering area NW of El Fasher (North Darfur) — open-source satellite reporting (late 2025) describes rapid footprint growth after El Fasher displacement | Stresses **change / expansion** under conflict pressure; closer to the product north star |

**Fallback informal AOI** if Qarni imagery is fully clouded: **Al Affad** (Northern State).  
**Fallback formal AOI:** a Tawila-area named site from recent SMC/CCCM fact sheets.

### EO spike method (to run next)

1. Copernicus Browser / Sentinel Hub: latest clear Sentinel-2 L2A over each AOI; note acquisition date + cloud %.
2. Optional: search UNOSAT product catalogue for overlapping AOIs (damage maps as context only).
3. Timebox: target ≤45 min/site for “usable / inconclusive” judgment; log wall-clock.
4. Do **not** paste precise coords or full-res screenshots with identifiable pinpointing into git/tickets — fuzz or describe (“~AOI north of El Fasher”).
5. Explicitly score: *could this support a multi-day re-check loop?* (revisit cadence vs mobility).

## Confirming a temporary location (working model)

When a site may move every few days, “the camp is here” is the wrong claim. Prefer:

```
observation {
  site_id | provisional_id
  geometry          # precision tier: exact | fuzzed | admin_only
  observed_at       # EO scene date or field report time — not "now"
  observed_by       # partner | analyst_eo | nrc_confirm
  confidence        # high | medium | low | inconclusive
  status            # present | reduced | abandoned_suspected | unknown
  conflict_context  # optional: nearby event ids / severity band (no extra precise people data)
}
```

**Confirmation ladder (strongest → weakest)**

1. NRC / field confirm after proposal  
2. Partner site master with recent `as_of`  
3. Analyst EO review on dated scene (“footprint consistent / inconsistent / inconclusive”)  
4. Stale partner point with demotion badge only  

**Product implications**

- FE default copy: **“Observed as of {date}”**, never “live”.
- Near-conflict demotion window shorter than the 14–21d ambition.
- Relocation = **new observation** (+ link from prior site); do not silently teleport a pin.
- Forecasting later consumes the observation trail + Detection conflict context — it does
  **not** replace confirmation.

## Prototype (research only)

- Route: `/research/camps` behind **dev** or `ENABLE_CAMPS_RESEARCH=1` — `notFound()` otherwise; never on the main Layers list.
- API: `GET /api/research/camps` (same gate).
- UX: review-queue shell with `as_of`, source, confidence, local status overrides.
- Data: committed **mock** sites use dummy coords; precise **official** camps from gitignored `.local/camps-official.json` (schema: `docs/research/camps-official.example.json`). Override path with `CAMPS_RESEARCH_FIXTURE_PATH`.
- Shared docs/screenshots: fuzzed or names-only — no precise pins in git or tickets.
- Go/no-go draft: `docs/research/camps-go-no-go.md`

## Working notes

- 2026-07-27: Branch opened from `origin/dev`.
- 2026-07-27: Expo #319 filed; grill decisions locked; catalog + EO site picks + prototype scaffolded in session (later lost from git; see 2026-08-04).
- 2026-07-27: Partner catalog completed. Public site pins = stale 2020 only; current DTM public = Admin2.
- 2026-07-27: EO contrast pair locked: Krinik (formal) + Qarni (informal/mobile).
- 2026-08-04: Rebased onto current `dev`. Rehydrated grill artifacts + added high-mobility confirmation + forecasting-horizon / sensitivity architecture notes.

## Next steps (this ticket)

1. ~~Inventory Sudan camp / site layers on HDX + IOM DTM / CCCM / UNHCR.~~
2. **EO contrast spike:** Sentinel-2 (± UNOSAT-class) on Krinik + Qarni; record minutes/site + confidence + whether revisit supports multi-day re-check.
3. ~~Build `/research/camps` prototype + gitignored fixture loader.~~ (scaffold restored; drop real rows into `.local/camps-official.json` locally only)
4. **Schedule NRC protection/IM call** — agenda below (add: multi-day mobility + forecast horizon sensitivity).
5. Write / finalize go/no-go one-pager; comment on #319.
6. **Optional research appendix (not ship gate):** outline observation-history schema + FE paint tiers for a future forecasting spike — still no prod ticket.

### NRC protection / IM call — agenda draft

- What “current IDP site” means operationally for NRC Sudan (formal camp vs gathering vs host community).
- Can NRC share / relay DTM Admin3 or SMC/REACH site master extracts under what ACL?
- Precision policy: full coords vs fuzz vs density-only for CLEAR roles.
- Confirm workflow: CLEAR proposes from partner+EO → NRC confirms before publish?
- Multi-day mobility: acceptable demotion windows; trails vs single pin; what FE may show.
- Forecasting horizon: is directional / regional prediction ever desired? Who sees it? What must never be stored or painted?
- Timeline: is ≤14–21 day freshness realistic for any site class near active conflict?

## Related

- Expo #319: displacement camp locations + satellite-assisted presence
- Go/no-go one-pager: `docs/research/camps-go-no-go.md`
- Official fixture schema (copy → `.local/`): `docs/research/camps-official.example.json`
- Product language: `CONTEXT.md` (IDP Density vs Blockages vs NRC locations; open research note)
- Access / Blockages (out of scope here): `docs/clear-api-logie-ingest.md`, `docs/adr/0003-logie-is-access-constraint-source.md`
- Location trust (different problem): `docs/adr/0003-location-trust-challenge-without-candidates.md`
