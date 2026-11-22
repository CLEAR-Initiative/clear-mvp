import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const failE2ETest = vi.fn();
vi.mock("~/lib/e2e/e2e-hooks", () => ({ failE2ETest: (...args: unknown[]) => failE2ETest(...args) }));

const reportHandledError = vi.fn();
vi.mock("~/lib/report-handled-error", () => ({
  reportHandledError: (...args: unknown[]) => reportHandledError(...args),
}));

import { PRESENCE_LINE_OPACITY, presenceFillOpacity } from "~/components/map/nrc-presence";
import { UnsafePaintChangeError, paintChangeProblem, readsFeatureState, setPaintPropertySafe } from "./safe-paint";

const HOVER = ["boolean", ["feature-state", "hover"], false];
const HOVER_FILL = ["case", HOVER, 0.62, 0.42];
const DATA_FILL = ["case", ["==", ["get", "iso"], "SD"], 0.26, 0.08];

function fakeMap(current: unknown) {
  const paint: Record<string, unknown> = { "line-opacity": current };
  return {
    paint,
    getPaintProperty: (_layer: string, name: string) => paint[name],
    setPaintProperty: vi.fn((_layer: string, name: string, value: unknown) => {
      paint[name] = value;
    }),
  };
}

describe("readsFeatureState", () => {
  it("finds feature-state at any depth", () => {
    expect(readsFeatureState(HOVER_FILL)).toBe(true);
    expect(readsFeatureState(["interpolate", ["linear"], ["zoom"], 2, ["case", HOVER, 1, 0], 4, 1])).toBe(true);
  });

  it("is false for constants and for expressions without feature-state", () => {
    expect(readsFeatureState(0)).toBe(false);
    expect(readsFeatureState("#fff")).toBe(false);
    expect(readsFeatureState(undefined)).toBe(false);
    expect(readsFeatureState([3, 2])).toBe(false);
    expect(readsFeatureState(DATA_FILL)).toBe(false);
  });
});

describe("paintChangeProblem", () => {
  it("rejects feature-state expression to constant", () => {
    expect(paintChangeProblem(HOVER_FILL, 0)).toMatch(/feature-state/);
  });

  it("rejects feature-state expression to an expression without feature-state", () => {
    expect(paintChangeProblem(HOVER_FILL, DATA_FILL)).not.toBeNull();
  });

  it("allows expression to expression, constant to constant and constant to expression", () => {
    expect(paintChangeProblem(HOVER_FILL, ["case", HOVER, 1, 0])).toBeNull();
    expect(paintChangeProblem(0.35, 0)).toBeNull();
    expect(paintChangeProblem(0, HOVER_FILL)).toBeNull();
    expect(paintChangeProblem(undefined, 0.5)).toBeNull();
  });

  it("rejects the change that caused GlitchTip prod #912", () => {
    // clear-mvp #347 set the presence border line-opacity to 0 on selection.
    expect(paintChangeProblem(PRESENCE_LINE_OPACITY, 0)).not.toBeNull();
  });

  it("allows the presence fill in both directions", () => {
    expect(paintChangeProblem(presenceFillOpacity(null), presenceFillOpacity("SD"))).toBeNull();
    expect(paintChangeProblem(presenceFillOpacity("SD"), presenceFillOpacity(null))).toBeNull();
  });
});

describe("setPaintPropertySafe", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reportHandledError.mockClear();
    failE2ETest.mockClear();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    vi.unstubAllEnvs();
  });

  it("sets a safe value", () => {
    const map = fakeMap(0.35);
    setPaintPropertySafe(map, "line", "line-opacity", 0);
    expect(map.setPaintProperty).toHaveBeenCalledWith("line", "line-opacity", 0);
    expect(reportHandledError).not.toHaveBeenCalled();
  });

  it("outside production: reports, throws with the layer and property, and does not set", () => {
    const map = fakeMap(HOVER_FILL);
    expect(() => setPaintPropertySafe(map, "nrc-presence-line", "line-opacity", 0)).toThrow(UnsafePaintChangeError);
    expect(() => setPaintPropertySafe(map, "nrc-presence-line", "line-opacity", 0)).toThrow(
      /layer "nrc-presence-line", property "line-opacity"/,
    );
    expect(map.setPaintProperty).not.toHaveBeenCalled();
    expect(reportHandledError).toHaveBeenCalledWith(
      expect.any(UnsafePaintChangeError),
      expect.objectContaining({ feature: "map", stage: "paint-guard" }),
    );
  });

  it("hands an unsafe change to the E2E hook, and a safe one never", () => {
    vi.stubEnv("NODE_ENV", "production");
    setPaintPropertySafe(fakeMap(0.35), "line", "line-opacity", 0);
    expect(failE2ETest).not.toHaveBeenCalled();
    setPaintPropertySafe(fakeMap(HOVER_FILL), "line", "line-opacity", 0);
    expect(failE2ETest).toHaveBeenCalledWith(expect.any(UnsafePaintChangeError));
  });

  it("in production: reports and still sets the value", () => {
    vi.stubEnv("NODE_ENV", "production");
    const map = fakeMap(HOVER_FILL);
    expect(() => setPaintPropertySafe(map, "line", "line-opacity", 0)).not.toThrow();
    expect(map.setPaintProperty).toHaveBeenCalledWith("line", "line-opacity", 0);
    expect(reportHandledError).toHaveBeenCalledTimes(1);
  });

  it("sets the value when the map cannot report the current one", () => {
    const setPaintProperty = vi.fn();
    setPaintPropertySafe({ setPaintProperty }, "line", "line-opacity", 0);
    expect(setPaintProperty).toHaveBeenCalledWith("line", "line-opacity", 0);
  });
});
