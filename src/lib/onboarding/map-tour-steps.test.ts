import { describe, expect, it } from "vitest";
import { PRODUCT_TOUR_STEPS } from "~/lib/onboarding/product-tour-steps";

describe("PRODUCT_TOUR_STEPS", () => {
  it("covers Detection, Insights, and Map with 2–3 stops each", () => {
    const count = (page: string) => PRODUCT_TOUR_STEPS.filter((s) => s.page === page).length;
    expect(count("detection")).toBeGreaterThanOrEqual(2);
    expect(count("detection")).toBeLessThanOrEqual(3);
    expect(count("insights")).toBeGreaterThanOrEqual(2);
    expect(count("insights")).toBeLessThanOrEqual(3);
    expect(count("map")).toBeGreaterThanOrEqual(2);
    expect(count("map")).toBeLessThanOrEqual(3);
  });

  it("ends on Map so Finish leaves the user on the map tab", () => {
    const last = PRODUCT_TOUR_STEPS.at(-1);
    expect(last?.page).toBe("map");
    expect(last?.route).toBe("/map");
    expect(last?.primaryAction).toBe("finish");
  });

  it("registers stable data-tour targets and visits pages in order", () => {
    for (const step of PRODUCT_TOUR_STEPS) {
      expect(step.target).toMatch(/^\[data-tour="/);
    }
    const pages = PRODUCT_TOUR_STEPS.map((s) => s.page);
    expect(pages.indexOf("detection")).toBeLessThan(pages.indexOf("insights"));
    expect(pages.indexOf("insights")).toBeLessThan(pages.indexOf("map"));
  });
});
