import { describe, expect, it } from "vitest";
import { settleSheet } from "./use-sheet-drag";

describe("settleSheet", () => {
  it("raises a slowly released sheet that is less than halfway down", () => {
    expect(settleSheet({ offset: 200, range: 600, velocity: 0.1 })).toBe(true);
  });

  it("lowers a slowly released sheet that is more than halfway down", () => {
    expect(settleSheet({ offset: 400, range: 600, velocity: -0.1 })).toBe(false);
  });

  it("follows a flick down even when the sheet is still near the top", () => {
    expect(settleSheet({ offset: 50, range: 600, velocity: 0.8 })).toBe(false);
  });

  it("follows a flick up even when the sheet is still near its peek", () => {
    expect(settleSheet({ offset: 550, range: 600, velocity: -0.8 })).toBe(true);
  });
});
