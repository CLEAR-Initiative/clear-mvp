import { describe, expect, it } from "vitest";
import { PRODUCT_TOUR_STEPS } from "~/lib/onboarding/product-tour-steps";

describe("PRODUCT_TOUR_STEPS", () => {
  it("is a 4-stop Alert → Event → Layers → canvas tour", () => {
    expect(PRODUCT_TOUR_STEPS.map((s) => s.id)).toEqual([
      "detectionAlerts",
      "detectionEvents",
      "mapLayers",
      "mapCanvas",
    ]);
    expect(PRODUCT_TOUR_STEPS[2]?.prepare).toBe("open-map-layers");
    expect(PRODUCT_TOUR_STEPS[3]?.prepare).toBe("demo-map-explore");
    expect(PRODUCT_TOUR_STEPS[3]?.side).toBe("left");
  });

  it("teaches Detection urgency then finishes on Map (no Insights)", () => {
    expect(
      PRODUCT_TOUR_STEPS.every((s) => s.page === "detection" || s.page === "map"),
    ).toBe(true);
    expect(PRODUCT_TOUR_STEPS.filter((s) => s.page === "detection")).toHaveLength(2);
    expect(PRODUCT_TOUR_STEPS.filter((s) => s.page === "map")).toHaveLength(2);
    expect(PRODUCT_TOUR_STEPS[0]?.tab).toBe("live");
    expect(PRODUCT_TOUR_STEPS[1]?.tab).toBe("events");
  });

  it("ends on Map so Finish leaves the user on the map tab", () => {
    const last = PRODUCT_TOUR_STEPS.at(-1);
    expect(last?.page).toBe("map");
    expect(last?.route).toBe("/map");
    expect(last?.primaryAction).toBe("finish");
  });

  it("registers stable data-tour targets and visits Detection before Map", () => {
    for (const step of PRODUCT_TOUR_STEPS) {
      expect(step.target).toMatch(/^\[data-tour="/);
    }
    const pages = PRODUCT_TOUR_STEPS.map((s) => s.page);
    expect(pages.indexOf("detection")).toBeLessThan(pages.indexOf("map"));
  });
});
