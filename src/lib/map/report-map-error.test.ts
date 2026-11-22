import { beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({ captureException: (...args: unknown[]) => captureException(...args) }));

import { isExpectedMapError, reportMapError, resetReportedMapErrors } from "./report-map-error";

const liveMap = { _removed: false, style: {} };

describe("isExpectedMapError", () => {
  it("expects any error once the map is gone", () => {
    const err = new TypeError("Cannot read properties of undefined (reading 'getOwnLayer')");
    expect(isExpectedMapError(null, err)).toBe(true);
    expect(isExpectedMapError(undefined, err)).toBe(true);
    expect(isExpectedMapError({ _removed: true, style: {} }, err)).toBe(true);
    expect(isExpectedMapError({ _removed: false, style: undefined }, err)).toBe(true);
  });

  it("expects the style-loading error on a live map", () => {
    expect(isExpectedMapError(liveMap, new Error("Style is not done loading"))).toBe(true);
  });

  it("does not expect any other error on a live map", () => {
    expect(isExpectedMapError(liveMap, new TypeError("this.expression.evaluate is not a function"))).toBe(false);
    expect(isExpectedMapError(liveMap, "boom")).toBe(false);
  });
});

describe("reportMapError", () => {
  beforeEach(() => {
    captureException.mockClear();
    resetReportedMapErrors();
  });

  it("stays silent for the normal cases", () => {
    reportMapError(null, new Error("anything"), "removeLayer");
    reportMapError(liveMap, new Error("Style is not done loading"), "setFilter");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("reports an unexpected error with the site as tag and fingerprint", () => {
    const err = new TypeError("layer 12 is broken");
    reportMapError(liveMap, err, "setFeatureState");

    expect(captureException).toHaveBeenCalledTimes(1);
    const [sent, ctx] = captureException.mock.calls[0]!;
    expect(sent).toBe(err);
    expect(ctx).toMatchObject({
      level: "warning",
      tags: { feature: "map", stage: "swallowed", site: "setFeatureState", handled: "true" },
      fingerprint: ["map-swallowed", "setFeatureState", "TypeError", "layer N is broken"],
    });
  });

  it("wraps a non-Error value", () => {
    reportMapError(liveMap, "boom", "stop");
    const [sent] = captureException.mock.calls[0]!;
    expect(sent).toBeInstanceOf(Error);
    expect((sent as Error).message).toBe("boom");
  });

  it("reports the same failure once, and a different site again", () => {
    for (let i = 0; i < 5; i++) reportMapError(liveMap, new Error("same"), "setFeatureState");
    reportMapError(liveMap, new Error("same"), "setFilter");
    expect(captureException).toHaveBeenCalledTimes(2);
  });

  it("stops after 25 different failures in one session", () => {
    for (let i = 0; i < 40; i++) reportMapError(liveMap, new Error(`failure ${i}`), `site-${i}`);
    expect(captureException).toHaveBeenCalledTimes(25);
  });

  it("never throws, even when reporting fails", () => {
    captureException.mockImplementationOnce(() => {
      throw new Error("sentry down");
    });
    expect(() => reportMapError(liveMap, new Error("x"), "stop")).not.toThrow();
  });
});
