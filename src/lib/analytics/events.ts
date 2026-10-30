/**
 * The usage-analytics event allowlist — the only events `track()` sends.
 *
 * Every event carries ids and fixed values only: never names, emails, search
 * text, Agent prompts, titles or any other free text. Each property is either
 * a fixed list of allowed values, `ID` (a cuid-shaped identifier) or `ROUTE`
 * (a route pattern with ids collapsed, see ./route-pattern.ts).
 *
 * To add an event: add an entry here, use it via `track()`, and add a case to
 * events.test.ts. Anything not listed here is rejected at runtime (and, for
 * literal calls, at compile time).
 */

import { PRODUCT_TOUR_STEP_IDS } from "~/lib/onboarding/product-tour-step-ids";
import { EVENT_FROM_VALUES } from "./event-source";
import { ROUTE, isRoutePattern } from "./route-pattern";

export { ROUTE };

/** Marker for a property that holds a record id (cuid), never free text. */
export const ID = "id" as const;

type PropertySpec = readonly string[] | typeof ID | typeof ROUTE;

export const ANALYTICS_EVENTS = {
  /** The usage-analytics privacy notice was opened. */
  "privacy_notice.viewed": { from: ["profile", "onboarding"] },

  /** An Event was opened (page or Detection drawer); `direct` when no known `from`. */
  "event.opened": { from: [...EVENT_FROM_VALUES, "direct"] },
  /** An Event section first scrolled into view (once per section per view). */
  "event.section_seen": { section: ["enrichment", "feedback"] },

  /** The product tour started: on its own after onboarding, or replayed from the profile. */
  "tour.started": { trigger: ["auto", "replay"], first_on_device: ["true", "false"] },
  /** A tour step came on screen. */
  "tour.step_viewed": { step: PRODUCT_TOUR_STEP_IDS },
  /** The tour's last step was finished. */
  "tour.finished": {},
  /** The tour was left before the end (Skip/Exit, or an in-app link) at this step. */
  "tour.skipped": { step: PRODUCT_TOUR_STEP_IDS },

  /** The CLEAR Agent was opened. `from_route` is a route pattern (ids collapsed), never a URL. */
  "agent.opened": { surface: ["drawer", "page"], from_route: ROUTE },
  /** A Source document cited by the Agent was opened. */
  "agent.source_opened": {},
  /** Back undid an Agent navigation. */
  "agent.navigation_back": {},

  /** The analysis summary was copied to the clipboard. */
  "analysis.summary_copied": {},
  /** An evidence document was opened in the preview. */
  "analysis.evidence_previewed": {},
  /** An evidence document was downloaded from the preview. */
  "analysis.evidence_downloaded": {},
} as const satisfies Record<string, Record<string, PropertySpec>>;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS;

type PropValue<S> = S extends readonly (infer V)[] ? V : string;

export type AnalyticsEventProps<E extends AnalyticsEventName> = {
  -readonly [K in keyof (typeof ANALYTICS_EVENTS)[E]]: PropValue<(typeof ANALYTICS_EVENTS)[E][K]>;
};

const CUID = /^[a-z0-9]{20,32}$/;

/**
 * Whether `name` + `props` are exactly what the allowlist permits: a known
 * event, every declared property present, no extra property, and every value
 * allowed. Runtime twin of the `track()` types (call sites can be dynamic).
 */
export function isAllowedEvent(name: string, props: Record<string, unknown> = {}): boolean {
  if (!Object.prototype.hasOwnProperty.call(ANALYTICS_EVENTS, name)) return false;
  const spec = ANALYTICS_EVENTS[name as AnalyticsEventName] as Record<string, PropertySpec>;
  const keys = Object.keys(props);
  if (keys.length !== Object.keys(spec).length) return false;
  return keys.every((key) => {
    const allowed = spec[key];
    const value = props[key];
    if (allowed === undefined || typeof value !== "string") return false;
    if (allowed === ID) return CUID.test(value);
    if (allowed === ROUTE) return isRoutePattern(value);
    return allowed.includes(value);
  });
}
