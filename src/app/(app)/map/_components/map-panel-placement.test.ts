import { describe, expect, it } from "vitest";
import {
  PANEL_GAP,
  PANEL_MARGIN,
  panelCoversPin,
  placeDetectionPreview,
  placeNearMarker,
} from "./map-panel-placement";

const panel = { width: 320, height: 300 };
const parent = { width: 1200, height: 800 };

describe("placeNearMarker", () => {
  it("places to the right of a left-half pin without covering it", () => {
    const anchor = { x: 200, y: 400 };
    const pos = placeNearMarker(anchor, parent, panel);
    expect(pos.left).toBe(anchor.x + PANEL_GAP);
    expect(
      panelCoversPin({ ...pos, ...panel }, anchor),
    ).toBe(false);
  });

  it("places to the left of a right-half pin without covering it", () => {
    const anchor = { x: 1000, y: 400 };
    const pos = placeNearMarker(anchor, parent, panel);
    expect(pos.left + panel.width).toBe(anchor.x - PANEL_GAP);
    expect(
      panelCoversPin({ ...pos, ...panel }, anchor),
    ).toBe(false);
  });

  it("does not slide over a pin near the right edge when clamping", () => {
    // Preferred "left of pin" fits; clamping must not pull it onto the pin.
    const anchor = { x: 1100, y: 400 };
    const pos = placeNearMarker(anchor, parent, panel);
    expect(
      panelCoversPin({ ...pos, ...panel }, anchor),
    ).toBe(false);
    expect(pos.left + panel.width).toBeLessThanOrEqual(anchor.x - PANEL_GAP + 0.01);
  });

  it("falls back below the pin when both sides are too tight", () => {
    const narrow = { width: 360, height: 800 };
    const anchor = { x: 180, y: 200 };
    const pos = placeNearMarker(anchor, narrow, panel);
    expect(
      panelCoversPin({ ...pos, ...panel }, anchor),
    ).toBe(false);
    // Below or above — vertically clear of the pin exclusion.
    const clearVertically =
      pos.top >= anchor.y + PANEL_GAP ||
      pos.top + panel.height <= anchor.y - PANEL_GAP;
    const clearHorizontally =
      pos.left >= anchor.x + PANEL_GAP ||
      pos.left + panel.width <= anchor.x - PANEL_GAP;
    expect(clearVertically || clearHorizontally).toBe(true);
  });
});

describe("placeDetectionPreview", () => {
  const area = { width: 640, height: 700 };
  const corner = { left: area.width - panel.width - PANEL_MARGIN, top: area.height - panel.height - PANEL_MARGIN };

  it("uses the clear bottom-right corner at 640px of usable space", () => {
    expect(placeDetectionPreview({ x: 90, y: 200 }, area, panel)).toEqual(corner);
  });

  it("places beside the pin when the corner would cover it", () => {
    const anchor = { x: 520, y: 600 };
    const position = placeDetectionPreview(anchor, area, panel);
    expect(position).toEqual(placeNearMarker(anchor, area, panel));
    expect(panelCoversPin({ ...position, ...panel }, anchor)).toBe(false);
  });

  it("prefers the pin below the width threshold, even with an empty corner", () => {
    const narrow = { ...area, width: 639 };
    const anchor = { x: 90, y: 200 };
    expect(placeDetectionPreview(anchor, narrow, panel)).toEqual(placeNearMarker(anchor, narrow, panel));
  });

  it("opens in the corner when the marker has no visible map point", () => {
    expect(placeDetectionPreview(null, area, panel)).toEqual(corner);
  });
});
