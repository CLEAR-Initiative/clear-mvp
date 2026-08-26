import { describe, expect, it } from "vitest";
import {
  asCameraPose,
  flyToOrientation,
  lastDetailCloseRestore,
  mobileMarkerFocusZoom,
} from "./marker-detail-camera";

describe("asCameraPose", () => {
  it("copies center/zoom and fills missing pitch/bearing from fallback", () => {
    const pose = asCameraPose(
      { center: [32.5, 15.6], zoom: 6.2 },
      { pitch: 48, bearing: -20 },
    );
    expect(pose).toEqual({
      center: [32.5, 15.6],
      zoom: 6.2,
      pitch: 48,
      bearing: -20,
    });
  });

  it("keeps an already-complete pose", () => {
    const pose = asCameraPose({
      center: [1, 2],
      zoom: 8,
      pitch: 58,
      bearing: 12,
    });
    expect(pose?.pitch).toBe(58);
    expect(pose?.bearing).toBe(12);
  });

  it("rejects unusable input", () => {
    expect(asCameraPose(null)).toBeNull();
    expect(
      asCameraPose({ center: [1] as unknown as [number, number], zoom: 2 }),
    ).toBeNull();
  });
});

describe("mobileMarkerFocusZoom", () => {
  it("steps inward from the browse zoom, capped", () => {
    expect(mobileMarkerFocusZoom(6, 5)).toBe(8.5);
    expect(mobileMarkerFocusZoom(13, 5)).toBe(14.5);
    expect(mobileMarkerFocusZoom(undefined, 5)).toBe(7.5);
  });
});

describe("flyToOrientation", () => {
  it("preserves live pitch/bearing when focusing a pin above a bottom sheet", () => {
    // Old bug: flyPaddingBottom > 0 forced pitch/bearing to 0.
    expect(
      flyToOrientation({ currentPitch: 52, currentBearing: -18 }),
    ).toEqual({ pitch: 52, bearing: -18 });
  });

  it("uses the restore pose on close even if the live camera drifted", () => {
    expect(
      flyToOrientation({
        currentPitch: 10,
        currentBearing: 90,
        restorePitch: 52,
        restoreBearing: -18,
      }),
    ).toEqual({ pitch: 52, bearing: -18 });
  });
});

describe("lastDetailCloseRestore", () => {
  it("restores the pre-open camera for a lonely pin, not the detail zoom", () => {
    const restore = lastDetailCloseRestore({
      center: [30, 15],
      zoom: 6,
      pitch: 50,
      bearing: 8,
    });
    expect(restore).toEqual({
      center: [30, 15],
      zoom: 6,
      pitch: 50,
      bearing: 8,
    });
  });

  it("returns null when there was nothing to restore", () => {
    expect(lastDetailCloseRestore(null)).toBeNull();
  });
});
