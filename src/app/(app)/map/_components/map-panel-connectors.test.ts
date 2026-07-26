import { describe, expect, it } from "vitest";
import { panelAttachmentPoint } from "./map-panel-connectors";

describe("panelAttachmentPoint", () => {
  const panel = { left: 100, top: 80, width: 320, height: 300 };

  it("attaches to the left edge at vertical center when the pin is to the left", () => {
    expect(panelAttachmentPoint({ x: 40, y: 120 }, panel)).toEqual({
      x: 100,
      y: 230,
    });
  });

  it("attaches to the right edge at vertical center when the pin is to the right", () => {
    expect(panelAttachmentPoint({ x: 500, y: 40 }, panel)).toEqual({
      x: 420,
      y: 230,
    });
  });
});
