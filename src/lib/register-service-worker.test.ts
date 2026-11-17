import { describe, expect, it, vi } from "vitest";

vi.mock("~/lib/report-handled-error", () => ({ reportHandledError: vi.fn() }));

import {
  isBenignRegistrationError,
  registerServiceWorker,
} from "./register-service-worker";

function domError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

// Messages as GlitchTip received them from prod (clear-app issues 28, 31, 237).
const invalidState = domError(
  "SecurityError",
  "Failed to register a ServiceWorker: The document is in an invalid state.",
);
const fetchFailed = new TypeError(
  "Failed to register a ServiceWorker for scope ('https://app.clearinitiative.io/') with script ('https://app.clearinitiative.io/sw.js'): An unknown error occurred when fetching the script.",
);
const notFound = new TypeError(
  "Failed to register a ServiceWorker for scope ('https://app.clearinitiative.io/') with script ('https://app.clearinitiative.io/sw.js'): A bad HTTP response code (404) was received when fetching the script.",
);

describe("isBenignRegistrationError", () => {
  it("treats a refused document as benign", () => {
    expect(isBenignRegistrationError(invalidState)).toBe(true);
  });

  it("treats a page unloading mid-registration as benign", () => {
    expect(isBenignRegistrationError(domError("InvalidStateError", "x"))).toBe(true);
    expect(isBenignRegistrationError(domError("AbortError", "x"))).toBe(true);
  });

  it("treats a network failure fetching sw.js as benign", () => {
    expect(isBenignRegistrationError(fetchFailed)).toBe(true);
  });

  it("keeps a bad HTTP status for sw.js", () => {
    expect(isBenignRegistrationError(notFound)).toBe(false);
  });

  it("keeps a script that throws while installing", () => {
    expect(
      isBenignRegistrationError(
        new TypeError("ServiceWorker script evaluation failed"),
      ),
    ).toBe(false);
  });

  it("keeps anything that is not an Error", () => {
    expect(isBenignRegistrationError("nope")).toBe(false);
  });
});

describe("registerServiceWorker", () => {
  it("does nothing without a workbox", async () => {
    const report = vi.fn();
    await registerServiceWorker(undefined, report);
    expect(report).not.toHaveBeenCalled();
  });

  it("registers", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const report = vi.fn();
    await registerServiceWorker({ register }, report);
    expect(register).toHaveBeenCalledOnce();
    expect(report).not.toHaveBeenCalled();
  });

  it("swallows a benign failure instead of rejecting", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const report = vi.fn();
    await expect(
      registerServiceWorker({ register: () => Promise.reject(invalidState) }, report),
    ).resolves.toBeUndefined();
    expect(report).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("reports a real failure with the pwa feature tag", async () => {
    const report = vi.fn();
    await expect(
      registerServiceWorker({ register: () => Promise.reject(notFound) }, report),
    ).resolves.toBeUndefined();
    expect(report).toHaveBeenCalledWith(notFound, { feature: "pwa", stage: "register" });
  });
});
