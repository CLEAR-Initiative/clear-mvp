/**
 * Deep-links that land `/map` on a specific marker.
 * Bare `/map` (sidebar Map tab) stays the default country overview.
 */
export type MapFocusKind = "event" | "signal" | "crisis";

export function mapFocusHref(kind: MapFocusKind, id: string): string {
  return `/map?${kind}=${encodeURIComponent(id)}`;
}

/** Marker zoom when returning from a detail page — tight enough to read the pin. */
export const MAP_FOCUS_ZOOM = 10;
