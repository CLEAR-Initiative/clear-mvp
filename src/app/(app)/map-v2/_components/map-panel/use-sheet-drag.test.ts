import { describe, expect, it } from "vitest";
import { settleSheet } from "./use-sheet-drag";

describe("settleSheet", () => {
  it("raises a slowly released sheet that is less than halfway down", () => {
    expect(settleSheet({ offset: 200, range: 600, velocity: 0.1, idleMs: 0 })).toBe(true);
  });

  it("lowers a slowly released sheet that is more than halfway down", () => {
    expect(settleSheet({ offset: 400, range: 600, velocity: -0.1, idleMs: 0 })).toBe(false);
  });

  it("follows a flick down even when the sheet is still near the top", () => {
    expect(settleSheet({ offset: 50, range: 600, velocity: 0.8, idleMs: 16 })).toBe(false);
  });

  it("follows a flick up even when the sheet is still near its peek", () => {
    expect(settleSheet({ offset: 550, range: 600, velocity: -0.8, idleMs: 16 })).toBe(true);
  });

  it("keeps a sheet dragged down fast, held still, then released above halfway raised", () => {
    expect(settleSheet({ offset: 150, range: 600, velocity: 0.8, idleMs: 400 })).toBe(true);
  });

  it("keeps a sheet dragged up fast, held still, then released below halfway lowered", () => {
    expect(settleSheet({ offset: 450, range: 600, velocity: -0.8, idleMs: 400 })).toBe(false);
  });
});
