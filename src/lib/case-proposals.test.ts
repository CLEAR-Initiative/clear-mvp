import { describe, expect, it } from "vitest";
import { caseFigures, figureText, isCaseMetric, safeHttpUrl } from "./case-proposals";

describe("case figures", () => {
  const num = (n: number) => n.toLocaleString("en");

  it("reads value, range, unit and population group", () => {
    expect(figureText({ metric: "people_affected", value: 12000 }, num)).toBe("12,000");
    expect(
      figureText({ metric: "people_displaced_new", value: 12000, lowerBound: 10000, upperBound: 15000, unit: "people", populationGroup: "IDPs" }, num),
    ).toBe("12,000 (10,000–15,000) people · IDPs");
    // A half range is not a range.
    expect(figureText({ metric: "people_in_need", value: 5, lowerBound: 1 }, num)).toBe("5");
  });

  it("drops malformed figures (figures is JSON on the wire)", () => {
    const figures = [{ metric: "people_affected", value: 1 }, { metric: "x" }, null, { metric: "people_reached", value: Number.NaN }];
    expect(caseFigures({ figures: figures as never })).toEqual([{ metric: "people_affected", value: 1 }]);
    expect(caseFigures({ figures: "nope" as never })).toEqual([]);
  });

  it("knows the ontology's seven metric types", () => {
    expect(isCaseMetric("households_affected")).toBe(true);
    expect(isCaseMetric("deaths")).toBe(false);
  });
});

describe("safeHttpUrl", () => {
  it("passes http(s) URLs and refuses anything else", () => {
    expect(safeHttpUrl("https://example.test/floods-2019")).toBe("https://example.test/floods-2019");
    expect(safeHttpUrl("http://example.test/a")).toBe("http://example.test/a");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,x")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});
