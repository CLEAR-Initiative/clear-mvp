import { describe, expect, it } from "vitest";
import {
  TOPOGRAPHY_TILT_HINT_STORAGE_KEY,
  dismissTopographyTiltHint,
  isTopographyTiltHintDismissed,
  isTopographyTiltHintFlatPitch,
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
  it("shows only on Topography when not dismissed and pitch is flat", () => {
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "topography",
        dismissed: false,
        pitch: 0,
      }),
    ).toBe(true);
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "simple",
        dismissed: false,
        pitch: 0,
      }),
    ).toBe(false);
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "satellite",
        dismissed: false,
        pitch: 0,
      }),
    ).toBe(false);
  });

  it("hides when the camera is already tilted", () => {
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "topography",
        dismissed: false,
        pitch: 45,
      }),
    ).toBe(false);
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "topography",
        dismissed: false,
        pitch: 1,
      }),
    ).toBe(false);
  });

  it("honours the flat-pitch boundary at 0.5°", () => {
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "topography",
        dismissed: false,
        pitch: 0.5,
      }),
    ).toBe(true);
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "topography",
        dismissed: false,
        pitch: 0.51,
      }),
    ).toBe(false);
  });

  it("hides after dismiss even on Topography at pitch 0", () => {
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "topography",
        dismissed: true,
        pitch: 0,
      }),
    ).toBe(false);
  });
});

describe("isTopographyTiltHintFlatPitch", () => {
  it("treats sub-degree pitch as flat", () => {
    expect(isTopographyTiltHintFlatPitch(0)).toBe(true);
    expect(isTopographyTiltHintFlatPitch(0.4)).toBe(true);
    expect(isTopographyTiltHintFlatPitch(0.5)).toBe(true);
    expect(isTopographyTiltHintFlatPitch(0.51)).toBe(false);
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
        pitch: 0,
      }),
    ).toBe(false);
    expect(
      shouldShowTopographyTiltHint({
        baseMapType: "topography",
        dismissed: isTopographyTiltHintDismissed(storage),
        pitch: 0,
      }),
    ).toBe(false);
  });
});
