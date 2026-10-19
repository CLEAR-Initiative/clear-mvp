import { describe, expect, it } from "vitest";
import {
  canDecideCaseProposals,
  canManageAnalyses,
  canReadContent,
  canWriteCrisisEvents,
  isEmergencyResponseManager,
  isPlatformAdmin,
  isTeamAnalyst,
} from "./roles";

const teamAnalyst = [{ role: "team_member" }, { role: "analyst" }];
const noAnalyst = [{ role: "team_member" }, { role: "team_admin" }];

describe("isPlatformAdmin", () => {
  it("is true only for the global admin role", () => {
    expect(isPlatformAdmin("admin")).toBe(true);
    expect(isPlatformAdmin("analyst")).toBe(false);
    expect(isPlatformAdmin("member")).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
  });
});

describe("isTeamAnalyst", () => {
  it("is true when any membership has the team analyst role", () => {
    expect(isTeamAnalyst(teamAnalyst)).toBe(true);
  });

  it("is false with no analyst membership, empty, or missing", () => {
    expect(isTeamAnalyst(noAnalyst)).toBe(false);
    expect(isTeamAnalyst([])).toBe(false);
    expect(isTeamAnalyst(undefined)).toBe(false);
    expect(isTeamAnalyst(null)).toBe(false);
  });
});

describe.each([
  ["canWriteCrisisEvents", canWriteCrisisEvents],
  ["canManageAnalyses", canManageAnalyses],
  ["canDecideCaseProposals", canDecideCaseProposals],
] as const)("%s (admin or team analyst)", (_name, fn) => {
  it("admits a platform admin regardless of memberships", () => {
    expect(fn("admin")).toBe(true);
    expect(fn("admin", noAnalyst)).toBe(true);
  });

  it("admits a team analyst", () => {
    expect(fn("member", teamAnalyst)).toBe(true);
  });

  it("refuses a member with no analyst membership", () => {
    expect(fn("member", noAnalyst)).toBe(false);
    expect(fn("member")).toBe(false);
    expect(fn("pending", teamAnalyst)).toBe(true); // analyst membership still wins
    expect(fn(undefined)).toBe(false);
  });
});

describe("canReadContent", () => {
  it("matches clear-api requireContentReader (admin or member)", () => {
    expect(canReadContent("admin")).toBe(true);
    expect(canReadContent("member")).toBe(true);
    expect(canReadContent("analyst")).toBe(false);
    expect(canReadContent("viewer")).toBe(false);
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
    expect(isEmergencyResponseManager([{ role: "team_admin" }, { role: "analyst" }])).toBe(false);
  });

  it("is false for an empty list or no memberships", () => {
    expect(isEmergencyResponseManager([])).toBe(false);
    expect(isEmergencyResponseManager(undefined)).toBe(false);
    expect(isEmergencyResponseManager(null)).toBe(false);
  });
});
