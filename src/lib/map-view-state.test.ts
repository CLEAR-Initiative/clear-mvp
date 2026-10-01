import { describe, expect, it } from "vitest";
import {
  MAP_VIEW_STATE_STORAGE_KEY,
  cameraSeedForCountry,
  clearMapViewState,
  isMapViewStateFresh,
  mapReturnHref,
  parseMapViewState,
  readMapViewState,
  writeMapViewState,
  type MapViewStateStorage,
  type MapViewStateV1,
} from "./map-view-state";

function memoryStorage(seed: Record<string, string> = {}): MapViewStateStorage {
  const data = { ...seed };
  return {
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const sample = {
  camera: {
    center: [32.5, 15.5] as [number, number],
    zoom: 6.2,
    pitch: 58,
    bearing: -12,
  },
  baseMapType: "topography" as const,
  openMarkerIds: [42, 7],
};

describe("parseMapViewState", () => {
  it("accepts a valid v1 payload", () => {
    expect(
      parseMapViewState({
        v: 1,
        ...sample,
        savedAt: 1,
      }),
    ).toEqual({
      v: 1,
      ...sample,
      showSeismic: false,
      showRoads: true,
      savedAt: 1,
    });
  });

  it("rejects bad versions / cameras / basemaps", () => {
    expect(parseMapViewState({ v: 2, ...sample, savedAt: 1 })).toBeNull();
    expect(
      parseMapViewState({
        v: 1,
        ...sample,
        baseMapType: "mars",
        savedAt: 1,
      }),
    ).toBeNull();
    expect(
      parseMapViewState({
        v: 1,
        baseMapType: "simple",
        openMarkerIds: [],
        savedAt: 1,
        camera: { center: [1], zoom: 1, pitch: 0, bearing: 0 },
      }),
    ).toBeNull();
  });
});

describe("freshness + storage", () => {
  it("round-trips the seismic activity overlay flag", () => {
    const storage = memoryStorage();
    const now = 1_000_000;
    writeMapViewState({ ...sample, showSeismic: true, savedAt: now }, storage);
    expect(readMapViewState(storage, now + 1000)?.showSeismic).toBe(true);
    expect(
      parseMapViewState({
        v: 1,
        ...sample,
        savedAt: 1,
      })?.showSeismic,
    ).toBe(false);
  });

  it("round-trips the roads overlay flag (missing = on)", () => {
    const storage = memoryStorage();
    const now = 1_000_000;
    writeMapViewState({ ...sample, showRoads: false, savedAt: now }, storage);
    expect(readMapViewState(storage, now + 1000)?.showRoads).toBe(false);
    expect(
      parseMapViewState({
        v: 1,
        ...sample,
        savedAt: 1,
      })?.showRoads,
    ).toBe(true);
  });

  it("writes and reads a fresh snapshot", () => {
    const storage = memoryStorage();
    const now = 1_000_000;
    writeMapViewState({ ...sample, savedAt: now }, storage);
    expect(storage.getItem(MAP_VIEW_STATE_STORAGE_KEY)).toBeTruthy();
    expect(readMapViewState(storage, now + 1000)).toMatchObject(sample);
  });

  it("round-trips the country the camera was framed for", () => {
    const storage = memoryStorage();
    const now = 1_000_000;
    writeMapViewState({ ...sample, country: "Sudan", savedAt: now }, storage);
    expect(readMapViewState(storage, now + 1000)?.country).toBe("Sudan");
  });

  it("drops stale snapshots", () => {
    const storage = memoryStorage();
    const now = 1_000_000;
    writeMapViewState({ ...sample, savedAt: now - 31 * 60 * 1000 }, storage);
    expect(readMapViewState(storage, now)).toBeNull();
    expect(isMapViewStateFresh({ v: 1, ...sample, showSeismic: false, showRoads: true, savedAt: now }, now)).toBe(
      true,
    );
  });

  it("clears storage", () => {
    const storage = memoryStorage();
    writeMapViewState({ ...sample, savedAt: Date.now() }, storage);
    clearMapViewState(storage);
    expect(storage.getItem(MAP_VIEW_STATE_STORAGE_KEY)).toBeNull();
  });
});

describe("cameraSeedForCountry", () => {
  const view = (country?: string): MapViewStateV1 => ({
    v: 1,
    ...sample,
    showSeismic: false,
    showRoads: true,
    savedAt: 1,
    ...(country ? { country } : {}),
  });

  it("keeps the camera when it was saved for the same country", () => {
    expect(cameraSeedForCountry(view("Sudan"), "Sudan")).toEqual(sample.camera);
  });

  it("drops a leftover camera when the pick is a different country", () => {
    expect(cameraSeedForCountry(view("Sudan"), "Venezuela (Bolivarian Republic of)")).toBeNull();
  });

  it("drops a legacy snapshot with no country so the pick can reframe", () => {
    expect(cameraSeedForCountry(view(), "Venezuela (Bolivarian Republic of)")).toBeNull();
  });

  it("keeps the camera for All Countries / missing pick", () => {
    expect(cameraSeedForCountry(view("Sudan"), "All Countries")).toEqual(sample.camera);
    expect(cameraSeedForCountry(view(), null)).toEqual(sample.camera);
  });
});

describe("mapReturnHref", () => {
  it("returns bare /map for detail back (no solo-focus query)", () => {
    expect(mapReturnHref()).toBe("/map");
  });
});
