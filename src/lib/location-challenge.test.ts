import { describe, expect, it } from "vitest";
import {
  canFileLocationChallenge,
  challengeErrorKey,
  locationChain,
  movedFromSource,
  placeNameFromLabel,
  placementInTeamArea,
  roleOnTeam,
} from "./location-challenge";

const TEAM = {
  members: [
    { user: { id: "u-analyst" }, role: "analyst" },
    { user: { id: "u-admin" }, role: "team_admin" },
  ],
};

describe("roleOnTeam", () => {
  it("is the user's role on the team, or null", () => {
    expect(roleOnTeam(TEAM, "u-analyst")).toBe("analyst");
    expect(roleOnTeam(TEAM, "u-other")).toBeNull();
    expect(roleOnTeam(null, "u-analyst")).toBeNull();
    expect(roleOnTeam(TEAM, null)).toBeNull();
  });
});

describe("canFileLocationChallenge", () => {
  it("lets the active team's analysts and platform admins file", () => {
    expect(canFileLocationChallenge("member", "analyst")).toBe(true);
    expect(canFileLocationChallenge("admin", null)).toBe(true);
  });

  it.each(["team_admin", "team_member", "emergency_response_manager", null])(
    "refuses a team %s",
    (role) => {
      expect(canFileLocationChallenge("member", role)).toBe(false);
    },
  );
});

describe("placementInTeamArea", () => {
  const placement = { id: "D1", ancestors: [{ id: "S1" }, { id: "C1" }] };

  it("is true when the place or an ancestor is one of the team's locations", () => {
    expect(placementInTeamArea(placement, [{ id: "S1" }])).toBe(true);
    expect(placementInTeamArea(placement, [{ id: "D1" }])).toBe(true);
  });

  it("is false outside them, and with no place", () => {
    expect(placementInTeamArea(placement, [{ id: "D9" }])).toBe(false);
    expect(placementInTeamArea(null, [{ id: "D1" }])).toBe(false);
  });

  it("is true for a team with no locations (global monitoring)", () => {
    expect(placementInTeamArea(placement, [])).toBe(true);
    expect(placementInTeamArea(placement, null)).toBe(true);
  });
});

describe("locationChain", () => {
  it("reads most specific first, without repeating a name", () => {
    expect(
      locationChain({
        name: "Nyala",
        level: 2,
        ancestors: [
          { name: "Sudan", level: 0 },
          { name: "South Darfur", level: 1 },
        ],
      }),
    ).toBe("Nyala, South Darfur, Sudan");
    expect(
      locationChain({ name: "Khartoum", level: 2, ancestors: [{ name: "Khartoum", level: 1 }] }),
    ).toBe("Khartoum");
    expect(locationChain(null)).toBeNull();
  });
});

describe("placeNameFromLabel", () => {
  it("takes the place's own name from a geocoder label", () => {
    expect(placeNameFromLabel("Haya, Red Sea, Sudan")).toBe("Haya");
    expect(placeNameFromLabel("Kassala")).toBe("Kassala");
  });
});

describe("movedFromSource", () => {
  it("treats the source pin's own coordinates as no move", () => {
    expect(movedFromSource(12.05, 24.88, 12.05, 24.88)).toBe(false);
    expect(movedFromSource(12.06, 24.88, 12.05, 24.88)).toBe(true);
  });

  it("counts any point as moved when there is no source pin", () => {
    expect(movedFromSource(12.05, 24.88, undefined, undefined)).toBe(true);
  });
});

describe("challengeErrorKey", () => {
  it("names the message for clear-api's error", () => {
    expect(challengeErrorKey("FORBIDDEN")).toBe("errors.forbidden");
    expect(challengeErrorKey("BAD_REQUEST")).toBe("errors.outsideCoverage");
    expect(challengeErrorKey("CONFLICT")).toBe("errors.conflict");
    expect(challengeErrorKey("INTERNAL_SERVER_ERROR")).toBe("errors.submitFailed");
    expect(challengeErrorKey(undefined)).toBe("errors.submitFailed");
  });
});
