# Location trust: challenge without forced candidates

Location verification wastes analyst time when pins (especially Dataminr) are wrong and
place names have local spellings. We considered auto-suggesting top‑3 gazetteer matches
and forcing a pick. We decided **not** to: v1 lets analysts **Location challenge** a
**Signal** and optionally submit a **Location correction** (proposed point) for queued
**consideration**, with **dual location display** only when a proposed point exists.

## Scope boundaries (locked)

- **clear-mvp UI** may ship first (challenge + optional correction UX).
- **Persistence requires clear-api** — see
  [clear-api-location-challenge.md](../clear-api-location-challenge.md). Without it,
  challenges do not survive reload and are not shared across analysts.
- **No Location admin accept/decline** in v1 and **not on the near roadmap**. Queue-only
  (`consideration`) is the durable product stance until a later decision.
- Improving location precision over time (alias engine, ingest fixes, write-back of
  accepted points) is **later** — not implied by shipping the FE challenge UX.

See `CONTEXT.md` (Location trust).
