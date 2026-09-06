# Research: displacement camp locations + satellite cross-check

**Branch:** `research/displacement-camps-satellite`  
**Status:** exploration only — not scheduled against Expo #280 / #317 / #277  
**Opened:** 2026-07-27

## Problem

CLEAR’s map may want **current displacement / IDP camp locations**. Public “live”
camp coordinates are scarce: sites move under conflict pressure, and RSF/SAF (or
access policy) dynamics make static HDX/IOM snapshots go stale quickly.

Separately, LogIE **Blockages** statuses on SDN are often weeks old. Satellite
imagery (or derived change products) might eventually help **double-check** whether
a corridor that LogIE still marks constrained still looks blocked / deserted /
active — without replacing LogIE as Access SoT (see ADR-0003).

## Goals for this branch

1. Find whether a **repeatable, ethically acceptable** path exists to put camp
   presence (points or footprints) on `/map`.
2. Rank approaches by latency, cost, licensing, operator burden, and Sudan coverage.
3. Note whether the same pipeline can **cross-check LogIE road/bridge constraints**.
4. Recommend: ship / partner / defer — with explicit non-goals.

## Non-goals (for now)

- Implementing a production Camps layer on `#280`.
- Replacing LogIE with CV inference for Access status.
- Scraping partner systems or publishing PII / precise household locations.
- Buying imagery without a product decision + cost owner.

## Research questions

1. What public datasets exist for Sudan IDP / informal sites today (IOM DTM, CCCM,
   UNHCR, REACH, HDX), and what is their typical **as-of lag**?
2. Which EO sources are realistic for CLEAR (Sentinel-2 free; commercial Planet /
   Maxar; UNOSAT products; Mapbox/Google satellite basemap alone is **not** enough)?
3. Can camp detection be **human-in-the-loop** (analyst marks sites from imagery)
   rather than fully automated CV for v1?
4. For road double-check: what visual proxies are reliable (checkpoint structures,
   berms, abandoned vehicles, washed-out spans) vs noise?
5. What refresh cadence is “good enough” (daily / weekly / event-triggered)?
6. Legal / Do No Harm: publishing precise camp coords can endanger people — what
   aggregation / fuzzing / access control does NRC expect?

## Candidate tracks (to evaluate)

| Track | Idea | Pros | Cons |
|-------|------|------|------|
| A. Curated partner feed | IOM DTM / CCCM / NRC field GIS as GeoJSON ingest | Trusted, attributed | Lag; may not include informal sites |
| B. UNOSAT / activation products | Consume published damage / site maps | Humanitarian pedigree | Irregular cadence; not always Sudan-wide |
| C. Free EO + analyst workflow | Sentinel-2 (or similar) tiles + internal review UI | Controllable freshness | Analyst cost; detection skill; cloud cover |
| D. Commercial EO API | Planet / Maxar tasking or archive | Higher resolution | Cost; contracts; still needs interpretation |
| E. CV camp detector | Train/fine-tune on known footprints | Scale | High false positives; ethics; hard in sparse scrub |
| F. Basemap-only | Rely on Mapbox satellite underlay | Zero new data | No structured camp layer; not queryable |

**Likely v0:** A and/or C (partner points + optional imagery-assisted verification),
not E.

## LogIE cross-check angle

- Input: Blockages features with `status_as_of` ≥ 15 days (already demoted on map).
- Process: pull recent EO over the segment bbox; human or CV notes “still looks
  constrained / looks open / inconclusive”.
- Output: optional `imagery_check` enrichment — **never** auto-flip LogIE status
  without a human or partner confirmation path.
- Success criteria: reduces false “still blocked” confidence for stale rows, not
  invents Access SoT.

## Working notes

_(Append findings here as research proceeds.)_

- 2026-07-27: Branch opened from `origin/dev` while #280 continues on
  `clear-280-access-layers-ia-options-for-noah`. No implementation yet.

## Next steps when we pick this up

1. Inventory current Sudan camp / site layers on HDX + IOM DTM (dates, licenses).
2. Ask NRC/field what “current camp” means operationally and what they can share.
3. Spike one Sentinel-2 (or equivalent) pull over a known Darfur site + one stale
   LogIE road segment; document latency and interpretability.
4. Write a go/no-go note + optional Expo ticket draft (separate from Blockages).

## Related

- Blockages freshness policy: `docs/clear-api-logie-ingest.md`
- Access SoT: `docs/adr/0003-logie-is-access-constraint-source.md`
- Product language: `CONTEXT.md` (IDP Density vs Blockages vs NRC locations)
