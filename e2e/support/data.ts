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
 * Enrichment fixture — mirrors e2e/support/impact-prior-seed.ts. On each of
 * these two seeded events the analyst requested enrichment through clear-api's
 * Worker protocol, so each holds a proposed ImpactPrior from CLEAR data and two
 * proposed web cases (clear-api V4 CaseProposals, decided one by one), and the
 * analyst holds one Task notification per source for each. If the seed script
 * changes, update these in lockstep.
 */
export const IMPACT_PRIORS = {
  /** Decided from the Inbox in the review spec (one case rejected, one accepted). */
  inboxEvent: SEEDED_EVENTS.foodSecurity,
  /** Decided from the Event page (one case accepted) in the review spec. */
  eventPageEvent: SEEDED_EVENTS.khartoumFlood,
  /** The common tail of clear-api's in-app messages for a produced proposal
   * (task-notifications.ts): "Impact prior from CLEAR data proposed — review it",
   * "Impact prior from the web: cases proposed — review them". */
  notification: "proposed — review",
  /** The source kinds the seed completes per Event, and their English labels
   * (messages/en.json `eventDetail.enrichment.sourceKind`). */
  sources: {
    clear: { kind: "event.impact_prior.clear", label: "CLEAR data" },
    web: { kind: "event.impact_prior.web", label: "Web" },
  },
  /** The two web cases per Event: non-resolving test URLs, by Event title.
   * The first carries a figure (People affected), the second none. */
  webCases: {
    [SEEDED_EVENTS.foodSecurity]: [
      "https://example.test/e2e-case/north-darfur-food-1",
      "https://example.test/e2e-case/north-darfur-food-2",
    ],
    [SEEDED_EVENTS.khartoumFlood]: [
      "https://example.test/e2e-case/khartoum-flood-1",
      "https://example.test/e2e-case/khartoum-flood-2",
    ],
  } as Record<string, readonly [string, string]>,
} as const;
