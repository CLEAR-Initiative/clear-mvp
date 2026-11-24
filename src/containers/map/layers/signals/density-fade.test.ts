import { describe, expect, it } from "vitest";
import { heatOpacity, pointOpacity } from "./density-fade";

describe("heat to points crossfade", () => {
  it("hands the heat over to the points across the same zoom band, scaled by layer opacity", () => {
    expect(heatOpacity(0.5)).toEqual(["interpolate", ["linear"], ["zoom"], 4.25, 0.425, 5.75, 0]);
    expect(pointOpacity(0.5)).toEqual(["interpolate", ["linear"], ["zoom"], 4.25, 0, 5.75, 0.5]);
  });
});
