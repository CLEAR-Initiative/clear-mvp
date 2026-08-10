import { describe, expect, it } from "bun:test";
import {
  DEFAULT_ICON_SLUG,
  EVENT_MARKER_ICON,
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

  it("uses the first matching type in the list", () => {
    expect(resolveMarkerIconSlug({ types: ["ot", "eq"] })).toBe("earthquake");
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
});

describe("signalIconUrl", () => {
  it("points at the ui-kit signals icons folder", () => {
    expect(signalIconUrl("flood")).toBe("/images/ui-kit/signals/icons/flood.svg");
  });
});
