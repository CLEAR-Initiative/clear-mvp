import { describe, expect, it } from "vitest";
import { canWriteCrisisEvents, isPlatformAdmin } from "./roles";

describe("isPlatformAdmin", () => {
  it("is true only for the global admin role", () => {
    expect(isPlatformAdmin("admin")).toBe(true);
    expect(isPlatformAdmin("analyst")).toBe(false);
    expect(isPlatformAdmin("viewer")).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
  });
});

describe("canWriteCrisisEvents", () => {
  it("matches clear-api addEventToCrisis (admin or analyst)", () => {
    expect(canWriteCrisisEvents("admin")).toBe(true);
    expect(canWriteCrisisEvents("analyst")).toBe(true);
    expect(canWriteCrisisEvents("viewer")).toBe(false);
    expect(canWriteCrisisEvents("pending")).toBe(false);
    expect(canWriteCrisisEvents(undefined)).toBe(false);
  });
});
