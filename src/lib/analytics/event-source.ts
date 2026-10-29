/**
 * How people reach an Event: the fixed `?from=` values every in-app link to
 * an Event carries, and their normalisation for `event.opened {from}`.
 * Anything missing or unknown counts as `direct`.
 *
 * clear-api appends `from=email|webhook|inbox` (and `sms`) to the links it
 * sends out (clear-api PR #271).
 */

export const EVENT_FROM_VALUES = [
  "map",
  "detection",
  "analysis",
  "crisis",
  "signal",
  "related_event",
  "agent",
  "inbox",
  "email",
  "sms",
  "webhook",
] as const;

export type EventFrom = (typeof EVENT_FROM_VALUES)[number];
export type EventOpenedFrom = EventFrom | "direct";

/** The `from` an Event open is recorded with: a known value, else `direct`. */
export function normaliseEventFrom(raw: string | null | undefined): EventOpenedFrom {
  return (EVENT_FROM_VALUES as readonly string[]).includes(raw ?? "") ? (raw as EventFrom) : "direct";
}

/** An in-app link to an Event, tagged with where it was followed from. */
export function eventHref(eventId: string, from: EventFrom): string {
  return `/event/${eventId}?from=${from}`;
}

/**
 * Tag an app path with `from` when it opens an Event page and carries no
 * `from` yet (Agent links, inbox notifications). Other paths are unchanged.
 */
export function tagEventPath(path: string, from: EventFrom): string {
  const [pathname = "", search = ""] = path.split("?", 2);
  if (!/^\/event\/[^/]+$/.test(pathname)) return path;
  const params = new URLSearchParams(search);
  if (params.has("from")) return path;
  params.set("from", from);
  return `${pathname}?${params.toString()}`;
}
