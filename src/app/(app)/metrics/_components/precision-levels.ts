import type { Level } from "~/lib/location-precision";

/**
 * One ordered ramp for the five levels, coarse to fine: steps of the accent
 * mixed with the surface, so the same tokens read in light and dark (ADR-0002:
 * no hex literals). "No location" sits outside the ramp in the border tone.
 */
export const LEVEL_FILL: Record<Level, string> = {
  noLocation: "var(--color-border-dark)",
  country: "color-mix(in srgb, var(--color-accent) 30%, var(--color-bg-white))",
  state: "color-mix(in srgb, var(--color-accent) 50%, var(--color-bg-white))",
  district: "color-mix(in srgb, var(--color-accent) 75%, var(--color-bg-white))",
  point: "var(--color-accent)",
};

/** A share as a whole number of percent for a chart axis, null when there is none. */
export const toPct = (share: number | null) => (share === null ? null : Math.round(share * 1000) / 10);
