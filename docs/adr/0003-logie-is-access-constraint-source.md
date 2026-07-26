---
status: accepted
---

# LogIE is the Access-constraint source of truth

## Context

CLEAR’s `/map` **Operational → Access** layers need movement-constraint data.
Candidates include Dataminr/ACLED-style event points, mock Sudan GeoJSON, OSM-only
tags, and WFP Logistics Cluster **LogIE** (partner-reported status on OSM-derived
geometry). Shipping nested Access IA or painting mock geometries before validating
a real feed would lock the product into the wrong model.

## Decision

**LogIE** is CLEAR’s source of truth for Access-constraint **status** in the next
wedge. Geometry joins OSM via `osmid` where present; status is partner-reported and
IMO-validated through LogIE’s public Feature Services.

Sequence:

1. **LogIE spike** (Expo #280, retargeted) — validate Sudan pull, domains, map-ready
   slim shape
2. **LogIE ingest** (dedicated clear-api ticket) — persist and serve GeoJSON
3. **Blockages wire-up** (Expo #277) — paint **roads + bridges** from ingested slim
   data on `/map`

clear-mvp remains a BFF: it does not own ArcGIS pulls at runtime. Dev-only smoke
(`GET /api/dev/logie-blockages`) may read spike dumps locally; production uses
clear-api.

Per-feature partner `source_name` / reliability are optional enrichment. Platform
attribution is always **LogIE (WFP Logistics Cluster)** — missing reporter fields
do not block v1.

## Considered options

- **Mock / sample Sudan Access GeoJSON as production.** Rejected: invents hazards
  and confuses HITL with live data.
- **Dataminr/ACLED points as Blockages.** Rejected until confirmed, geometried, and
  distinguished from Detection markers.
- **OSM Overpass surface as required for v1.** Rejected: LogIE `fclass` is thin on
  SDN; status paint does not need surface; Overpass is a follow-up.
- **Fold ingest into #277.** Rejected: buries API persistence under a map ticket;
  ingest is a separate blocker before #277.

## Consequences

- Access subtype IA comps without data can wait; Blockages v1 scope is roads +
  bridges from LogIE blocked statuses.
- clear-api must grow a LogIE ingest path before production Blockages.
- Future Access subtypes (crossings, aerodromes, etc.) reuse the same SoT and
  ingest, with separate FE toggles.
