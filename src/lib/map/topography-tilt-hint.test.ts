import { describe, expect, it } from "vitest";
import {
  TOPOGRAPHY_TILT_HINT_STORAGE_KEY,
  dismissTopographyTiltHint,
  isTopographyTiltHintDismissed,
  shouldShowTopographyTiltHint,
  type TiltHintStorage,
} from "./topography-tilt-hint";

function memoryStorage(seed: Record<string, string> = {}): TiltHintStorage {
  const data = { ...seed };
  return {
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe("shouldShowTopographyTiltHint", () => {
  it("shows only on Topography when not dismissed", () => {
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "topography",
        dismissed: false,
      }),
    ).toBe(true);
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "simple",
        dismissed: false,
      }),
    ).toBe(false);
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "satellite",
        dismissed: false,
      }),
    ).toBe(false);
  });

  it("hides after dismiss even on Topography", () => {
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "topography",
        dismissed: true,
      }),
    ).toBe(false);
  });
});

describe("dismiss / storage policy", () => {
  it("reads and writes the session dismiss flag", () => {
    const storage = memoryStorage();
    expect(isTopographyTiltHintDismissed(storage)).toBe(false);

    dismissTopographyTiltHint(storage);
    expect(isTopographyTiltHintDismissed(storage)).toBe(true);
    expect(storage.getItem(TOPOGRAPHY_TILT_HINT_STORAGE_KEY)).toBe("1");
  });

  it("does not reappear after dismiss for the policy window", () => {
    const storage = memoryStorage();
    dismissTopographyTiltHint(storage);

    // Leave and re-enter Topography — still dismissed.
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "simple",
        dismissed: isTopographyTiltHintDismissed(storage),
      }),
    ).toBe(false);
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "topography",
        dismissed: isTopographyTiltHintDismissed(storage),
      }),
    ).toBe(false);
  });
});
