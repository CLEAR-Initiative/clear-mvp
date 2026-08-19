import { describe, expect, it } from "vitest";
import {
  PIN_ELEVATE_FULL_PITCH,
  PIN_ELEVATE_START_PITCH,
  applyPinElevation,
  pinElevationFactor,
  shouldElevatePointPin,
} from "./pin-elevation";

describe("pinElevationFactor", () => {
  it("stays flat at and below the start pitch", () => {
    expect(pinElevationFactor(0)).toBe(0);
    expect(pinElevationFactor(30)).toBe(0);
    expect(pinElevationFactor(PIN_ELEVATE_START_PITCH)).toBe(0);
  });

  it("is fully elevated at and above the full pitch", () => {
    expect(pinElevationFactor(PIN_ELEVATE_FULL_PITCH)).toBe(1);
    expect(pinElevationFactor(85)).toBe(1);
  });

  it("ramps smoothly between start and full", () => {
    const mid = pinElevationFactor(
      (PIN_ELEVATE_START_PITCH + PIN_ELEVATE_FULL_PITCH) / 2,
    );
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    // smoothstep(0.5) === 0.5
    expect(mid).toBeCloseTo(0.5, 5);
    expect(pinElevationFactor(50)).toBeLessThan(pinElevationFactor(60));
  });

  it("treats non-finite pitch as flat", () => {
    expect(pinElevationFactor(Number.NaN)).toBe(0);
  });
});

describe("shouldElevatePointPin", () => {
  it("elevates Event/Signal/Crisis pins on every basemap", () => {
    expect(shouldElevatePointPin({})).toBe(true);
    expect(shouldElevatePointPin({ locationPinRole: "source" })).toBe(true);
    expect(shouldElevatePointPin({ locationPinRole: "" })).toBe(true);
  });

  it("keeps proposed location pins flat", () => {
    expect(shouldElevatePointPin({ locationPinRole: "proposed" })).toBe(false);
  });
});

describe("applyPinElevation", () => {
  function makePin(maxStem: number): HTMLDivElement {
    const outer = document.createElement("div");
    outer.dataset.maxStem = String(maxStem);
    outer.dataset.elevatedPin = "1";
    const head = document.createElement("div");
    head.className = "marker-pin-head";
    const stem = document.createElement("div");
    stem.className = "marker-pin-stem";
    outer.appendChild(head);
    outer.appendChild(stem);
    return outer;
  }

  it("lifts the head and scales the stem with the factor", () => {
    const el = makePin(20);
    applyPinElevation(el, 0.5);
    const head = el.querySelector<HTMLElement>(".marker-pin-head")!;
    const stem = el.querySelector<HTMLElement>(".marker-pin-stem")!;
    expect(head.style.bottom).toBe("10px");
    expect(stem.style.transform).toBe("scaleY(0.5)");
    expect(stem.style.opacity).toBe("1");
  });

  it("collapses stem at factor 0", () => {
    const el = makePin(16);
    applyPinElevation(el, 0);
    const head = el.querySelector<HTMLElement>(".marker-pin-head")!;
    const stem = el.querySelector<HTMLElement>(".marker-pin-stem")!;
    expect(head.style.bottom).toBe("0px");
    expect(stem.style.transform).toBe("scaleY(0)");
    expect(stem.style.opacity).toBe("0");
  });
});
