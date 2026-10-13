/**
 * Constants that mirror clear-api's `prisma/seed.ts`. If the seed changes,
 * update these in lockstep.
 */

export const ANALYST = {
  email: "analyst@clearinitiative.io",
  password: "password123",
} as const;

/** Seeded platform admin (clear-api ADMIN_EMAIL / ADMIN_PASSWORD in the e2e stack). */
export const ADMIN = {
  email: "admin@clearinitiative.io",
  password: "password123",
} as const;

/** Seeded viewer — must NOT see the private ground-intel staging tier. */
export const VIEWER = {
  email: "viewer@clearinitiative.io",
  password: "password123",
} as const;

/**
 * Role personas for the role-access matrix spec (case 20), seeded by
 * e2e/support/roles-seed.ts. Keep in lockstep with that script.
 *
 * ERM = emr.user from clear-api's seed (global viewer) once roles-seed assigns
 * it the `emergency_response_manager` team membership; it keeps its own strong
 * password from the main seed. The rest share `password123`.
 */
export const ERM = {
  email: "emr.user@clearinitiative.io",
  password: "Emr#09bc64391b2c5cd30802a3f7372907a2",
} as const;
export const PENDING = { email: "e2e-pending@clearinitiative.io", password: "password123" } as const;
export const TEAM_ADMIN = { email: "e2e-team-admin@clearinitiative.io", password: "password123" } as const;
export const ORG_ADMIN = { email: "e2e-org-admin@clearinitiative.io", password: "password123" } as const;
export const FIELD_COORDINATOR = { email: "e2e-field-coordinator@clearinitiative.io", password: "password123" } as const;
export const TEAM_MEMBER = { email: "e2e-team-member@clearinitiative.io", password: "password123" } as const;

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Synthetic ground-intel fixture — mirrors e2e/support/ground-seed.ts.
 * If the seed script changes, update these in lockstep.
 */
export const GROUND = {
  /** Thread with the reported → updated → corrected chain (4 messages). */
  correctedThreadTitle: "Strike reported near Riverbend market (synthetic)",
  correctedFirstMessage:
    "Unconfirmed reports of a strike near Riverbend market this morning.",
  correctedLastMessage:
    "Correction: the strike hit the old depot north of Riverbend, not the market itself.",
  /** Thread retracted as misreporting (2 messages) — review-flow target. */
  retractedThreadTitle: "Convoy movement rumour (synthetic)",
  retractedFirstMessage: "Rumour of a convoy moving towards Northgate bridge tonight.",
  chatterMessage: "Thanks everyone, noted.",
  newsDigestMessage: "Daily digest: three items on the regional situation (synthetic).",
} as const;

/** Seeded events (4 total). */
export const SEEDED_EVENTS = {
  /** The ONLY alert-free seeded event — target for the promote-to-alert flow. */
  displacement: "South Darfur Displacement Crisis",
  /** Already has a published alert — safe target for the create-crisis flow. */
  khartoumFlood: "Khartoum Flood Emergency",
  darfurConflict: "North Darfur Conflict Escalation",
  foodSecurity: "North Darfur Food Security Emergency",
} as const;
