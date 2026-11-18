import { describe, expect, it } from "vitest";
import { signalsWindow } from "./use-signals-window";

describe("signalsWindow", () => {
  it("starts at local midnight 30 days back and has no end", () => {
    const range = signalsWindow(new Date(2026, 10, 17, 15, 42));

    expect(range).toEqual({ from: new Date(2026, 9, 18).toISOString() });
  });
});
