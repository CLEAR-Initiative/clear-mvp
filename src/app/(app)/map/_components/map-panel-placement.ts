import type { MarkerScreenPoint } from "~/components/map/crisis-map";

/** Half of typical map pin (~14–18px); gap is measured from pin edge, not center. */
export const MARKER_RADIUS = 10;
/** Clear air between pin edge and panel — same for every marker. */
export const CLEARANCE = 24;
export const PANEL_GAP = MARKER_RADIUS + CLEARANCE;
export const PANEL_MARGIN = 8;

interface Size {
  width: number;
  height: number;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), Math.max(min, max));
}

function clampToParent(
  left: number,
  top: number,
  panel: Size,
  parent: Size,
): { left: number; top: number } {
  return {
    left: clamp(left, PANEL_MARGIN, parent.width - panel.width - PANEL_MARGIN),
    top: clamp(top, PANEL_MARGIN, parent.height - panel.height - PANEL_MARGIN),
  };
}

/** True if the panel rect intersects the pin's exclusion circle (as a box). */
export function panelCoversPin(
  panel: Rect,
  anchor: MarkerScreenPoint,
  exclusion = PANEL_GAP,
): boolean {
  const pinL = anchor.x - exclusion;
  const pinR = anchor.x + exclusion;
  const pinT = anchor.y - exclusion;
  const pinB = anchor.y + exclusion;
  return !(
    panel.left + panel.width <= pinL ||
    panel.left >= pinR ||
    panel.top + panel.height <= pinT ||
    panel.top >= pinB
  );
}

/**
 * Place the panel beside the marker without covering it on first open.
 * Prefers the roomier horizontal side, then vertical fallbacks. Viewport clamp
 * never wins over pin clearance — overlapping candidates are skipped.
 */
export function placeNearMarker(
  anchor: MarkerScreenPoint,
  parent: Size,
  panel: Size,
): { left: number; top: number } {
  const preferRight = anchor.x < parent.width / 2;
  // Vertically center the card on the pin so the connector hits mid-edge.
  const topCentered = anchor.y - panel.height / 2;

  const rawCandidates: Array<{ left: number; top: number }> = preferRight
    ? [
        { left: anchor.x + PANEL_GAP, top: topCentered },
        { left: anchor.x - panel.width - PANEL_GAP, top: topCentered },
        { left: anchor.x - panel.width / 2, top: anchor.y + PANEL_GAP },
        { left: anchor.x - panel.width / 2, top: anchor.y - panel.height - PANEL_GAP },
      ]
    : [
        { left: anchor.x - panel.width - PANEL_GAP, top: topCentered },
        { left: anchor.x + PANEL_GAP, top: topCentered },
        { left: anchor.x - panel.width / 2, top: anchor.y + PANEL_GAP },
        { left: anchor.x - panel.width / 2, top: anchor.y - panel.height - PANEL_GAP },
      ];

  for (const raw of rawCandidates) {
    const pos = clampToParent(raw.left, raw.top, panel, parent);
    if (
      !panelCoversPin(
        { left: pos.left, top: pos.top, width: panel.width, height: panel.height },
        anchor,
      )
    ) {
      return pos;
    }
  }

  // Last resort: force to the side with more horizontal room, unclamped on the
  // pin axis so clearance is preserved even if the panel clips the viewport.
  const spaceRight = parent.width - anchor.x;
  const spaceLeft = anchor.x;
  if (spaceRight >= spaceLeft) {
    return {
      left: anchor.x + PANEL_GAP,
      top: clamp(topCentered, PANEL_MARGIN, parent.height - panel.height - PANEL_MARGIN),
    };
  }
  return {
    left: anchor.x - panel.width - PANEL_GAP,
    top: clamp(topCentered, PANEL_MARGIN, parent.height - panel.height - PANEL_MARGIN),
  };
}
