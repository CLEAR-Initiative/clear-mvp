/**
 * The usage-analytics event allowlist — the only events `track()` sends.
 *
 * Every event carries ids and fixed values only: never names, emails, search
 * text, Agent prompts, titles or any other free text. Each property is either
 * a fixed list of allowed values or `ID` (a cuid-shaped identifier).
 *
 * To add an event: add an entry here, use it via `track()`, and add a case to
 * events.test.ts. Anything not listed here is rejected at runtime (and, for
 * literal calls, at compile time).
 */

/** Marker for a property that holds a record id (cuid), never free text. */
export const ID = "id" as const;

type PropertySpec = readonly string[] | typeof ID;

export const ANALYTICS_EVENTS = {
  /** The usage-analytics privacy notice was opened. */
  "privacy_notice.viewed": { from: ["profile", "onboarding"] },

  // Pre-declared for the follow-up slices (#1212, #1214). Extend the value
  // lists there as the call sites land.
  "event.opened": { from: ["map", "detection", "crisis", "dashboard", "notification", "agent", "link"] },
  "event.section_seen": { section: ["summary", "signals", "map", "impact", "comments", "timeline"] },
  "tour.started": { trigger: ["auto", "replay"] },
  "tour.completed": {},
  "tour.skipped": {},
  "agent.opened": { from: ["drawer", "page"] },
  "agent.message_sent": {},
  "analysis.opened": { analysis: ID },
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
    return allowed === ID ? CUID.test(value) : allowed.includes(value);
  });
}
