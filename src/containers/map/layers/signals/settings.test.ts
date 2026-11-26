import { describe, expect, it } from "vitest";
import { parseSignalsSettings, signalsSettingsFor } from "./settings";

describe("signals settings", () => {
  it.each([undefined, {}, { density: "hexbins" }, { density: 1 }])("falls back to clusters for %j", (settings) => {
    expect(parseSignalsSettings(settings)).toEqual({ density: "clusters" });
  });

  it("reads a heatmap density", () => {
    expect(parseSignalsSettings({ density: "heatmap" })).toEqual({ density: "heatmap" });
  });

  it("writes no settings for the default density", () => {
    expect(signalsSettingsFor("clusters")).toBeUndefined();
    expect(signalsSettingsFor("heatmap")).toEqual({ density: "heatmap" });
  });
});
