/**
 * Globe projection utilities — enable Mapbox `globe` for far zoom.
 * Mapbox morphs globe↔mercator with zoom automatically.
 *
 * Prior behavior: polar-axis idle spin (removed 17 Aug 2026, #477).
 */

export type IdleGlobeSpinMap = {
  getProjection?: () => { name?: string } | string | null;
  setProjection?: (projection: string | { name: string }) => unknown;
};

function projectionName(map: IdleGlobeSpinMap): string {
  try {
    const p = map.getProjection?.();
    if (!p) return "mercator";
    if (typeof p === "string") return p;
    return p.name ?? "mercator";
  } catch {
    return "mercator";
  }
}

/** Enable globe projection once. Mapbox morphs globe↔mercator with zoom. */
export function ensureGlobeProjection(map: IdleGlobeSpinMap): void {
  try {
    if (projectionName(map) === "globe") return;
    map.setProjection?.("globe");
  } catch {
    /* ignore — older builds / unsupported */
  }
}
