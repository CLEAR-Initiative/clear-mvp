import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { allDisasterTypeCodes } from "~/lib/disaster-types";
import {
  DEFAULT_ICON_SLUG,
  EVENT_MARKER_ICON,
  GLIDE_TO_SLUG,
  resolveMarkerIconSlug,
  signalIconUrl,
} from "./resolve-icon";

describe("resolveMarkerIconSlug", () => {
  it("maps GLIDE flood/drought/conflict codes before title text", () => {
    expect(resolveMarkerIconSlug({ types: ["fl"], texts: ["drought in region"] })).toBe("flood");
    expect(resolveMarkerIconSlug({ types: ["dr"] })).toBe("drought");
    expect(resolveMarkerIconSlug({ types: ["ba"] })).toBe("conflict");
    expect(resolveMarkerIconSlug({ types: ["rv"] })).toBe("explosive-hazard");
    expect(resolveMarkerIconSlug({ types: ["ep"] })).toBe("disease");
    expect(resolveMarkerIconSlug({ types: ["fa"] })).toBe("food-insecurity");
  });

  it("maps technological disaster (ac) to infrastructure, not explosives", () => {
    expect(resolveMarkerIconSlug({ types: ["ac"] })).toBe("cat-infrastructure");
  });

  it("uses the first matching type in the list", () => {
    expect(resolveMarkerIconSlug({ types: ["ot", "eq"] })).toBe("cat-other-operations");
  });

  it("falls back to keyword match on free text when types miss", () => {
    expect(
      resolveMarkerIconSlug({
        types: [],
        texts: ["Cholera outbreak near hospital"],
        markerKind: "signal",
      }),
    ).toBe("disease");
  });

  it("defaults events without types to sample-event-core", () => {
    expect(resolveMarkerIconSlug({ markerKind: "event" })).toBe(EVENT_MARKER_ICON);
    expect(resolveMarkerIconSlug({ markerKind: "crisis", types: [] })).toBe(EVENT_MARKER_ICON);
  });

  it("defaults signals without clues to movement", () => {
    expect(resolveMarkerIconSlug({ markerKind: "signal" })).toBe(DEFAULT_ICON_SLUG);
  });

  it("covers every DISASTER_META code with a shipped SVG slug", () => {
    const iconsDir = join(process.cwd(), "public/images/ui-kit/signals/icons");
    for (const code of allDisasterTypeCodes()) {
      const slug = resolveMarkerIconSlug({ types: [code], markerKind: "event" });
      expect(GLIDE_TO_SLUG[code], `missing GLIDE_TO_SLUG[${code}]`).toBeTruthy();
      expect(slug).toBe(GLIDE_TO_SLUG[code]);
      expect(
        existsSync(join(iconsDir, `${slug}.svg`)),
        `missing SVG for ${code} → ${slug}`,
      ).toBe(true);
    }
  });
});

describe("signalIconUrl", () => {
  it("points at the ui-kit signals icons folder", () => {
    expect(signalIconUrl("flood")).toBe("/images/ui-kit/signals/icons/flood.svg");
  });
});
