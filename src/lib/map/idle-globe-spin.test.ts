import { describe, expect, it, vi } from "vitest";
import {
  ensureGlobeProjection,
  type IdleGlobeSpinMap,
} from "./idle-globe-spin";

describe("ensureGlobeProjection", () => {
  it("sets globe once and is a no-op when already globe", () => {
    let name = "mercator";
    const setProjection = vi.fn((p: string | { name: string }) => {
      name = typeof p === "string" ? p : p.name;
    });
    const map: IdleGlobeSpinMap = {
      getProjection: () => ({ name }),
      setProjection,
    };

    ensureGlobeProjection(map);
    ensureGlobeProjection(map);

    expect(setProjection).toHaveBeenCalledTimes(1);
    expect(setProjection).toHaveBeenCalledWith("globe");
  });

  it("does not throw when map methods are missing", () => {
    const map: IdleGlobeSpinMap = {};
    expect(() => ensureGlobeProjection(map)).not.toThrow();
  });

  it("handles string projection format", () => {
    const setProjection = vi.fn();
    const map: IdleGlobeSpinMap = {
      getProjection: () => "mercator",
      setProjection,
    };

    ensureGlobeProjection(map);

    expect(setProjection).toHaveBeenCalledWith("globe");
  });

  it("no-op when already globe projection (string)", () => {
    const setProjection = vi.fn();
    const map: IdleGlobeSpinMap = {
      getProjection: () => "globe",
      setProjection,
    };

    ensureGlobeProjection(map);

    expect(setProjection).not.toHaveBeenCalled();
  });
});
