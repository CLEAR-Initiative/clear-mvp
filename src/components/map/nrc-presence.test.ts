import { describe, expect, it } from "vitest";
import { NRC_LETTER_PATHS } from "~/components/ui/nrc-logo-mark";
import {
  PRESENCE_LINE_OPACITY,
  PRESENCE_SUDAN_OFFICES,
  nrcPinSvg,
  presenceFillOpacity,
  presenceLineVisibility,
} from "./nrc-presence";

describe("presence map styling", () => {
  it("fills NRC countries at 0.42, 0.62 on hover", () => {
    expect(presenceFillOpacity(null)).toEqual(["case", ["boolean", ["feature-state", "hover"], false], 0.62, 0.42]);
  });

  it("emphasises the selected country and fades the others", () => {
    expect(presenceFillOpacity("SD")).toEqual(["case", ["==", ["get", "iso_3166_1"], "SD"], 0.26, 0.08]);
  });

  it("fades borders in from zoom 2.8", () => {
    const opacity = PRESENCE_LINE_OPACITY as unknown[];
    expect(opacity.slice(0, 3)).toEqual(["interpolate", ["linear"], ["zoom"]]);
    expect(opacity[3]).toBe(2.8);
  });

  it("hides borders in the country state with visibility, not opacity", () => {
    // Swapping line-opacity to a constant crashes Mapbox (GlitchTip prod #912).
    expect(presenceLineVisibility(null)).toBe("visible");
    expect(presenceLineVisibility("SD")).toBe("none");
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

describe("PRESENCE_SUDAN_OFFICES", () => {
  it("leaves out former and planned offices", () => {
    const types = new Set(PRESENCE_SUDAN_OFFICES.map((o) => o.officeType));
    expect(types.has("former_country_office")).toBe(false);
    expect(types.has("planned_or_expansion")).toBe(false);
    expect(types.has("country_office")).toBe(true);
  });
});
