import { describe, expect, it } from "vitest";
import { setMapCursor } from "./map-cursor";

describe("setMapCursor", () => {
  it("sets the cursor on a live map's canvas", () => {
    const canvas = document.createElement("canvas");
    setMapCursor({ getCanvas: () => canvas }, "pointer");
    expect(canvas.style.cursor).toBe("pointer");
  });

  it("does nothing once map.remove() has dropped the canvas", () => {
    expect(() => setMapCursor({ getCanvas: () => undefined }, "")).not.toThrow();
  });

  it("does nothing when getCanvas throws or the map is null", () => {
    const throwing = {
      getCanvas: (): HTMLCanvasElement => {
        throw new Error("removed");
      },
    };
    expect(() => setMapCursor(throwing, "")).not.toThrow();
    expect(() => setMapCursor(null, "")).not.toThrow();
  });
});
