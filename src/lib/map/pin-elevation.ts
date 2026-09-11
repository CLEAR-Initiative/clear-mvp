/**
 * Pitch-linked marker elevation for unclustered pins on every basemap.
 *
 * Event, Signal, and Crisis pins share this layout. Flat while the camera is
 * mostly top-down (pitch ≤ 45°). Stem grows smoothly from 45° → 70° so tilt
 * readability ramps with the gesture — no marker remount.
 */

/** Below this pitch, pins stay flat (stem factor 0). */
export const PIN_ELEVATE_START_PITCH = 45;
/** At/above this pitch, stem is fully extended (factor 1). */
export const PIN_ELEVATE_FULL_PITCH = 70;

/** Smoothstep ease for the 45→70 ramp. */
function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * 0 = flat disc on ground; 1 = full stem. Continuous between START and FULL.
 */
export function pinElevationFactor(pitch: number): number {
  const p = Number.isFinite(pitch) ? pitch : 0;
  if (p <= PIN_ELEVATE_START_PITCH) return 0;
  if (p >= PIN_ELEVATE_FULL_PITCH) return 1;
  return smoothstep(
    (p - PIN_ELEVATE_START_PITCH) /
      (PIN_ELEVATE_FULL_PITCH - PIN_ELEVATE_START_PITCH),
  );
}

export type LocationPinRole = "source" | "proposed";

/** Narrow GeoJSON `location_pin_role` to the known union. Unknown/empty → undefined. */
export function parseLocationPinRole(
  raw: unknown,
): LocationPinRole | undefined {
  return raw === "source" || raw === "proposed" ? raw : undefined;
}

/**
 * Unclustered Event, Signal, and Crisis pins grow stems when tilted.
 * Allowlist: unset/empty and `"source"`. `"proposed"` ghost discs stay
 * flat. Unknown roles fail closed so a new pin role cannot silently opt
 * into elevation. Basemap does not matter.
 */
export function shouldElevatePointPin(opts: {
  locationPinRole?: unknown;
}): boolean {
  const role = opts.locationPinRole;
  return role == null || role === "" || role === "source";
}

/**
 * Apply stem/head layout for a pin element built by crisis-map.
 * Expects `data-max-stem`, `.marker-pin-head`, `.marker-pin-stem`.
 * Ground contact stays fixed (Mapbox `anchor: "bottom"`).
 */
export function applyPinElevation(
  el: HTMLElement,
  factor: number,
): void {
  const maxStem = Number(el.dataset.maxStem);
  if (!Number.isFinite(maxStem) || maxStem <= 0) return;
  const t = Math.min(1, Math.max(0, factor));
  const head = el.querySelector<HTMLElement>(".marker-pin-head");
  const stem = el.querySelector<HTMLElement>(".marker-pin-stem");
  if (head) {
    head.style.bottom = `${maxStem * t}px`;
  }
  if (stem) {
    stem.style.transform = `scaleY(${t})`;
    stem.style.opacity = t < 0.02 ? "0" : "1";
  }
}

/**
 * Screen-space offset from a bottom-anchored Mapbox `project()` tip to the
 * glyph (head) center. Y grows downward; stem raises the head by `maxStem * t`.
 * Center-anchored (non-elevated) pins need no offset.
 */
export function bottomAnchorGlyphCenterOffset(opts: {
  headSizePx: number;
  maxStemPx: number;
  elevationFactor: number;
}): { x: number; y: number } {
  const head = Number.isFinite(opts.headSizePx) ? opts.headSizePx : 0;
  const maxStem = Number.isFinite(opts.maxStemPx) ? opts.maxStemPx : 0;
  const t = Math.min(1, Math.max(0, opts.elevationFactor));
  if (head <= 0) return { x: 0, y: 0 };
  return { x: 0, y: -(maxStem * t + head / 2) };
}

/**
 * Center of a client rect in Mapbox `project()` space (container top-left, Y down).
 */
export function clientRectCenterInContainer(
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  container: Pick<DOMRect, "left" | "top">,
): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2 - container.left,
    y: rect.top + rect.height / 2 - container.top,
  };
}
