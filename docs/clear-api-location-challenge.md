# Clear-API Contract: Location challenge + optional correction (v1)

> **Status (clear-mvp #314 / PR #136):** **UI + API persistence ready.** Analysts can
> challenge a Signal pin and optionally propose a corrected point (place-on-map
> primary, manual lat/lng secondary). clear-api persists the queue via GraphQL;
> clear-mvp tRPC still soft-fails if the schema is unavailable (older environments).  
> Product rules: [CONTEXT.md](../CONTEXT.md) (Location trust) +
> [ADR-0003](adr/0003-location-trust-challenge-without-candidates.md).

## What ships vs what is still missing

| Layer | State |
|---|---|
| clear-mvp UI (Signal detail + map Marker detail) | **Done** — challenge modal, map place-pin, dual-pin / challenged affordance |
| clear-mvp tRPC (`locationChallenge.*`) | **Done** — calls GraphQL below; degrades when schema missing |
| clear-api persist + GraphQL | **Done** — `signalLocationChallenges` + `submitSignalLocationChallenge` |
| Location admin accept / decline | **Not built and not near-roadmap** — v1 is queue-only forever until a later product decision |

### Explicit non-goals (near term)

- **No admin / review UI** to confirm or decline a Location challenge or correction.
  Status stays `consideration`. There is **no** near-roadmap ticket to ship Location
  admin accept/reject with this wedge.
- **No write-back** of the proposed point onto Signal (or Event) source geometry.
- **No Event / Alert pin challenges** — target entity is **Signal** only.
- Improving precision over time (alias engine, gazetteer, Dataminr ingest fix) is
  **out of band** — persistence of the queue is the API prerequisite; learning from
  accepted corrections is later.

## Problem

Analysts need to mark a **Signal** pin as untrusted (“this looks wrong”) and optionally
propose a new **point** for **consideration**. Until clear-api implements this contract,
the product cannot remember challenges across sessions or share them across analysts.

## Design decisions (locked)

| Decision | Choice |
|---|---|
| Target entity | **Signal** only (not Event/Alert pins) |
| Challenge without correction | Allowed |
| Correction | Optional; **point (lat/lng) required** if submitted; name/note optional |
| FE correction UX | Place-on-map primary; manual coordinates secondary |
| Schema shape | **One table** for v1 (`signal_location_challenges`) with optional proposed point fields |
| Review | Queue only (`status = consideration`); **Location admin not near-roadmap** |
| Entry points (FE) | Signal detail + Signal marker detail panel |
| Not this wedge | Forced top‑3 candidates, Feedback “Wrong area”, overwrite of source geometry, admin accept/reject |

## 1. Database

**File:** `clear-api/prisma/schema.prisma` (+ migration)

```prisma
/// Analyst Location challenge on a Signal, with optional Location correction.
/// One open row per signal for v1 (unique on signalId where status = consideration).
model signalLocationChallenges {
  id        String   @id @default(cuid())
  signalId  String   @map("signal_id")
  signal    signals  @relation(fields: [signalId], references: [id], onDelete: Cascade)

  /// Who filed the challenge (auth user id).
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  /// v1: always "consideration". Do not invent accept/reject flows in this wedge.
  status String @default("consideration")

  /// Optional note explaining why the pin looks wrong.
  note String?

  /// Optional Location correction — all three null = bare challenge.
  /// If any proposed* point field is set, proposedLng + proposedLat are required together.
  proposedLng  Float?  @map("proposed_lng")
  proposedLat  Float?  @map("proposed_lat")
  proposedName String? @map("proposed_name")

  @@unique([signalId, status])
  @@index([signalId])
  @@index([status, createdAt])
  @@map("signal_location_challenges")
}
```

Add reverse relation on `signals`:

```prisma
signalLocationChallenges signalLocationChallenges[]
```

**SQL sketch:**

```sql
CREATE TABLE signal_location_challenges (
  id            TEXT PRIMARY KEY,
  signal_id     TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT NOT NULL DEFAULT 'consideration',
  note          TEXT,
  proposed_lng  DOUBLE PRECISION,
  proposed_lat  DOUBLE PRECISION,
  proposed_name TEXT,
  CONSTRAINT signal_location_challenges_point_pair CHECK (
    (proposed_lng IS NULL AND proposed_lat IS NULL)
    OR (proposed_lng IS NOT NULL AND proposed_lat IS NOT NULL)
  )
);

CREATE UNIQUE INDEX signal_location_challenges_signal_status_uidx
  ON signal_location_challenges (signal_id, status);

CREATE INDEX signal_location_challenges_signal_id_idx
  ON signal_location_challenges (signal_id);
```

## 2. GraphQL schema

```graphql
type SignalLocationChallenge {
  id: ID!
  signalId: String!
  status: String!          # "consideration" in v1
  note: String
  proposedLng: Float
  proposedLat: Float
  proposedName: String
  createdBy: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  """True when proposedLng/proposedLat are both set."""
  hasProposedPoint: Boolean!
}

input SubmitSignalLocationChallengeInput {
  signalId: String!
  note: String
  """Omit both to file a bare challenge. Provide both for a Location correction."""
  proposedLng: Float
  proposedLat: Float
  proposedName: String
}

extend type Signal {
  """Open Location challenge for this Signal, if any (null when none / not challenged)."""
  locationChallenge: SignalLocationChallenge
}

extend type Mutation {
  """
  Create or replace the open (consideration) Location challenge for a Signal.
  Auth: logged-in team member who can view the Signal.
  Does NOT mutate Signal geometry.
  Does NOT accept/reject — queue only.
  """
  submitSignalLocationChallenge(input: SubmitSignalLocationChallengeInput!): SignalLocationChallenge!
}

extend type Query {
  """Open challenges for map dual-pin rendering (team-scoped like signals)."""
  signalLocationChallenges(teamId: String, status: String): [SignalLocationChallenge!]!
}
```

### Validation rules (resolver)

1. `signalId` must exist and be visible to the caller’s team context.
2. Bare challenge: `proposedLng` and `proposedLat` both null/omitted.
3. Correction: both `proposedLng` and `proposedLat` required; validate finite ranges (`lat ∈ [-90,90]`, `lng ∈ [-180,180]`).
4. `proposedName` / `note` optional; trim; max length ~500 / ~2000.
5. Upsert on `(signalId, status='consideration')` — resubmit updates the open row (v1).
6. Never write into `signals.location_id` / origin / destination in this mutation.

## 3. Resolver behaviour (sketch)

- `Signal.locationChallenge` → load open consideration row for `parent.id`, else `null`.
- `submitSignalLocationChallenge` → upsert; return the row; set `hasProposedPoint`.
- `signalLocationChallenges` → list open rows (optionally filter `status`); used by clear-mvp map merge.

## 4. clear-mvp consumption (already wired)

| clear-mvp | GraphQL |
|---|---|
| `api.locationChallenge.submit` | `submitSignalLocationChallenge` |
| `api.locationChallenge.getBySignal` | `signal { locationChallenge { … } }` |
| `api.locationChallenge.listForMap` | `signalLocationChallenges(teamId)` |

Until these fields/mutations exist:

- Queries return `null` / `[]` (schema-unavailable soft fail).
- Submit surfaces `LOCATION_CHALLENGE_BACKEND_UNAVAILABLE`.
- Map may keep a **local visual** dual-pin / challenged state for the session only —
  **not** durable persistence.

## 5. Out of scope for clear-api v1 (and near roadmap)

- Accept / reject / withdraw mutations
- Location admin UI / permissions / review queue screens
- Challenging Event or Alert pins (document Event only if product revisits later)
- Gazetteer candidate search / alias engine
- Writing proposed point back onto Signal geometry
- Multiple concurrent open challenges per Signal
- Using queued corrections to automatically improve geocoding precision

## 6. Acceptance checklist (clear-api)

- [ ] Migration + Prisma model applied
- [ ] GraphQL types + mutation + query live in schema
- [ ] `Signal.locationChallenge` returns open row
- [ ] Bare challenge persists without point (survives reload)
- [ ] Correction requires both lng/lat; dual-pin fields readable from list query
- [ ] Source Signal geometry unchanged after submit
- [ ] Auth required; unauthorized callers rejected
- [ ] clear-mvp Location challenge modal succeeds end-to-end against staging **without** local-only fallback
- [ ] No accept/reject API or admin UI shipped in this slice
