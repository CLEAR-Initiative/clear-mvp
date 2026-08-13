/**
 * Pitch-linked marker elevation for Topography.
 *
 * Flat while the camera is mostly top-down (pitch ≤ 45°). Stem grows smoothly
 * from 45° → 70° so tilt readability ramps with the gesture — no marker remount.
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

/**
 * Apply stem/head layout for a Topography pin element built by crisis-map.
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
