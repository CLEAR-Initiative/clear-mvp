import { afterEach, describe, expect, it, vi } from "vitest";
import { exposeMapForE2E, failE2ETest, isE2EBuild } from "./e2e-hooks";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  delete window.__clearE2EMap;
});

describe("outside the E2E build", () => {
  it("exposes nothing and schedules no throw", () => {
    vi.useFakeTimers();
    expect(isE2EBuild()).toBe(false);
    exposeMapForE2E({ id: "map" });
    failE2ETest(new Error("x"));
    expect(window.__clearE2EMap).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("in the E2E build", () => {
  it("exposes the map and removes it again", () => {
    vi.stubEnv("NEXT_PUBLIC_E2E", "1");
    const map = { id: "map" };
    exposeMapForE2E(map);
    expect(window.__clearE2EMap).toBe(map);
    exposeMapForE2E(null);
    expect(window.__clearE2EMap).toBeUndefined();
  });

  it("rethrows a reported error outside the caller's try block", () => {
    vi.stubEnv("NEXT_PUBLIC_E2E", "1");
    vi.useFakeTimers();
    const error = new Error("unsafe paint change");
    expect(() => failE2ETest(error)).not.toThrow();
    expect(() => vi.runAllTimers()).toThrow(error);
  });
});
