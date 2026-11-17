import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Loader = typeof import("./load-mapbox-gl");

async function freshLoader(): Promise<Loader> {
  vi.resetModules();
  return import("./load-mapbox-gl");
}

function mapboxScript(): HTMLScriptElement | null {
  return document.head.querySelector('script[src*="mapbox-gl.js"]');
}

const w = window as unknown as { mapboxgl?: unknown };

describe("loadMapboxGL", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    delete w.mapboxgl;
  });

  it("rejects at stage script when the CDN request fails, and retries cleanly", async () => {
    const { loadMapboxGL, MapLoadError } = await freshLoader();
    const first = loadMapboxGL();
    mapboxScript()!.dispatchEvent(new Event("error"));

    const err = await first.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MapLoadError);
    expect((err as InstanceType<typeof MapLoadError>).stage).toBe("script");
    expect(mapboxScript()).toBeNull();

    // The failed attempt is forgotten: the next call adds a fresh script.
    const second = loadMapboxGL();
    w.mapboxgl = { Map: vi.fn() };
    mapboxScript()!.dispatchEvent(new Event("load"));
    await expect(second).resolves.toBe(w.mapboxgl);
  });

  it("rejects at stage script when the script loads but defines nothing", async () => {
    const { loadMapboxGL } = await freshLoader();
    const pending = loadMapboxGL();
    mapboxScript()!.dispatchEvent(new Event("load"));
    await expect(pending).rejects.toMatchObject({ stage: "script" });
  });
});

describe("createMapboxMap", () => {
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
  const loseContext = vi.fn();
  const webglContext = {
    getExtension: (name: string) => (name === "WEBGL_lose_context" ? { loseContext } : null),
  } as unknown as RenderingContext;

  afterEach(() => {
    getContext.mockReset();
    loseContext.mockReset();
  });

  it("fails at stage webgl before calling Mapbox when the browser has no WebGL", async () => {
    getContext.mockReturnValue(null);
    const { createMapboxMap } = await freshLoader();
    const gl = { Map: vi.fn() };

    expect(() => createMapboxMap(gl, {})).toThrow(expect.objectContaining({ stage: "webgl" }));
    expect(gl.Map).not.toHaveBeenCalled();
  });

  it("labels a constructor WebGL failure as webgl and anything else as init", async () => {
    getContext.mockReturnValue(webglContext);
    const { createMapboxMap } = await freshLoader();

    const webglFails = {
      Map: vi.fn(() => {
        throw new Error("Failed to initialize WebGL.");
      }),
    };
    expect(() => createMapboxMap(webglFails, {})).toThrow(expect.objectContaining({ stage: "webgl" }));

    const otherFails = {
      Map: vi.fn(() => {
        throw new Error("Invalid LngLat object");
      }),
    };
    expect(() => createMapboxMap(otherFails, {})).toThrow(expect.objectContaining({ stage: "init" }));
  });

  it("probes WebGL once per page and releases the probe context", async () => {
    getContext.mockReturnValue(webglContext);
    const { createMapboxMap } = await freshLoader();
    const gl = { Map: vi.fn(() => ({})) };

    createMapboxMap(gl, {});
    createMapboxMap(gl, {});

    expect(getContext).toHaveBeenCalledTimes(1);
    expect(loseContext).toHaveBeenCalledTimes(1);
    expect(gl.Map).toHaveBeenCalledTimes(2);
  });

  it("returns the map when Mapbox constructs one", async () => {
    getContext.mockReturnValue(webglContext);
    const { createMapboxMap } = await freshLoader();
    const map = {};
    const gl = { Map: vi.fn(() => map) };
    expect(createMapboxMap(gl, { zoom: 3 })).toBe(map);
    expect(gl.Map).toHaveBeenCalledWith({ zoom: 3 });
  });
});
