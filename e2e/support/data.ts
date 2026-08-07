/**
 * Constants that mirror clear-api's `prisma/seed.ts`. If the seed changes,
 * update these in lockstep.
 */

export const ANALYST = {
  email: "analyst@clear.dev",
  password: "password123",
} as const;

/** Seeded viewer — must NOT see the private ground-intel staging tier. */
export const VIEWER = {
  email: "viewer@clear.dev",
  password: "password123",
} as const;

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
