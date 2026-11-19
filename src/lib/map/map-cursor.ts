/**
 * Set the cursor on a Mapbox map's canvas, or do nothing if the map is gone.
 *
 * `map.remove()` drops the canvas, so `getCanvas()` returns undefined after
 * it. On unmount React runs effect cleanups in declaration order: the map
 * init effect removes the map first, and any later cleanup or leftover hover
 * handler that resets the cursor then throws "Cannot read properties of
 * undefined (reading 'style')". A throw in a cleanup reaches the route error
 * boundary, so leaving /detection showed "Something went wrong".
 */
export function setMapCursor(
  map: { getCanvas?: () => HTMLCanvasElement | undefined } | null | undefined,
  cursor: string,
): void {
  try {
    const canvas = map?.getCanvas?.();
    if (canvas) canvas.style.cursor = cursor;
  } catch {
    /* map already removed */
  }
}
