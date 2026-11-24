import type { LngLatPoint } from "../selection";

export type ViewArea = {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
};

/** Where the indicator sits (container pixels) and where its arrow points (degrees, 0 = up, clockwise). */
export type IndicatorPlacement = { x: number; y: number; angle: number };

/** Half the indicator's size plus a gap, so it never touches the edge of the visible area. */
export const INDICATOR_MARGIN_PX = 40;

function visibleRect({ width, height, padding }: ViewArea) {
  return { left: padding.left, right: width - padding.right, top: padding.top, bottom: height - padding.bottom };
}

function angleOf(dx: number, dy: number): number {
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

/** Places the indicator on the edge of the visible area, on the line from its centre towards `direction`. */
function onEdge(view: ViewArea, direction: { dx: number; dy: number }): IndicatorPlacement | null {
  const rect = visibleRect(view);
  const cx = (rect.left + rect.right) / 2;
  const cy = (rect.top + rect.bottom) / 2;
  const halfW = Math.max((rect.right - rect.left) / 2 - INDICATOR_MARGIN_PX, 0);
  const halfH = Math.max((rect.bottom - rect.top) / 2 - INDICATOR_MARGIN_PX, 0);
  const { dx, dy } = direction;
  if (dx === 0 && dy === 0) return null;
  const scale = Math.min(dx === 0 ? Infinity : halfW / Math.abs(dx), dy === 0 ? Infinity : halfH / Math.abs(dy));
  return { x: cx + dx * scale, y: cy + dy * scale, angle: angleOf(dx, dy) };
}

/** The indicator for a target projected at `point` on screen, or null when the target is in view. */
export function placementForPoint(view: ViewArea, point: { x: number; y: number }): IndicatorPlacement | null {
  const rect = visibleRect(view);
  const inside = point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
  if (inside) return null;
  return onEdge(view, { dx: point.x - (rect.left + rect.right) / 2, dy: point.y - (rect.top + rect.bottom) / 2 });
}

/** The indicator for a target that cannot be projected (the far side of the globe), by its compass bearing. */
export function placementForBearing(view: ViewArea, bearingDeg: number): IndicatorPlacement | null {
  const radians = (bearingDeg * Math.PI) / 180;
  return onEdge(view, { dx: Math.sin(radians), dy: -Math.cos(radians) });
}

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Angle between two points on the sphere, in degrees. */
export function angularDistance([lng1, lat1]: LngLatPoint, [lng2, lat2]: LngLatPoint): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dLambda = toRadians(lng2 - lng1);
  const cos = Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/** Initial compass bearing from `from` to `to`, in degrees clockwise from north. */
export function initialBearing([lng1, lat1]: LngLatPoint, [lng2, lat2]: LngLatPoint): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dLambda = toRadians(lng2 - lng1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (Math.atan2(y, x) * 180) / Math.PI;
}
