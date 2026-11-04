import { describe, expect, it } from "vitest";
import { NRC_LETTER_PATHS } from "~/components/ui/nrc-logo-mark";
import { nrcPinSvg, presenceFillOpacity, presenceLineOpacity } from "./nrc-presence";

describe("presence map styling", () => {
  it("fills NRC countries at 0.42, 0.62 on hover", () => {
    expect(presenceFillOpacity(null)).toEqual(["case", ["boolean", ["feature-state", "hover"], false], 0.62, 0.42]);
  });

  it("emphasises the selected country and fades the others", () => {
    expect(presenceFillOpacity("SD")).toEqual(["case", ["==", ["get", "iso_3166_1"], "SD"], 0.26, 0.08]);
  });

  it("hides borders at world zoom and in the country state", () => {
    const world = presenceLineOpacity(null) as unknown[];
    expect(world.slice(0, 3)).toEqual(["interpolate", ["linear"], ["zoom"]]);
    expect(world[3]).toBe(2.8);
    expect(presenceLineOpacity("SD")).toBe(0);
  });
});

describe("nrcPinSvg", () => {
  it("draws the NRC letters from the logo mark, at 2x the 40x52 pin", () => {
    const svg = nrcPinSvg();
    expect(svg).toContain('width="80" height="104" viewBox="0 0 40 52"');
    for (const d of NRC_LETTER_PATHS) expect(svg).toContain(d);
    expect(svg).not.toContain("metadata");
  });
});
