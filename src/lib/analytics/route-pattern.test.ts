import { describe, expect, it } from "vitest";
import { DIRECT_ROUTE, isRoutePattern, routePattern } from "./route-pattern";

describe("routePattern", () => {
  it("keeps plain route words", () => {
    expect(routePattern("/map")).toBe("/map");
    expect(routePattern("/notification-preferences")).toBe("/notification-preferences");
    expect(routePattern("/")).toBe("/");
  });

  it("collapses ids and anything that isn't a route word", () => {
    expect(routePattern("/event/cmvtdzfl0000fl307lu5gzbq3")).toBe("/event/:id");
    expect(routePattern("/crisis/123/edit")).toBe("/crisis/:id/edit");
    expect(routePattern("/x/3f2b8c1e-1d2a-4f0e-9b7a-2c1d0e9f8a7b")).toBe("/x/:id");
    expect(routePattern("/search/Sudan%20floods")).toBe("/search/:id");
  });

  it("drops the query string and hash", () => {
    expect(routePattern("/detection?q=khartoum#top")).toBe("/detection");
  });

  it("is `direct` without an earlier route", () => {
    expect(routePattern(null)).toBe(DIRECT_ROUTE);
    expect(routePattern("")).toBe(DIRECT_ROUTE);
  });

  it("only produces values isRoutePattern accepts", () => {
    for (const p of ["/map", "/event/abc123", "/a?b=c", null, "/"]) {
      expect(isRoutePattern(routePattern(p))).toBe(true);
    }
    expect(isRoutePattern("/event/abc123")).toBe(false);
  });
});
