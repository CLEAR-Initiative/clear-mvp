/**
 * Topography pitch opt-in — enable tilt gestures only while Topography is
 * active; never auto-pitch on select; reset pitch when leaving.
 *
 * Desktop Mapbox pitch is Ctrl+drag or right-click drag (not plain pan).
 * Touch uses two-finger pitch. An explicit “Tilt” action is also opt-in.
 */

/** Opt-in demo pitch — enough to reveal the DEM mesh without auto-select. */
export const TOPOGRAPHY_OPT_IN_PITCH = 58;

export type TopographyPitchMap = {
  getPitch: () => number;
  setPitch: (pitch: number, options?: { duration?: number }) => unknown;
  setMaxPitch?: (pitch: number) => unknown;
  easeTo?: (options: {
    pitch: number;
    duration?: number;
    bearing?: number;
  }) => unknown;
  dragRotate?: { enable: () => void; disable: () => void };
  touchPitch?: { enable: () => void; disable: () => void };
};

/** Enable or disable drag/touch pitch without changing the camera. */
export function setTopographyPitchGestures(
  map: TopographyPitchMap,
  enabled: boolean,
): void {
  try {
    if (enabled) {
      map.setMaxPitch?.(85);
      map.dragRotate?.enable();
      map.touchPitch?.enable();
    } else {
      map.dragRotate?.disable();
      map.touchPitch?.disable();
    }
  } catch {
    /* ignore */
  }
}

/** Reset camera pitch to top-down (0). Does not change center/zoom. */
export function resetTopographyPitch(map: TopographyPitchMap): void {
  try {
    if (typeof map.easeTo === "function") {
      map.easeTo({ pitch: 0, duration: 300 });
    } else {
      map.setPitch(0);
    }
  } catch {
    /* ignore */
  }
}

/**
 * User-initiated tilt (hint CTA). Does not run on Topography select —
 * pitch stays 0 until this or a gesture.
 */
export function applyTopographyOptInTilt(map: TopographyPitchMap): void {
  setTopographyPitchGestures(map, true);
  try {
    if (typeof map.easeTo === "function") {
      map.easeTo({ pitch: TOPOGRAPHY_OPT_IN_PITCH, duration: 700 });
    } else {
      map.setPitch(TOPOGRAPHY_OPT_IN_PITCH);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Sync pitch policy to basemap.
 * Topography: gestures on, pitch unchanged (no auto-tilt).
 * Simple / Satellite: gestures off, pitch forced to 0.
 */
export function syncTopographyPitch(
  map: TopographyPitchMap,
  baseMapType: "simple" | "topography" | "satellite",
): void {
  if (baseMapType === "topography") {
    setTopographyPitchGestures(map, true);
    return;
  }
  setTopographyPitchGestures(map, false);
  if (map.getPitch() !== 0) {
    resetTopographyPitch(map);
  }
}
