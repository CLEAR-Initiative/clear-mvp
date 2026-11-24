import type { ExpressionSpecification } from "mapbox-gl";

const HEAT_TO_POINTS_ZOOM = 5;
const CROSSFADE_HALF = 0.75;
const HEAT_PEAK_OPACITY = 0.85;

const FADE_START = HEAT_TO_POINTS_ZOOM - CROSSFADE_HALF;
export const FADE_END = HEAT_TO_POINTS_ZOOM + CROSSFADE_HALF;
export const HEAT_POINTS_MIN_ZOOM = HEAT_TO_POINTS_ZOOM;

function fade(from: number, to: number): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], FADE_START, from, FADE_END, to];
}

export function heatOpacity(opacity: number): ExpressionSpecification {
  return fade(HEAT_PEAK_OPACITY * opacity, 0);
}

export function pointOpacity(opacity: number): ExpressionSpecification {
  return fade(0, opacity);
}
