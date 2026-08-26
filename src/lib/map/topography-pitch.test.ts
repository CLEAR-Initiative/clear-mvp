import { describe, expect, it, vi } from "vitest";
import {
  TOPOGRAPHY_OPT_IN_PITCH,
  applyTopographyOptInTilt,
  resetTopographyPitch,
  setTopographyPitchGestures,
  syncTopographyPitch,
  type TopographyPitchMap,
} from "./topography-pitch";

function createMockPitchMap(initialPitch = 0): TopographyPitchMap & {
  pitch: number;
  dragEnabled: boolean;
  touchEnabled: boolean;
} {
  let pitch = initialPitch;
  let dragEnabled = false;
  let touchEnabled = false;
  return {
    get pitch() {
      return pitch;
    },
    get dragEnabled() {
      return dragEnabled;
    },
    get touchEnabled() {
      return touchEnabled;
    },
    getPitch: () => pitch,
    setPitch: (next) => {
      pitch = next;
    },
    easeTo: ({ pitch: next }) => {
      pitch = next;
    },
    dragRotate: {
      enable: () => {
        dragEnabled = true;
      },
      disable: () => {
        dragEnabled = false;
      },
    },
    touchPitch: {
      enable: () => {
        touchEnabled = true;
      },
      disable: () => {
        touchEnabled = false;
      },
    },
  };
}

describe("setTopographyPitchGestures", () => {
  it("enables and disables drag + touch pitch without changing pitch", () => {
    const map = createMockPitchMap(12);
    setTopographyPitchGestures(map, true);
    expect(map.dragEnabled).toBe(true);
    expect(map.touchEnabled).toBe(true);
    expect(map.pitch).toBe(12);

    setTopographyPitchGestures(map, false);
    expect(map.dragEnabled).toBe(false);
    expect(map.touchEnabled).toBe(false);
    expect(map.pitch).toBe(12);
  });
});

describe("resetTopographyPitch", () => {
  it("eases pitch to 0", () => {
    const map = createMockPitchMap(40);
    resetTopographyPitch(map);
    expect(map.pitch).toBe(0);
  });
});

describe("applyTopographyOptInTilt", () => {
  it("eases to the opt-in pitch without requiring prior auto-tilt", () => {
    const map = createMockPitchMap(0);
    applyTopographyOptInTilt(map);
    expect(map.pitch).toBe(TOPOGRAPHY_OPT_IN_PITCH);
    expect(map.dragEnabled).toBe(true);
  });
});

describe("syncTopographyPitch", () => {
  it("enables gestures on Topography without auto-pitching", () => {
    const map = createMockPitchMap(0);
    const setPitch = vi.spyOn(map, "setPitch");
    const easeTo = vi.spyOn(map, "easeTo");

    syncTopographyPitch(map, "topography");

    expect(map.dragEnabled).toBe(true);
    expect(map.touchEnabled).toBe(true);
    expect(setPitch).not.toHaveBeenCalled();
    expect(easeTo).not.toHaveBeenCalled();
    expect(map.pitch).toBe(0);
  });

  it("keeps gestures and pitch when leaving Topography", () => {
    const map = createMockPitchMap(35);
    syncTopographyPitch(map, "topography");
    expect(map.dragEnabled).toBe(true);

    syncTopographyPitch(map, "simple");
    expect(map.dragEnabled).toBe(true);
    expect(map.touchEnabled).toBe(true);
    expect(map.pitch).toBe(35);
  });

  it("enables tilt on Simple and Satellite without resetting pitch", () => {
    const map = createMockPitchMap(20);
    syncTopographyPitch(map, "satellite");
    expect(map.pitch).toBe(20);
    expect(map.dragEnabled).toBe(true);
    expect(map.touchEnabled).toBe(true);

    syncTopographyPitch(map, "simple");
    expect(map.pitch).toBe(20);
    expect(map.dragEnabled).toBe(true);
    expect(map.touchEnabled).toBe(true);
  });
});
