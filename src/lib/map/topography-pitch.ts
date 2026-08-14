/**
 * Map pitch policy — enable tilt gestures on every basemap; never auto-pitch
 * on select; never reset pitch when switching layers.
 *
 * The Topography tilt *hint* is separate (`topography-tilt-hint`) and stays
 * Topography-only. Desktop Mapbox pitch is Ctrl+drag, ⌘+drag (via meta→ctrl
 * bridge), or right-click drag (not plain pan). Touch uses two-finger pitch.
 * An explicit “Tilt” action on the hint is also opt-in.
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
 * All basemaps: gestures on, pitch unchanged (no auto-tilt, no reset on swap).
 * `baseMapType` is accepted so callers can keep one sync hook per basemap change.
 */
export function syncTopographyPitch(
  map: TopographyPitchMap,
  _baseMapType: "simple" | "topography" | "satellite",
): void {
  setTopographyPitchGestures(map, true);
}
