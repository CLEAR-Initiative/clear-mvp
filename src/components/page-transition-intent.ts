export function firstSegment(path: string): string {
  return path.replace(/^\//, "").split("/")[0] ?? "";
}

/**
 * Pure intent for a nav click while a transition may be in flight.
 * - begin: paint veil for nextSeg
 * - abort: clear in-flight veil (user re-clicked settled segment)
 * - noop: empty href, or same segment with nothing pending
 */
export function resolvePageTransitionIntent(
  nextSeg: string,
  currentSeg: string,
  hasPending: boolean,
): "begin" | "abort" | "noop" {
  if (!nextSeg) return "noop";
  if (nextSeg === currentSeg) return hasPending ? "abort" : "noop";
  return "begin";
}

/** True when the browser will open a new tab / modified navigation — skip veil. */
export function isModifiedNavClick(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}
