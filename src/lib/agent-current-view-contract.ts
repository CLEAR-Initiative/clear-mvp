/**
 * The Current view's wire contract, shared by the pages that publish it
 * (agent-current-view.ts) and the route that checks it before it reaches the
 * model (server/agent/current-view.ts). One list of keys and one set of
 * patterns, so a key added on one side can't be silently refused by the other.
 */

export const CURRENT_VIEW_ENTITY_KINDS = ["event", "signal", "crisis"] as const;
export type CurrentViewEntityKind = (typeof CURRENT_VIEW_ENTITY_KINDS)[number];

/** The filter keys the Map and Detection publish. */
export const CURRENT_VIEW_FILTER_KEYS = [
  "teamId",
  "locationId",
  "country",
  "region",
  "from",
  "to",
  "severityMin",
  "severityMax",
  "eventTypes",
  "sourceNames",
  "orderBy",
] as const;
export type CurrentViewFilterKey = (typeof CURRENT_VIEW_FILTER_KEYS)[number];

/** Filter values are what the Map and Detection nav contexts store. */
export type CurrentViewFilterValue = string | number | boolean | null | string[];
export type CurrentViewFilters = Partial<Record<CurrentViewFilterKey, CurrentViewFilterValue>>;

/** List filters are capped: the Agent needs the scope, not a dump. */
export const CURRENT_VIEW_MAX_LIST = 50;

/** An entity, team or location id (cuid-shaped). Also what Agent navigation accepts. */
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
/** An app path: no query, no fragment, no other origin. */
export const PATH_PATTERN = /^\/[A-Za-z0-9_\-/]{0,199}$/;
/**
 * A filter value: place names (Côte d'Ivoire, Arabic with diacritics), ISO
 * dates, GLIDE codes, enum values and source names. Letters, marks, digits
 * and light punctuation only — nothing that reads as markup.
 */
export const VALUE_PATTERN = /^[\p{L}\p{M}\p{N} .,'’()\-–—_:/+&]{0,100}$/u;
