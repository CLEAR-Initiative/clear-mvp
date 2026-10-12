import { describe, expect, it } from "vitest";
import {
  canReadContent,
  canWriteCrisisEvents,
  isEmergencyResponseManager,
  isPlatformAdmin,
} from "./roles";

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

describe("isEmergencyResponseManager", () => {
  it("is true when any membership has the ERM team role", () => {
    expect(
      isEmergencyResponseManager([{ role: "team_member" }, { role: "emergency_response_manager" }]),
    ).toBe(true);
  });

  it("is false with no ERM membership", () => {
    expect(isEmergencyResponseManager([{ role: "team_admin" }, { role: "field_coordinator" }])).toBe(false);
  });

  it("is false for an empty list or no memberships", () => {
    expect(isEmergencyResponseManager([])).toBe(false);
    expect(isEmergencyResponseManager(undefined)).toBe(false);
    expect(isEmergencyResponseManager(null)).toBe(false);
  });
});
