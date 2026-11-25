import { describe, expect, it } from "vitest";
import { areaPopulationOf, formatIdp, idpPerCapitaOf } from "./area-context";

const dtm = (displaced: unknown) => [{ type: "iom_dtm_displacement", data: { population_displaced: displaced } }];

describe("areaPopulationOf", () => {
  it("prefers the district, then the state, then the country", () => {
    const location = {
      name: "Kadugli town",
      level: 3,
      population: "900",
      ancestors: [
        { id: "sd", name: "Sudan", level: 0, population: "50000000" },
        { id: "sk", name: "South Kordofan", level: 1, population: "2000000" },
      ],
    };

    expect(areaPopulationOf(location)).toEqual({ name: "South Kordofan", value: "2000000" });
  });

  it("is null without a location or any population", () => {
    expect(areaPopulationOf(null)).toBeNull();
    expect(areaPopulationOf({ name: "Kadugli", level: 2 })).toBeNull();
  });
});

describe("idpPerCapitaOf", () => {
  it("divides the most local displacement figure by that area's population", () => {
    const location = { name: "Kadugli", level: 2, population: "1000", metadata: dtm(32) };

    expect(idpPerCapitaOf(location)).toEqual({ displaced: 32, population: 1000, ratio: 0.032, name: "Kadugli" });
  });

  it("skips an area whose displacement figure is not a number", () => {
    const location = {
      name: "Kadugli",
      level: 2,
      metadata: dtm("many"),
      ancestors: [{ id: "sk", name: "South Kordofan", level: 1, metadata: dtm(500) }],
    };

    expect(idpPerCapitaOf(location)).toEqual({ displaced: 500, population: null, ratio: null, name: "South Kordofan" });
  });
});

describe("formatIdp", () => {
  const count = (value: number) => `${value} people`;

  it("shows a percentage to one decimal", () => {
    expect(formatIdp({ displaced: 32, population: 1000, ratio: 0.032, name: "Kadugli" }, count)).toBe("3.2%");
  });

  it("shows the displaced count when the area has no population", () => {
    expect(formatIdp({ displaced: 500, population: null, ratio: null, name: "Kadugli" }, count)).toBe("500 people");
  });
});
