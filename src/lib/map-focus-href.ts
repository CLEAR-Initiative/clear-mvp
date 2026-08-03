/**
 * Deep-links that land `/map` on a specific marker (solo-focus fly).
 * Bare `/map` (sidebar Map tab, or Back from detail with `from=map`) stays
 * the country overview / session restore — see `mapReturnHref()`.
 */
export type MapFocusKind = "event" | "signal" | "crisis";

export function mapFocusHref(kind: MapFocusKind, id: string): string {
  return `/map?${kind}=${encodeURIComponent(id)}`;
}

/**
 * Marker zoom when returning from a detail page via Back / Full Map.
 * Country overview is ~5–6; 14 is street/neighborhood — pin-dominant framing.
 */
export const MAP_FOCUS_ZOOM = 14;
