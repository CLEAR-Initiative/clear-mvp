/**
 * Where the summary should sit after it shrinks.
 * A top already on screen stays put. A top the reader has scrolled past
 * comes back to the top of the viewport, so the page does not land below the map.
 */
export function summaryCollapseAnchor(sectionTopBefore: number): number {
  return Math.max(0, sectionTopBefore);
}

/** Pixels to add to the scroller so the section top lands on `anchor`. */
export function summaryScrollDelta(sectionTopAfter: number, anchor: number): number {
  return sectionTopAfter - anchor;
}
