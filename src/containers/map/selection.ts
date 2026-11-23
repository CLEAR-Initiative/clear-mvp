export type LngLatPoint = [number, number];

/** What a click on the map picked. The map reports it; whoever embeds the map decides what it means. */
export type MapSelectTarget =
  | { type: "signal"; id: string }
  | { type: "signal-stack"; coordinates: LngLatPoint; signalIds: string[] };

/** What the embedding page tells the map is selected, so the map can highlight it. */
export type MapSelection = { type: "signal"; id: string } | { type: "signal-stack"; coordinates: LngLatPoint };

/**
 * Stacked signals sit within a couple of metres of each other: Supercluster cannot split them at the
 * deepest zoom. A stack is addressed by its point, rounded to 5 decimals (~1 m) when it goes into a URL,
 * so membership is a tolerance (~5 m), not an exact match.
 */
const STACK_TOLERANCE_DEG = 0.00005;

export function isSamePoint(a: LngLatPoint, b: LngLatPoint): boolean {
  return Math.abs(a[0] - b[0]) <= STACK_TOLERANCE_DEG && Math.abs(a[1] - b[1]) <= STACK_TOLERANCE_DEG;
}
