import { describe, expect, it, vi } from "vitest";
import {
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

  it("disables gestures and resets pitch when leaving Topography", () => {
    const map = createMockPitchMap(35);
    syncTopographyPitch(map, "topography");
    expect(map.dragEnabled).toBe(true);

    syncTopographyPitch(map, "simple");
    expect(map.dragEnabled).toBe(false);
    expect(map.touchEnabled).toBe(false);
    expect(map.pitch).toBe(0);
  });

  it("keeps Simple and Satellite flat", () => {
    const map = createMockPitchMap(20);
    syncTopographyPitch(map, "satellite");
    expect(map.pitch).toBe(0);
    expect(map.dragEnabled).toBe(false);

    syncTopographyPitch(map, "simple");
    expect(map.pitch).toBe(0);
    expect(map.dragEnabled).toBe(false);
  });
});
