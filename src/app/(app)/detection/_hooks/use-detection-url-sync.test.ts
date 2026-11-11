import { describe, expect, it } from "vitest";
import { filtersToParams } from "./use-detection-url-sync";

describe("filtersToParams", () => {
  it("leaves defaults out of the URL", () => {
    expect(
      filtersToParams({
        locIds: [],
        date: "Last 7 days",
        severities: new Set(["critical", "high", "medium", "low"]),
        typeFilters: [],
        sources: null,
      }),
    ).toEqual({ r: null, d: null, s: null, t: null, src: null });
  });

  it("writes places, date key, severities, types and sources", () => {
    expect(
      filtersToParams({
        locIds: ["s-nd", "d-tawila"],
        date: "Last 12 days",
        severities: new Set(["high", "critical"]),
        typeFilters: ["Conflict::battles", "Flood::flood"],
        sources: new Set(["ACLED"]),
      }),
    ).toEqual({ r: "s-nd|d-tawila", d: "c12", s: "critical,high", t: "Conflict::battles|Flood::flood", src: "ACLED" });
  });
});
