import { describe, expect, it } from "vitest";
import {
  angularDistance,
  INDICATOR_MARGIN_PX,
  initialBearing,
  placementForBearing,
  placementForPoint,
  type ViewArea,
} from "./placement";

// 1000×600 map with a 400px panel over its left side: the visible area is x 400–1000, y 0–600.
const view: ViewArea = { width: 1000, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 400 } };

describe("placementForPoint", () => {
  it("hides the indicator while the target is in the visible area", () => {
    expect(placementForPoint(view, { x: 700, y: 300 })).toBeNull();
  });

  it("treats a target under the panel as out of view and points left", () => {
    const placement = placementForPoint(view, { x: 200, y: 300 });

    expect(placement).toEqual({ x: 400 + INDICATOR_MARGIN_PX, y: 300, angle: -90 });
  });

  it("points up at a target above the map", () => {
    const placement = placementForPoint(view, { x: 700, y: -500 });

    expect(placement).toEqual({ x: 700, y: INDICATOR_MARGIN_PX, angle: 0 });
  });

  it("stays inside the visible area on a diagonal", () => {
    const placement = placementForPoint(view, { x: 2000, y: 1600 });

    expect(placement?.x).toBeLessThanOrEqual(1000 - INDICATOR_MARGIN_PX);
    expect(placement?.y).toBeLessThanOrEqual(600 - INDICATOR_MARGIN_PX);
    expect(placement?.angle).toBeGreaterThan(90);
    expect(placement?.angle).toBeLessThan(180);
  });
});

describe("placementForBearing", () => {
  it("points east for a bearing of 90°", () => {
    const placement = placementForBearing(view, 90);

    expect(placement?.x).toBeCloseTo(1000 - INDICATOR_MARGIN_PX);
    expect(placement?.y).toBeCloseTo(300);
    expect(placement?.angle).toBeCloseTo(90);
  });
});

describe("globe helpers", () => {
  it("measures the angle between two points", () => {
    expect(angularDistance([0, 0], [90, 0])).toBeCloseTo(90);
    expect(angularDistance([0, 0], [180, 0])).toBeCloseTo(180);
  });

  it("gives the compass bearing from one point to another", () => {
    expect(initialBearing([0, 0], [0, 10])).toBeCloseTo(0);
    expect(initialBearing([0, 0], [10, 0])).toBeCloseTo(90);
  });
});
