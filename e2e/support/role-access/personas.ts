/**
 * Persona credentials + status→assertion legend for the role-access matrix spec
 * (e2e/tests/20-role-access-matrix.spec.ts), driven by
 * e2e/support/role-access/matrix.json.
 *
 * All personas are seeded: admin/analyst/member by clear-api's prisma/seed.ts
 * (analyst is a global `member` there; roles-seed.ts gives it the team `analyst`
 * membership), and ERM/pending/team-role accounts by e2e/support/roles-seed.ts
 * (see e2e/support/data.ts for the constants). Override any persona's
 * credentials via env (`E2E_<PERSONA>_EMAIL` / `_PASSWORD`) when pointing the
 * suite at a non-hermetic environment that seeds different accounts.
 */
import {
  ADMIN, ANALYST, MEMBER,
  ERM, PENDING, TEAM_ADMIN, ORG_ADMIN, TEAM_MEMBER,
} from "../data";

export type Persona =
  | "admin" | "analyst" | "member" | "erm" | "pending"
  | "team_admin" | "org_admin" | "team_member";

export type Creds = { email: string; password: string };

/** Env override (for non-hermetic targets); falls back to the seeded default. */
const override = (k: string, seeded: Creds): Creds => {
  const email = process.env[`${k}_EMAIL`];
  const password = process.env[`${k}_PASSWORD`];
  return email && password ? { email, password } : seeded;
};

/** Credentials per persona — all seeded in the hermetic stack. */
export const CREDS: Record<Persona, Creds | undefined> = {
  admin: override("E2E_ADMIN", ADMIN),
  analyst: override("E2E_ANALYST", ANALYST),
  member: override("E2E_MEMBER", MEMBER),
  erm: override("E2E_ERM", ERM),
  pending: override("E2E_PENDING", PENDING),
  team_admin: override("E2E_TEAM_ADMIN", TEAM_ADMIN),
  org_admin: override("E2E_ORG_ADMIN", ORG_ADMIN),
  team_member: override("E2E_TEAM_MEMBER", TEAM_MEMBER),
};

/**
 * Flags the matrix assumes ON. Enabled once, as admin,
 * through the app's own toggle — the hermetic stack starts at flag defaults.
 */
export const MATRIX_FLAGS = [
  "hotline_inbox",
  "impact_prior_review",
  "event_enrichment",
  "hotline_translation",
] as const;

/**
 * How a matrix status maps to a test. `ui` drives the DOM assertion the
 * skeleton performs automatically; `server` is the outcome a full action test
 * must confirm (left as a TODO in the generated test body).
 *
 *   auto:true  → the spec asserts the DOM state from `kind`
 *   auto:false → needs an action invocation / seeded record → emitted as
 *                test.fixme with the expected outcome in the title
 */
export const STATUS: Record<
  string,
  { kind: "enabled" | "hidden" | "disabled" | "readonly" | "action"; server: string; auto: boolean }
> = {
  allow:       { kind: "enabled",  server: "200",       auto: true  },
  hidden:      { kind: "hidden",   server: "n/a",       auto: true  },
  disabled:    { kind: "disabled", server: "n/a",       auto: true  },
  readonly:    { kind: "readonly", server: "n/a",       auto: true  },
  block:       { kind: "action",   server: "403",       auto: false },
  own:         { kind: "action",   server: "200-own",   auto: false },
  token:       { kind: "action",   server: "public",    auto: false },
  conditional: { kind: "action",   server: "200|403",   auto: false },
};
