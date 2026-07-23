/**
 * Constants that mirror clear-api's `prisma/seed.ts`. If the seed changes,
 * update these in lockstep.
 */

export const ANALYST = {
  email: "analyst@clear.dev",
  password: "password123",
} as const;

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** Seeded events (4 total). */
export const SEEDED_EVENTS = {
  /** The ONLY alert-free seeded event — target for the promote-to-alert flow. */
  displacement: "South Darfur Displacement Crisis",
  /** Already has a published alert — safe target for the create-crisis flow. */
  khartoumFlood: "Khartoum Flood Emergency",
  darfurConflict: "North Darfur Conflict Escalation",
  foodSecurity: "North Darfur Food Security Emergency",
} as const;
