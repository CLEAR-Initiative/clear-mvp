import { beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({ captureException: (...args: unknown[]) => captureException(...args) }));

import { reportHandledError } from "./report-handled-error";

describe("reportHandledError", () => {
  beforeEach(() => captureException.mockClear());

  it("sends the error with feature and stage tags, grouped by both", () => {
    const err = new Error("Failed to load Mapbox GL JS");
    reportHandledError(err, { feature: "map", stage: "script", extra: { url: "x" } });

    expect(captureException).toHaveBeenCalledTimes(1);
    const [sent, ctx] = captureException.mock.calls[0]!;
    expect(sent).toBe(err);
    expect(ctx).toMatchObject({
      level: "error",
      tags: { feature: "map", stage: "script", handled: "true" },
      extra: { url: "x", online: true },
      fingerprint: ["handled-error", "map", "script"],
    });
  });

  it("wraps a non-Error value so Sentry still gets a stack", () => {
    reportHandledError("boom", { feature: "map", stage: "init" });
    const [sent] = captureException.mock.calls[0]!;
    expect(sent).toBeInstanceOf(Error);
    expect((sent as Error).message).toBe("boom");
  });
});
