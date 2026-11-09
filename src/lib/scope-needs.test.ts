import { describe, expect, it } from "vitest";
import {
  aggregateScopeNeeds,
  districtsInScope,
  needsGeneralSummary,
  sectorPin,
  type DistrictNeeds,
  type RawNeedsLocation,
} from "./scope-needs";

const msna = (sectors: Record<string, { label?: string; score?: number }>) => ({
  type: "msna_severity_082025",
  data: { sectors },
});

const ocha = (
  code: string,
  orgs: { acronym: string; name: string; type: string }[],
  asOf = "2025-08-01",
) => ({
  type: "ocha_3w",
  data: {
    as_of: asOf,
    sectors: [
      {
        code,
        name: code,
        org_count: orgs.length,
        by_type: {},
        organizations: orgs,
      },
    ],
  },
});

function district(partial: Partial<DistrictNeeds> & Pick<DistrictNeeds, "id">): DistrictNeeds {
  return { population: null, msna: null, ocha: null, ...partial };
}

describe("sectorPin", () => {
  it("estimates people in need from the score and leaves gaps empty", () => {
    expect(sectorPin(40, 100_000, false)).toEqual({ pin: 40_000, approx: false });
    expect(sectorPin(50, 100_000, true)).toEqual({ pin: 9_000, approx: true });
    expect(sectorPin(null, 100_000, false).pin).toBeNull();
    expect(sectorPin(40, null, false).pin).toBeNull();
    expect(sectorPin(0, 100_000, false).pin).toBe(0);
  });
});

describe("aggregateScopeNeeds", () => {
  it("sums people in need, keeps the worst SAF label, and merges partners once", () => {
    const result = aggregateScopeNeeds([
      district({
        id: "sheikan",
        population: 100_000,
        msna: { WASH: { label: "Severe", score: 50 }, Health: { label: "Stressed", score: 30 } },
        ocha: {
          as_of: "2025-06-01",
          sectors: [
            {
              code: "WSH",
              name: "WASH",
              org_count: 2,
              by_type: {},
              organizations: [
                { acronym: "NRC", name: "Norwegian Refugee Council", type: "International NGO" },
                { acronym: "UNICEF", name: "UNICEF", type: "United Nations" },
              ],
            },
          ],
        },
      }),
      district({
        id: "umrawaba",
        population: 50_000,
        msna: { WASH: { label: "Catastrophic", score: 80 } },
        ocha: {
          as_of: "2025-08-15",
          sectors: [
            {
              code: "WASH",
              name: "WASH",
              org_count: 2,
              by_type: {},
              organizations: [
                { acronym: "nrc", name: "Norwegian Refugee Council", type: "International NGO" },
                { acronym: "IMC", name: "International Medical Corps", type: "International NGO" },
              ],
            },
          ],
        },
      }),
    ]);

    const wash = result.sectors.find((sector) => sector.key === "wash")!;
    expect(wash.saf).toBe("Catastrophic");
    expect(wash.pin).toBe(90_000);
    expect(wash.ocha?.org_count).toBe(3);
    expect(wash.ocha?.organizations?.map((org) => org.acronym).sort()).toEqual(["IMC", "NRC", "UNICEF"]);
    expect(result.ochaAsOf).toBe("2025-08-15");

    const health = result.sectors.find((sector) => sector.key === "health")!;
    expect(health.pin).toBe(30_000);
    expect(health.ocha).toBeNull();

    const education = result.sectors.find((sector) => sector.key === "education")!;
    expect(education.pin).toBeNull();
    expect(education.saf).toBeNull();
    expect(education.hasMsna).toBe(false);
  });

  it("does not count the same district twice", () => {
    const row = district({
      id: "sheikan",
      population: 10_000,
      msna: { Health: { label: "Severe", score: 50 } },
    });
    expect(aggregateScopeNeeds([row, row]).sectors.find((sector) => sector.key === "health")?.pin).toBe(5_000);
  });
});

describe("districtsInScope", () => {
  const sheikan: RawNeedsLocation = {
    id: "sheikan",
    level: 2,
    population: "100000",
    ancestorIds: ["sdn", "nk"],
    metadata: [msna({ WASH: { label: "Severe", score: 40 } }), ocha("WSH", [{ acronym: "NRC", name: "NRC", type: "International NGO" }])],
  };
  const kassala: RawNeedsLocation = {
    id: "kassala",
    level: 2,
    population: "80000",
    ancestorIds: ["sdn", "ks"],
    metadata: [msna({ WASH: { label: "Minimal", score: 10 } })],
  };

  it("expands a country to its districts and ignores other countries", () => {
    const districts = districtsInScope([{ id: "sdn", level: 0 }], [sheikan, kassala, { ...kassala, id: "kabul", ancestorIds: ["afg"] }]);
    expect(districts.map((row) => row.id).sort()).toEqual(["kassala", "sheikan"]);
    const wash = aggregateScopeNeeds(districts).sectors.find((sector) => sector.key === "wash")!;
    expect(wash.pin).toBe(48_000);
    expect(wash.saf).toBe("Severe");
  });

  it("uses a locality's district once, and does not fetch sibling districts", () => {
    const locality: RawNeedsLocation = {
      id: "el-obeid",
      level: 3,
      ancestors: [sheikan],
    };
    const districts = districtsInScope([locality, locality], []);
    expect(districts).toHaveLength(1);
    expect(districts[0]?.id).toBe("sheikan");
    expect(aggregateScopeNeeds(districts).sectors.find((sector) => sector.key === "wash")?.pin).toBe(40_000);
  });

  it("keeps a created multi-district scope to the districts that were asked for", () => {
    const districts = districtsInScope([sheikan], [kassala]);
    expect(districts.map((row) => row.id)).toEqual(["sheikan"]);
  });
});

describe("needsGeneralSummary", () => {
  it("keeps a prose summary or a bullet list and drops blanks", () => {
    expect(needsGeneralSummary({ generalSummary: "  Needs are acute.  " })).toBe("Needs are acute.");
    expect(needsGeneralSummary({ generalSummary: [" Water ", "", 3] })).toEqual(["Water"]);
    expect(needsGeneralSummary({ generalSummary: "  " })).toBeNull();
    expect(needsGeneralSummary(null)).toBeNull();
  });
});
