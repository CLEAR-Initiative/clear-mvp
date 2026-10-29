import { describe, expect, it } from "vitest";
import enMessages from "../../messages/en.json";
import { NAV_ROUTES, navItemForRoute } from "~/lib/nav-routes";

describe("navItemForRoute", () => {
  it("names a route's nav section by its first segment", () => {
    expect(navItemForRoute("/dashboard")).toBe("overview");
    expect(navItemForRoute("/map/focus/x")).toBe("map");
    expect(navItemForRoute("/event/e1")).toBeUndefined();
    expect(navItemForRoute("/")).toBeUndefined();
  });

  it("covers every nav section, each with a name in nav.items", () => {
    for (const [key, href] of Object.entries(NAV_ROUTES)) {
      expect(navItemForRoute(href)).toBe(key);
      expect(enMessages.nav.items).toHaveProperty(key);
    }
  });

  it("opens Insights at /insights", () => {
    expect(NAV_ROUTES.insights).toBe("/insights");
    expect(enMessages.nav.items.insights).toBe("Insights");
    expect(navItemForRoute("/insights")).toBe("insights");
    expect(navItemForRoute("/analysis")).toBeUndefined();
  });
});
