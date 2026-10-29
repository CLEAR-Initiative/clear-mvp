import { afterEach, describe, expect, it, vi } from "vitest";
import { trackTourEnded, trackTourStarted, trackTourStepViewed } from "./tour-analytics";

const umamiTrack = vi.fn();

describe("tour analytics", () => {
  afterEach(() => {
    delete window.umami;
    umamiTrack.mockReset();
  });

  function withTracker() {
    window.umami = { track: umamiTrack, identify: vi.fn() };
  }

  it("sends tour.started with the trigger and first_on_device as fixed values", () => {
    withTracker();
    trackTourStarted("replay", false);
    trackTourStarted("auto", true);
    expect(umamiTrack).toHaveBeenNthCalledWith(1, "tour.started", { trigger: "replay", first_on_device: "false" });
    expect(umamiTrack).toHaveBeenNthCalledWith(2, "tour.started", { trigger: "auto", first_on_device: "true" });
  });

  it("sends step ids, never step copy", () => {
    withTracker();
    trackTourStepViewed(2);
    trackTourEnded("skipped", 1);
    trackTourEnded("finished", 3);
    expect(umamiTrack.mock.calls).toEqual([
      ["tour.step_viewed", { step: "mapLayers" }],
      ["tour.skipped", { step: "detectionEvents" }],
      ["tour.finished", undefined],
    ]);
  });

  it("ignores an out-of-range step", () => {
    withTracker();
    trackTourStepViewed(99);
    trackTourEnded("skipped", 99);
    expect(umamiTrack).not.toHaveBeenCalled();
  });
});
