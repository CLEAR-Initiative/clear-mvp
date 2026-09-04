import { describe, expect, it } from "vitest";
import {
  isTeamScopeReady,
  resolveSelectedCountry,
  scopeCountryOptions,
  staleCountryPick,
} from "~/hooks/use-team-country";

/**
 * Detection / map country pick. A team bound to several countries used to
 * pin the Select to the alphabetically first name (Afghanistan), so the
 * dropdown opened but the value never changed.
 *
 * That came from composing two correct pieces wrongly:
 *   options = every scoped country
 *   value   = scoped[0] ?? pick   // "team country wins"
 */
const ALL = ["Afghanistan", "Sudan", "Venezuela (Bolivarian Republic of)"];
const MULTI = ALL;
const SINGLE = ["Sudan"] as const;

describe("scopeCountryOptions", () => {
  it("lists every scoped country for a multi-country team", () => {
    expect(scopeCountryOptions(ALL, MULTI)).toEqual(MULTI);
  });

  it("lists only the bound country for a one-country team", () => {
    expect(scopeCountryOptions(ALL, SINGLE)).toEqual(["Sudan"]);
  });

  it("lists every known country when the team is unscoped", () => {
    expect(scopeCountryOptions(ALL, [])).toEqual(ALL);
  });
});

describe("resolveSelectedCountry", () => {
  it("honours a pick inside a multi-country team scope", () => {
    expect(resolveSelectedCountry(MULTI, "Sudan")).toBe("Sudan");
    expect(resolveSelectedCountry(MULTI, "Venezuela (Bolivarian Republic of)")).toBe(
      "Venezuela (Bolivarian Republic of)",
    );
  });

  it("defaults a multi-country team to the first scoped name when the pick is empty or out of scope", () => {
    expect(resolveSelectedCountry(MULTI, "")).toBe("Afghanistan");
    expect(resolveSelectedCountry(MULTI, "All Countries")).toBe("Afghanistan");
    expect(resolveSelectedCountry(MULTI, "Chad")).toBe("Afghanistan");
  });

  it("pins a single-country team even if something else was picked", () => {
    expect(resolveSelectedCountry(SINGLE, "Afghanistan")).toBe("Sudan");
    expect(resolveSelectedCountry(SINGLE, "")).toBe("Sudan");
  });

  it("uses the pick when the team is unscoped", () => {
    expect(resolveSelectedCountry([], "Sudan")).toBe("Sudan");
    expect(resolveSelectedCountry([], "All Countries")).toBe("All Countries");
    expect(resolveSelectedCountry([], "")).toBe("");
  });

  it("holds the pick while team scope is still loading", () => {
    expect(resolveSelectedCountry([], "Venezuela (Bolivarian Republic of)", false)).toBe(
      "Venezuela (Bolivarian Republic of)",
    );
    expect(resolveSelectedCountry([], "All Countries", false)).toBe("All Countries");
    expect(resolveSelectedCountry(MULTI, "Sudan", false)).toBe("Sudan");
  });
});

describe("isTeamScopeReady", () => {
  it("is false while the teams query is loading or unset", () => {
    expect(isTeamScopeReady({ isLoading: true, teams: undefined, activeTeam: null })).toBe(
      false,
    );
    expect(isTeamScopeReady({ isLoading: false, teams: undefined, activeTeam: null })).toBe(
      false,
    );
  });

  it("is false when teams exist but the active team has not hydrated", () => {
    expect(
      isTeamScopeReady({ isLoading: false, teams: [{ id: "t1" }], activeTeam: null }),
    ).toBe(false);
  });

  it("is true once the active team is known, or the user has no teams", () => {
    expect(
      isTeamScopeReady({ isLoading: false, teams: [{ id: "t1" }], activeTeam: { id: "t1" } }),
    ).toBe(true);
    expect(isTeamScopeReady({ isLoading: false, teams: [], activeTeam: null })).toBe(true);
  });
});

describe("dropdown and value stay in sync", () => {
  it("lets the user select every country the dropdown lists (multi-country team)", () => {
    const options = scopeCountryOptions(ALL, MULTI);
    expect(options.length).toBeGreaterThan(1);

    for (const pick of options) {
      expect(resolveSelectedCountry(MULTI, pick)).toBe(pick);
    }
  });

  it("rejects the Aug 7 pin shortcut that made the Detection select look stale", () => {
    const pick = "Sudan";
    // `selectedCountry = teamCountryName ?? pickedCountry` — teamCountryName
    // is always scoped[0] (alphabetical). That is the shipped bug.
    const pinnedToFirst = MULTI[0] ?? pick;
    expect(pinnedToFirst).toBe("Afghanistan");
    expect(resolveSelectedCountry(MULTI, pick)).not.toBe(pinnedToFirst);
    expect(resolveSelectedCountry(MULTI, pick)).toBe(pick);
  });
});

describe("staleCountryPick", () => {
  it("flags the shipped Detection pin (Sudan picked, Afghanistan shown)", () => {
    expect(
      staleCountryPick({
        options: MULTI,
        picked: "Sudan",
        selected: "Afghanistan",
      }),
    ).toEqual({
      picked: "Sudan",
      selected: "Afghanistan",
      options: [...MULTI],
    });
  });

  it("is silent when the listed pick is honoured", () => {
    expect(
      staleCountryPick({ options: MULTI, picked: "Sudan", selected: "Sudan" }),
    ).toBeNull();
  });

  it("is silent for a one-country pin, an empty pick, or an out-of-scope pick", () => {
    expect(
      staleCountryPick({ options: SINGLE, picked: "Afghanistan", selected: "Sudan" }),
    ).toBeNull();
    expect(
      staleCountryPick({ options: MULTI, picked: "", selected: "Afghanistan" }),
    ).toBeNull();
    expect(
      staleCountryPick({ options: MULTI, picked: "Chad", selected: "Afghanistan" }),
    ).toBeNull();
  });
});
