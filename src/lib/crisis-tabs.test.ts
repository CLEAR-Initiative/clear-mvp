import { describe, expect, it } from "vitest";
import { readCrisisTabs, withCrisisTab } from "./crisis-tabs";

describe("crisis tabs in the URL", () => {
  it("reads known values and falls back to defaults", () => {
    expect(readCrisisTabs(new URLSearchParams("tab=needs&panel=demography"))).toEqual({ tab: "needs", panel: "demography" });
    expect(readCrisisTabs(new URLSearchParams("tab=bogus"))).toEqual({ tab: "overview", panel: "events" });
  });
  it("sets a tab, drops the default and keeps other params", () => {
    expect(withCrisisTab("from=map", "tab", "needs")).toBe("?from=map&tab=needs");
    expect(withCrisisTab("from=map&tab=needs", "tab", "overview")).toBe("?from=map");
    expect(withCrisisTab("", "panel", "events")).toBe("");
  });
});
