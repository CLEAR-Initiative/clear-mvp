import { describe, expect, it } from "vitest";
import { mapFocusHref, MAP_FOCUS_ZOOM } from "./map-focus-href";

describe("mapFocusHref", () => {
  it("builds focused deep-links for each entity kind", () => {
    expect(mapFocusHref("event", "evt-1")).toBe("/map?event=evt-1");
    expect(mapFocusHref("signal", "sig-1")).toBe("/map?signal=sig-1");
    expect(mapFocusHref("crisis", "cri-1")).toBe("/map?crisis=cri-1");
  });

  it("encodes ids", () => {
    expect(mapFocusHref("event", "a b")).toBe("/map?event=a%20b");
  });

  it("exports a marker-level focus zoom (much tighter than country overview)", () => {
    expect(MAP_FOCUS_ZOOM).toBeGreaterThanOrEqual(13);
  });
});
