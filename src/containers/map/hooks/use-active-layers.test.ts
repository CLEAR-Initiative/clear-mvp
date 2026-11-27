import { describe, expect, it } from "vitest";
import { DEFAULT_LAYERS, parseLayers } from "./use-active-layers";

describe("layers param", () => {
  it("defaults to the alerts layer", () => {
    expect(DEFAULT_LAYERS).toEqual([{ id: "alerts", visibility: true, opacity: 1 }]);
  });

  it("keeps a signals layer from an old link", () => {
    expect(parseLayers('[{"id":"signals","visibility":true,"opacity":1}]')).toEqual([
      { id: "signals", visibility: true, opacity: 1 },
    ]);
  });

  it("drops a layer id the registry no longer has", () => {
    const value = JSON.stringify([
      { id: "signals", visibility: true, opacity: 1 },
      { id: "gone", visibility: true, opacity: 1 },
    ]);
    expect(parseLayers(value)).toEqual([{ id: "signals", visibility: true, opacity: 1 }]);
  });

  it("keeps only the first entry when an id repeats", () => {
    const value = JSON.stringify([
      { id: "signals", visibility: true, opacity: 1 },
      { id: "signals", visibility: false, opacity: 0.3 },
    ]);
    expect(parseLayers(value)).toEqual([{ id: "signals", visibility: true, opacity: 1 }]);
  });

  it("drops an item with an out-of-range opacity", () => {
    expect(parseLayers(JSON.stringify([{ id: "signals", visibility: true, opacity: 2 }]))).toEqual([]);
  });

  it("keeps a layer's settings and adds none to an entry without them", () => {
    const value = JSON.stringify([{ id: "signals", visibility: true, opacity: 1, settings: { density: "heatmap" } }]);
    expect(parseLayers(value)).toStrictEqual([
      { id: "signals", visibility: true, opacity: 1, settings: { density: "heatmap" } },
    ]);
    expect(parseLayers(JSON.stringify([{ id: "signals", visibility: true, opacity: 1 }]))).toStrictEqual([
      { id: "signals", visibility: true, opacity: 1 },
    ]);
  });

  it("drops an item whose settings are not an object", () => {
    expect(parseLayers(JSON.stringify([{ id: "signals", visibility: true, opacity: 1, settings: "x" }]))).toEqual([]);
  });

  it.each(["not json", "{}", "null"])("returns null for %j so the default applies", (value) => {
    expect(parseLayers(value)).toBeNull();
  });
});
