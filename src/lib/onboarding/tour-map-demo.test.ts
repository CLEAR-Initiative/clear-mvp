import { describe, expect, it } from "vitest";
import { pickTourDemoMarker } from "~/lib/onboarding/tour-map-demo";

describe("pickTourDemoMarker", () => {
  it("returns null for an empty list", () => {
    expect(pickTourDemoMarker([])).toBeNull();
  });

  it("prefers a pin with nearby neighbors", () => {
    const markers = [
      { id: 1, lng: 0, lat: 0 },
      { id: 2, lng: 10, lat: 10 },
      { id: 3, lng: 10.1, lat: 10.05 },
      { id: 4, lng: 10.15, lat: 10.08 },
    ];
    const pick = pickTourDemoMarker(markers);
    expect(pick?.id).not.toBe(1);
    expect([2, 3, 4]).toContain(pick?.id);
  });
});
