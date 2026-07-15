/**
 * Mapbox `queryRenderedFeatures` can return the same source feature more than
 * once when it sits on a tile boundary (documented Mapbox behaviour). Callers
 * that create one DOM Marker per result must dedupe first — otherwise
 * `Map.set(sameKey, newMarker)` orphans the previous Marker in the DOM, and
 * those orphans survive filter / showMarkers toggles.
 */
export function dedupeByProperty<
  T extends { properties?: Record<string, unknown> | null },
>(features: T[], propertyKey: string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const feat of features) {
    const raw = feat.properties?.[propertyKey];
    if (raw == null) continue;
    const key = String(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(feat);
  }
  return out;
}
