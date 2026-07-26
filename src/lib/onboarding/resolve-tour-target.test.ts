import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveTourTarget } from "~/lib/onboarding/resolve-tour-target";

describe("resolveTourTarget", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("prefers a painted match over a display:none twin", () => {
    document.body.innerHTML = `
      <div data-tour="map-filters" style="display:none"></div>
      <button data-tour="map-filters">filters</button>
    `;
    const hidden = document.querySelector("div")!;
    const button = document.querySelector("button")!;
    vi.spyOn(hidden, "getBoundingClientRect").mockReturnValue({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
      width: 30,
      height: 30,
      top: 10,
      left: 10,
      bottom: 40,
      right: 40,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    });

    const el = resolveTourTarget('[data-tour="map-filters"]');
    expect(el?.tagName).toBe("BUTTON");
  });

  it("returns null when no selector matches", () => {
    expect(resolveTourTarget('[data-tour="missing"]')).toBeNull();
  });
});
