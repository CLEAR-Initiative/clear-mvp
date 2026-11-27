"use client";

import { useEffect } from "react";
import { useMap } from "react-map-gl/mapbox";

// Matches the `map-v2-selection-blink` CSS animation on selected clusters (globals.css).
const PERIOD_MS = 1500;
const HOLD_MS = 500;
const FADE_MS = 500;
const MIN_OPACITY = 0.05;

const easeOut = (x: number) => 1 - (1 - x) ** 2;

/** The selection ring's opacity `elapsedMs` into the blink: it holds, fades out, then comes back. */
export function blinkOpacity(elapsedMs: number): number {
  const t = elapsedMs % PERIOD_MS;
  if (t < HOLD_MS) return 1;
  if (t < HOLD_MS + FADE_MS) return 1 - (1 - MIN_OPACITY) * easeOut((t - HOLD_MS) / FADE_MS);
  return MIN_OPACITY + (1 - MIN_OPACITY) * easeOut((t - HOLD_MS - FADE_MS) / (PERIOD_MS - HOLD_MS - FADE_MS));
}

/**
 * Blinks a circle layer's stroke while `active`, scaled by the layer's `opacity`. Sets the paint
 * property on the map each frame, without re-rendering. Stays solid when the user asks for reduced motion.
 */
export function useSelectionBlink(layerId: string, opacity: number, active: boolean) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Leaving the page removes the map before this effect is cleaned up; a removed map has no style,
    // and touching its layers throws.
    let removed = false;
    const setOpacity = (value: number) => {
      if (!removed && map.getLayer(layerId)) map.setPaintProperty(layerId, "circle-stroke-opacity", value);
    };
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      setOpacity(opacity * blinkOpacity(now - start));
      frame = requestAnimationFrame(tick);
    };
    const onRemove = () => {
      removed = true;
      cancelAnimationFrame(frame);
    };
    map.once("remove", onRemove);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      map.off("remove", onRemove);
      setOpacity(opacity);
    };
  }, [mapRef, layerId, opacity, active]);
}
