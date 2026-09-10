import { describe, expect, it } from "vitest";
import { isMapPath, NAV_EXPANDED_W_PX } from "./is-map-path";

describe("isMapPath", () => {
  it("matches /map and nested paths", () => {
    expect(isMapPath("/map")).toBe(true);
    expect(isMapPath("/map/")).toBe(true);
    expect(isMapPath("/map/anything")).toBe(true);
  });

  it("rejects lookalikes and other app routes", () => {
    expect(isMapPath("/mapbox")).toBe(false);
    expect(isMapPath("/dashboard")).toBe(false);
    expect(isMapPath("/")).toBe(false);
    expect(isMapPath("/mapping")).toBe(false);
  });
});

describe("NAV_EXPANDED_W_PX", () => {
  it("matches the expanded sidebar width used on first /map paint", () => {
    expect(NAV_EXPANDED_W_PX).toBe(240);
  });
});
