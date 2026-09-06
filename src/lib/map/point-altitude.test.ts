import { describe, expect, it, vi } from "vitest";
import {
  formatAltitudeMetres,
  formatAltitudeProbeLabel,
  isPointerOverTerrain,
  samplePointAltitude,
  shouldShowPointAltitude,
  toPointAltitudeResult,
} from "./point-altitude";

describe("shouldShowPointAltitude", () => {
  it("is visible only on Topography", () => {
    expect(shouldShowPointAltitude("topography")).toBe(true);
    expect(shouldShowPointAltitude("simple")).toBe(false);
    expect(shouldShowPointAltitude("satellite")).toBe(false);
  });
});

describe("formatAltitudeMetres / toPointAltitudeResult", () => {
  it("formats approximate whole metres with unit", () => {
    expect(formatAltitudeMetres(412.4)).toBe("412 m");
    expect(formatAltitudeMetres(412.6)).toBe("413 m");
    expect(toPointAltitudeResult(1200.2)).toEqual({
      kind: "ok",
      metres: 1200.2,
      displayMetres: "1200 m",
    });
  });

  it("marks null / non-finite as unavailable", () => {
    expect(toPointAltitudeResult(null)).toEqual({ kind: "unavailable" });
    expect(toPointAltitudeResult(undefined)).toEqual({ kind: "unavailable" });
    expect(toPointAltitudeResult(Number.NaN)).toEqual({ kind: "unavailable" });
  });
});

describe("formatAltitudeProbeLabel", () => {
  it("uses compact metres for the hover probe", () => {
    expect(
      formatAltitudeProbeLabel({
        kind: "ok",
        metres: 412,
        displayMetres: "412 m",
      }),
    ).toBe("412 m");
    expect(formatAltitudeProbeLabel({ kind: "unavailable" })).toBe("—");
  });
});

describe("samplePointAltitude", () => {
  it("queries unexaggerated DEM metres", () => {
    const query = vi.fn(() => 385.2);
    const result = samplePointAltitude(
      { queryTerrainElevation: query },
      32.5,
      15.5,
    );
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith({ lng: 32.5, lat: 15.5 }, { exaggerated: false });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.metres).toBe(385.2);
      expect(result.displayMetres).toBe("385 m");
    }
  });

  it("returns unavailable when map/query missing or null elevation", () => {
    expect(samplePointAltitude(null, 1, 2)).toEqual({ kind: "unavailable" });
    expect(
      samplePointAltitude({ queryTerrainElevation: () => null }, 1, 2),
    ).toEqual({ kind: "unavailable" });
  });
});

describe("isPointerOverTerrain", () => {
  it("is true when project(lngLat) matches the pointer", () => {
    const map = {
      project: vi.fn(() => ({ x: 120, y: 80 })),
    };
    expect(
      isPointerOverTerrain(map, { x: 120, y: 80 }, { lng: 32, lat: 15 }),
    ).toBe(true);
    expect(
      isPointerOverTerrain(map, { x: 122, y: 81 }, { lng: 32, lat: 15 }),
    ).toBe(true);
  });

  it("is false when pitched sky clamps lngLat to the horizon", () => {
    // Pointer in the sky; Mapbox lngLat stuck on the silhouette → large dy.
    const map = {
      project: vi.fn(() => ({ x: 200, y: 340 })),
    };
    expect(
      isPointerOverTerrain(map, { x: 200, y: 40 }, { lng: 32, lat: 15 }),
    ).toBe(false);
  });

  it("defaults to over-terrain when project is unavailable", () => {
    expect(
      isPointerOverTerrain({}, { x: 1, y: 2 }, { lng: 0, lat: 0 }),
    ).toBe(true);
  });
});
