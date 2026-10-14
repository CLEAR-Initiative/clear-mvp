# Role-access E2E matrix

A data-driven Playwright scaffold that exercises the clear-mvp **role-based
access control** matrix. Companion to `docs/qa/role-access-test-matrix.md` (human
doc) and the interactive checklist artifact.

## Files

| File | Purpose |
| --- | --- |
| `matrix.json` | Machine source of truth — generated from the markdown's JSON block. |
| `personas.ts` | Persona → credentials (seeded + env) and the status→assertion legend. |
| `auth.ts` | Per-persona sign-in (Better Auth API) → cached storageState → context; flag enabling. |
| `../../tests/20-role-access-matrix.spec.ts` | The data-driven spec (one test per `action × persona`). |

## Run

```bash
bun run e2e                       # brings up the hermetic stack, then runs ALL specs
# or just this spec against a running stack:
E2E_BASE_URL=http://localhost:3000 bunx playwright test e2e/tests/20-role-access-matrix.spec.ts
bunx playwright test e2e/tests/20-role-access-matrix.spec.ts --list   # enumerate without running
```

`beforeAll` enables the matrix feature flags (`hotline_inbox`, `impact_prior_review`,
`event_enrichment`, `hotline_translation`) via the admin API. `ground_intel` ships ON.

## Personas & credentials

**All personas are seeded in the hermetic stack** — no env wiring needed:

- `admin` / `analyst` / `viewer` — clear-api `prisma/seed.ts` (all `password123`).
- `erm`, `pending`, `team_admin`, `org_admin`, `field_coordinator`, `team_member` —
  `e2e/support/roles-seed.ts` (the `seed-roles` compose step). All `password123`
  except ERM, which reuses `emr.user`'s strong password from the main seed.

Constants live in `e2e/support/data.ts`; `roles-seed.ts` creates a team under the
seeded "CLEAR Platform" org, assigns `emr.user` the `emergency_response_manager`
role (completing the ERM — the main seed left this as a TODO), and mints the
remaining accounts.

To point the suite at a **non-hermetic** environment that seeds different accounts,
override any persona with `E2E_<PERSONA>_EMAIL` / `_PASSWORD`
(e.g. `E2E_ERM_EMAIL`, `E2E_TEAM_ADMIN_PASSWORD`).

> **ERM** = a global **viewer** who also holds the `emergency_response_manager`
> team role. That is exactly what `roles-seed.ts` provisions for `emr.user`.

## What runs vs what's scaffolded

- **Runs automatically** (green baseline): deny-side checks (a control that must be
  HIDDEN for a role) and the `/admin → /dashboard` redirect, plus load-time presence
  of nav links / tabs / inbox filter pills. These are robust without seeded records.
- **`test.fixme` (implement these)**: anything needing a seeded record (`[id]` routes),
  an action invocation (server `403`/`200` writes), read-only decision surfaces,
  own-scoped data, the team/org-role cases, shared flows and gotchas. Each fixme title
  carries the `id`, expected status, selector and `file:line` so it's fillable.

To implement a fixme: navigate to the real surface, resolve the control (confirm the
`data-testid` against the running build — the matrix selectors are explorer-reported
hints, not guaranteed), trigger it, and assert the `server` outcome from the title
(`200` succeeds, `403` surfaces an error without a state change, `200-own` is scoped).

## Fidelity caveat

clear-mvp mostly *hides dead UI*; the real gate is **clear-api**. A `403` row means the
clear-api call rejects — assert the graceful failure (toast/disabled), not a clear-mvp
check. Regenerate `matrix.json` from the markdown whenever the doc changes.
