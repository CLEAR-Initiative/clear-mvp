import { describe, expect, it } from "vitest";
import { inviteTeamsLabel } from "./invite-teams";

describe("inviteTeamsLabel", () => {
  it("lists every team on a multi-team invite with its role", () => {
    expect(
      inviteTeamsLabel({
        teams: [
          { team: { id: "t1", name: "Steering Committee" }, teamRole: "team_member" },
          { team: { id: "t2", name: "Sudan Response" }, teamRole: "analyst" },
        ],
        team: null,
        teamRole: null,
      }),
    ).toBe("Steering Committee (team_member), Sudan Response (analyst)");
  });

  it("prefers the teams list over the legacy single team", () => {
    expect(
      inviteTeamsLabel({
        teams: [{ team: { id: "t1", name: "Alpha" }, teamRole: "team_admin" }],
        team: { id: "t9", name: "Old" },
        teamRole: "team_member",
      }),
    ).toBe("Alpha (team_admin)");
  });

  it("falls back to the legacy single team for old invites", () => {
    expect(
      inviteTeamsLabel({ teams: [], team: { id: "t1", name: "Alpha" }, teamRole: null }),
    ).toBe("Alpha (team_member)");
  });

  it("returns null when the invite names no team", () => {
    expect(inviteTeamsLabel({ teams: [], team: null, teamRole: null })).toBeNull();
    expect(inviteTeamsLabel({})).toBeNull();
  });
});
