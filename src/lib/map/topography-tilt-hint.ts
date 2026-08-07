/**
 * One-time dismissible tilt hint for Hybrid Topography.
 * Policy window: sessionStorage until dismissed (survives leave/re-enter
 * Topography within the same tab session only if not dismissed).
 */

/** Bump suffix when hint copy/CTA changes so prior dismissals don't hide teaching. */
export const TOPOGRAPHY_TILT_HINT_STORAGE_KEY =
  "clear.map.topographyTiltHintDismissed.v2";

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

/**
 * Whether the tilt hint chrome should render.
 * Visible only on Topography and only until dismissed for the session.
 */
export function shouldShowTopographyTiltHint(options: {
  baseMapType: "simple" | "topography" | "satellite";
  dismissed: boolean;
}): boolean {
  return options.baseMapType === "topography" && !options.dismissed;
}

function defaultSessionStorage(): TiltHintStorage | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}
