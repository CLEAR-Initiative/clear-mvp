import { describe, expect, it } from "vitest";
import { WORLD_VIEW } from "~/lib/constants/country-config";
import {
  browseMapCamera,
  framedCountryAfterFocusChange,
  shouldSkipCountryFit,
  worldPickFlyDuration,
} from "./country-picker-camera";

const SUDAN: [number, number] = [30, 15.5];
const AFGHANISTAN: [number, number] = [67.7, 33.9];

const getCenter = (name: string): [number, number] =>
  name === "Sudan" ? SUDAN : name === "Afghanistan" ? AFGHANISTAN : WORLD_VIEW.center;
const getZoom = (name: string): number =>
  name === "Sudan" ? 5 : name === "Afghanistan" ? 5.5 : WORLD_VIEW.zoom;

describe("shouldSkipCountryFit", () => {
  it("skips a repeat frame of the same country (live pans must not yank back)", () => {
    expect(
      shouldSkipCountryFit({
        prevFramedKey: "Sudan",
        nextFramedKey: "Sudan",
        nonceBumped: false,
      }),
    ).toBe(true);
  });

  it("refits when the pick changes to another country", () => {
    expect(
      shouldSkipCountryFit({
        prevFramedKey: "Sudan",
        nextFramedKey: "Afghanistan",
        nonceBumped: false,
      }),
    ).toBe(false);
  });

  it("refits Sudan after All Countries cleared the last frame", () => {
    expect(
      shouldSkipCountryFit({
        prevFramedKey: undefined,
        nextFramedKey: "Sudan",
        nonceBumped: false,
      }),
    ).toBe(false);
  });

  it("does not country-fit while All Countries (no next key)", () => {
    expect(
      shouldSkipCountryFit({
        prevFramedKey: "Sudan",
        nextFramedKey: undefined,
        nonceBumped: false,
      }),
    ).toBe(true);
  });

  it("a nonce bump always refits even the same country", () => {
    expect(
      shouldSkipCountryFit({
        prevFramedKey: "Sudan",
        nextFramedKey: "Sudan",
        nonceBumped: true,
      }),
    ).toBe(false);
  });
});

describe("framedCountryAfterFocusChange", () => {
  it("clears the skip memory when leaving a country for All Countries", () => {
    expect(framedCountryAfterFocusChange(undefined)).toBeUndefined();
  });

  it("keeps the country key while focused", () => {
    expect(framedCountryAfterFocusChange("Sudan")).toBe("Sudan");
  });
});

describe("browseMapCamera", () => {
  it("frames the picked country", () => {
    expect(
      browseMapCamera({
        selectedCountry: "Sudan",
        lastFocusedCountry: "Sudan",
        getCenter,
        getZoom,
      }),
    ).toEqual({ center: SUDAN, zoom: 5 });
  });

  it("zooms out to WORLD_VIEW zoom while keeping the last country centered", () => {
    expect(
      browseMapCamera({
        selectedCountry: "All Countries",
        lastFocusedCountry: "Sudan",
        getCenter,
        getZoom,
      }),
    ).toEqual({ center: SUDAN, zoom: WORLD_VIEW.zoom });
  });

  it("uses WORLD_VIEW center when All Countries has no prior country", () => {
    expect(
      browseMapCamera({
        selectedCountry: "All Countries",
        lastFocusedCountry: null,
        getCenter,
        getZoom,
      }),
    ).toEqual({ center: WORLD_VIEW.center, zoom: WORLD_VIEW.zoom });
  });
});

describe("worldPickFlyDuration", () => {
  it("is 20% slower than the current fly", () => {
    expect(worldPickFlyDuration(650)).toBe(780);
    expect(worldPickFlyDuration(1500)).toBe(1800);
  });
});
