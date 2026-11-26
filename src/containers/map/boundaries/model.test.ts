import { describe, expect, it } from "vitest";

import { boundaryRequest } from "./model";

const sudanAndChad = [{ id: "sd" }, { id: "td" }];

describe("boundaryRequest", () => {
  it("scopes to the pinned country", () => {
    expect(boundaryRequest("districts", { scopeReady: true, countryId: "sd", countries: sudanAndChad })).toEqual({
      level: 2,
      countryId: "sd",
    });
  });

  it("falls back to every country in scope when none is pinned", () => {
    expect(boundaryRequest("state", { scopeReady: true, countryId: null, countries: sudanAndChad })).toEqual({
      level: 1,
      countryIds: ["sd", "td"],
    });
  });

  it("sends nothing for global monitoring", () => {
    expect(boundaryRequest("state", { scopeReady: true, countryId: null, countries: [] })).toBeNull();
  });

  it("sends nothing for global monitoring with a leftover country pick", () => {
    expect(boundaryRequest("state", { scopeReady: true, countryId: "Sudan", countries: [] })).toBeNull();
  });

  it("sends nothing before the scope is ready", () => {
    expect(boundaryRequest("state", { scopeReady: false, countryId: null, countries: [{ id: "sd" }] })).toBeNull();
  });
});
