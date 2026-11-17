import { describe, expect, it } from "vitest";
import { findLabelAnchorId } from "./label-anchor";

describe("findLabelAnchorId", () => {
  it("skips a symbol layer fed by one of our sources and returns the first basemap label", () => {
    const layers = [
      { id: "land", type: "background" },
      { id: "signals-labels", type: "symbol", source: "signals" },
      { id: "road-label", type: "symbol", source: "composite" },
    ];
    expect(findLabelAnchorId(layers)).toBe("road-label");
  });
});
