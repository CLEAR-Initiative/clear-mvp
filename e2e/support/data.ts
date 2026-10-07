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

/**
 * Proposed ImpactPrior fixture — mirrors e2e/support/impact-prior-seed.ts:
 * one proposed prior on each of these two seeded events, requested by the
 * analyst through clear-api's Worker protocol, so the analyst also holds a
 * Task notification ("Impact prior proposed — review it") for each. If the
 * seed script changes, update these in lockstep.
 */
export const IMPACT_PRIORS = {
  /** Decided from the Inbox (rejected) in the review spec. */
  inboxEvent: SEEDED_EVENTS.foodSecurity,
  /** Decided from the Event page (accepted) in the review spec. */
  eventPageEvent: SEEDED_EVENTS.khartoumFlood,
  /** The web-sourced case's source, a non-resolving test URL. */
  sourceUrl: "https://example.test/e2e-prior-case",
  /** The common tail of clear-api's in-app message for a produced prior
   * (task-notifications.ts): "Impact prior from CLEAR data proposed — review it",
   * "Impact prior from the web proposed — review it". */
  notification: "proposed — review it",
  /** The source kinds the seed completes, one proposal each per Event, and
   * their English labels (messages/en.json `eventDetail.enrichment.sourceKind`). */
  sources: {
    clear: { kind: "event.impact_prior.clear", label: "CLEAR data" },
    web: { kind: "event.impact_prior.web", label: "Web" },
  },
} as const;
