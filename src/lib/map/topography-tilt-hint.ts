/**
 * One-time dismissible tilt hint for Hybrid Topography.
 * Policy window: sessionStorage until dismissed (survives leave/re-enter
 * Topography within the same tab session only if not dismissed).
 *
 * Also requires a flat camera: if pitch is already non-zero, do not teach tilt.
 */

/** Bump suffix when hint copy/CTA changes so prior dismissals don't hide teaching. */
export const TOPOGRAPHY_TILT_HINT_STORAGE_KEY =
  "clear.map.topographyTiltHintDismissed.v2";

/** Pitch at or below this (degrees) counts as “flat” for the teaching hint. */
export const TOPOGRAPHY_TILT_HINT_FLAT_PITCH_DEG = 0.5;

export type TiltHintStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function isTopographyTiltHintDismissed(
  storage: TiltHintStorage | null | undefined = defaultSessionStorage(),
): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(TOPOGRAPHY_TILT_HINT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissTopographyTiltHint(
  storage: TiltHintStorage | null | undefined = defaultSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(TOPOGRAPHY_TILT_HINT_STORAGE_KEY, "1");
  } catch {
    /* private mode / quota */
  }
}

/** True when the camera is effectively top-down (no tilt to re-teach). */
export function isTopographyTiltHintFlatPitch(pitchDeg: number): boolean {
  return (
    Number.isFinite(pitchDeg) &&
    pitchDeg <= TOPOGRAPHY_TILT_HINT_FLAT_PITCH_DEG
  );
}

/**
 * Whether the tilt hint chrome should render.
 * Visible only on Topography, until session-dismissed, and only while pitch ≈ 0.
 */
export function shouldShowTopographyTiltHint(options: {
  baseMapType: "simple" | "topography" | "satellite";
  dismissed: boolean;
  /** Live Mapbox pitch in degrees. Defaults to 0 (flat) when omitted. */
  pitch?: number;
}): boolean {
  const pitch = options.pitch ?? 0;
  return (
    options.baseMapType === "topography" &&
    !options.dismissed &&
    isTopographyTiltHintFlatPitch(pitch)
  );
}

function defaultSessionStorage(): TiltHintStorage | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}
