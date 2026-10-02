import { describe, expect, it } from "vitest";
import { canReadContent, canWriteCrisisEvents, isPlatformAdmin } from "./roles";

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

describe("canReadContent", () => {
  it("matches clear-api requireContentReader (admin, analyst or viewer)", () => {
    expect(canReadContent("admin")).toBe(true);
    expect(canReadContent("analyst")).toBe(true);
    expect(canReadContent("viewer")).toBe(true);
    expect(canReadContent("pending")).toBe(false);
    expect(canReadContent("something-new")).toBe(false);
    expect(canReadContent("")).toBe(false);
    expect(canReadContent(null)).toBe(false);
  });
});
