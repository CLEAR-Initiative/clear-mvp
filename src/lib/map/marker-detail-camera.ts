/**
 * Mobile marker-detail camera contract (#501).
 *
 * Opening a pin may zoom and pad so it sits above the bottom sheet. Pitch and
 * bearing must survive that fly and pin swaps. Closing restores the camera
 * from immediately before the first open — every pin, not only cluster pins.
 */

export type CenterZoom = {
  center: [number, number];
  zoom: number;
};

export type CameraPose = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function asCameraPose(
  prior: CenterZoom | CameraPose | null | undefined,
  fallback: Pick<CameraPose, "pitch" | "bearing"> = { pitch: 0, bearing: 0 },
): CameraPose | null {
  if (!prior || !Array.isArray(prior.center) || prior.center.length !== 2) {
    return null;
  }
  if (
    !isFiniteNumber(prior.center[0]) ||
    !isFiniteNumber(prior.center[1]) ||
    !isFiniteNumber(prior.zoom)
  ) {
    return null;
  }
  const pitched = prior as Partial<CameraPose>;
  const pitch = isFiniteNumber(pitched.pitch) ? pitched.pitch : fallback.pitch;
  const bearing = isFiniteNumber(pitched.bearing)
    ? pitched.bearing
    : fallback.bearing;
  return {
    center: [prior.center[0], prior.center[1]],
    zoom: prior.zoom,
    pitch,
    bearing,
  };
}

/** Zoom in past the current layer so close clearly returns outward. */
export function mobileMarkerFocusZoom(
  priorZoom: number | undefined,
  countryZoom: number,
): number {
  return Math.min(14.5, (priorZoom ?? countryZoom) + 2.5);
}

/**
 * Orientation for programmatic flyTo. Never flatten because the bottom sheet
 * added padding — that was snapping Hybrid Topography (and any tilt) to 0.
 * An explicit restore pose wins (close / force-fly).
 */
export function flyToOrientation(args: {
  currentPitch: number;
  currentBearing: number;
  restorePitch?: number;
  restoreBearing?: number;
}): { pitch: number; bearing: number } {
  return {
    pitch: isFiniteNumber(args.restorePitch)
      ? args.restorePitch
      : args.currentPitch,
    bearing: isFiniteNumber(args.restoreBearing)
      ? args.restoreBearing
      : args.currentBearing,
  };
}

/** Last detail panel closed — restore the pre-open camera for every pin. */
export function lastDetailCloseRestore(
  restore: CameraPose | null | undefined,
): CameraPose | null {
  return asCameraPose(restore);
}

/**
 * Pin-to-pin while a sheet is already open must not replace the snapshot.
 * Close always returns to the camera from immediately before the first open.
 */
export function keepPreOpenRestore(
  existing: CameraPose | null,
  candidate: CameraPose | null,
): CameraPose | null {
  return existing ?? candidate;
}

export type FitPadding =
  | number
  | { top: number; bottom: number; left: number; right: number };

/** Desktop country fit — geometry inset from the panel chrome. */
export const DESKTOP_COUNTRY_FIT_PADDING = 80;

/**
 * Mobile country fit. The map canvas is full-viewport while the app shell
 * header (56px) and bottom nav (72px) cover the top and bottom, so a 36px
 * uniform inset cropped the bbox. These insets park the country in the
 * visible hole, including a little breathing room.
 */
export const MOBILE_COUNTRY_FIT_PADDING = {
  top: 80,
  bottom: 96,
  left: 28,
  right: 28,
} as const;

export function countryFitPadding(narrow: boolean): FitPadding {
  return narrow ? MOBILE_COUNTRY_FIT_PADDING : DESKTOP_COUNTRY_FIT_PADDING;
}

/** Mapbox fitBounds options that never flatten live tilt. */
export function fitBoundsCameraOptions(args: {
  currentPitch: number;
  currentBearing: number;
  padding: FitPadding;
  duration: number;
  maxZoom?: number;
}): {
  padding: FitPadding;
  duration: number;
  pitch: number;
  bearing: number;
  maxZoom?: number;
} {
  const { pitch, bearing } = flyToOrientation({
    currentPitch: args.currentPitch,
    currentBearing: args.currentBearing,
  });
  return {
    padding: args.padding,
    duration: args.duration,
    pitch,
    bearing,
    ...(args.maxZoom != null ? { maxZoom: args.maxZoom } : {}),
  };
}
