import { describe, expect, it } from "vitest";
import { MAP_TOUR_STEPS } from "~/lib/onboarding/map-tour-steps";

describe("MAP_TOUR_STEPS", () => {
  it("registers four map stops with stable data-tour targets", () => {
    expect(MAP_TOUR_STEPS.map((s) => s.id)).toEqual([
      "signals",
      "events",
      "iconography",
      "navigation",
    ]);
    for (const step of MAP_TOUR_STEPS) {
      expect(step.target).toMatch(/^\[data-tour="/);
    }
  });

  it("only the first step hides Back and only the last finishes", () => {
    expect(MAP_TOUR_STEPS[0]?.showBack).toBe(false);
    expect(MAP_TOUR_STEPS[0]?.primaryAction).toBe("next");
    expect(MAP_TOUR_STEPS.at(-1)?.primaryAction).toBe("finish");
    expect(MAP_TOUR_STEPS.slice(1, -1).every((s) => s.showBack && s.primaryAction === "next")).toBe(
      true,
    );
  });
});
