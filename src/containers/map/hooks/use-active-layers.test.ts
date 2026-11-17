import { describe, expect, it } from "vitest";
import { parseLayers } from "./use-active-layers";

describe("layers param", () => {
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

  it.each(["not json", "{}", "null"])("returns null for %j so the default applies", (value) => {
    expect(parseLayers(value)).toBeNull();
  });
});
