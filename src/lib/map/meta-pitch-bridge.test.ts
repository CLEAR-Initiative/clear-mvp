import { describe, expect, it, vi } from "vitest";
import { bridgeMetaToCtrlForPitch } from "./meta-pitch-bridge";

describe("bridgeMetaToCtrlForPitch", () => {
  it("promotes metaKey mousedown to ctrlKey for Mapbox handlers", () => {
    const canvas = document.createElement("div");
    const dispose = bridgeMetaToCtrlForPitch(canvas);

    const event = new MouseEvent("mousedown", {
      bubbles: true,
      metaKey: true,
      ctrlKey: false,
    });
    let sawCtrl = false;
    canvas.addEventListener(
      "mousedown",
      (e) => {
        sawCtrl = e.ctrlKey;
      },
      false,
    );

    canvas.dispatchEvent(event);
    expect(sawCtrl).toBe(true);

    dispose();
  });

  it("leaves plain mousedown without meta untouched", () => {
    const canvas = document.createElement("div");
    const dispose = bridgeMetaToCtrlForPitch(canvas);

    const event = new MouseEvent("mousedown", {
      bubbles: true,
      metaKey: false,
      ctrlKey: false,
    });
    const spy = vi.fn();
    canvas.addEventListener("mousedown", (e) => {
      spy(e.ctrlKey);
    });
    canvas.dispatchEvent(event);
    expect(spy).toHaveBeenCalledWith(false);

    dispose();
  });
});
