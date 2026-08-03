import { describe, expect, it, vi } from "vitest";
import {
  formatAltitudeMetres,
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

describe("samplePointAltitude", () => {
  it("queries unexaggerated DEM metres", () => {
    const query = vi.fn(() => 385.2);
    const result = samplePointAltitude(
      { queryTerrainElevation: query },
      32.5,
      15.5,
    );
    expect(query).toHaveBeenCalledWith(
      { lng: 32.5, lat: 15.5 },
      { exaggerated: false },
    );
    expect(result).toEqual({
      kind: "ok",
      metres: 385.2,
      displayMetres: "385 m",
    });
  });

  it("returns unavailable when map/query missing or null elevation", () => {
    expect(samplePointAltitude(null, 1, 2)).toEqual({ kind: "unavailable" });
    expect(
      samplePointAltitude({ queryTerrainElevation: () => null }, 1, 2),
    ).toEqual({ kind: "unavailable" });
  });
});
