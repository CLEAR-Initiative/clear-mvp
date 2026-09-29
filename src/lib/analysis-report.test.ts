import { describe, expect, it } from "vitest";
import {
  REPORT_SECTIONS,
  defaultReportSections,
  moveItem,
  pdfSafe,
  projectReportMap,
  reportFileName,
} from "~/lib/analysis-report";

const square = (x: number, y: number, d = 1) => ({
  type: "Polygon",
  coordinates: [[[x, y], [x + d, y], [x + d, y + d], [x, y + d], [x, y]]],
});

describe("analysis report helpers", () => {
  it("frames an area scope on its areas and keeps only events inside the frame", () => {
    const map = projectReportMap({
      country: square(22, 9, 16),
      areas: [square(30, 13)],
      events: [{ point: [30.5, 13.5], severity: 5 }, { point: [23, 10], severity: 2 }, { point: null, severity: 1 }],
      width: 500,
      height: 250,
    })!;
    expect(map.areas).toHaveLength(1);
    expect(map.country.startsWith("M")).toBe(true);
    expect(map.dots).toEqual([expect.objectContaining({ severity: 5 })]);
    expect(map.dots[0]!.x).toBeCloseTo(250, 0);
    expect(map.dots[0]!.y).toBeCloseTo(125, 0);
  });

  it("frames the country when there are no areas, and gives up without geometry", () => {
    const map = projectReportMap({ country: square(22, 9, 16), areas: [], events: [], width: 500, height: 250 })!;
    expect(map.areas).toEqual([]);
    expect(projectReportMap({ country: null, areas: [], events: [], width: 500, height: 250 })).toBeNull();
  });

  it("folds text the PDF's built-in font lacks", () => {
    expect(pdfSafe("El Fāshir – Café “quoted”")).toBe("El Fashir – Café “quoted”");
    expect(pdfSafe("Sudan السودان")).toBe("Sudan ");
  });

  it("names the file after the scope and date", () => {
    expect(reportFileName("Bara, Um Dam Haj Ahmed and Gharb Bara, North Kordofan, Sudan", new Date("2026-09-29T20:00:00Z"))).toBe(
      "sitrep-bara-um-dam-haj-ahmed-and-gharb-bara-north-kordofan-sudan-2026-09-29.pdf",
    );
  });
});

describe("report sections", () => {
  const content = {
    summary: "S.",
    keyFindings: [{}, {}],
    contextRisks: [{ items: [1, 2] }, { items: [3] }],
    hazards: { hazards: [] },
    displacement: { push: [1] },
    sectors: [
      { severity: "critical", needs: [1], interventions: [] },
      { severity: null, needs: [1], interventions: [1] },
    ],
    scenarios: null,
    sources: [1, 2, 3],
  };

  it("includes every section with content, in the default order", () => {
    const sections = defaultReportSections(content, 12);
    expect(sections.map((s) => s.key)).toEqual([...REPORT_SECTIONS]);
    const by = Object.fromEntries(sections.map((s) => [s.key, s]));
    expect(by.contexts).toMatchObject({ included: true, count: 3 });
    expect(by.map).toMatchObject({ included: true, count: 12 });
    expect(by.hazards).toMatchObject({ included: false, available: false });
    expect(by.outlook).toMatchObject({ included: false, available: false });
    expect(by.priorityNeeds!.count).toBe(1);
    expect(by.responseActivities!.count).toBe(1);
  });

  it("moves an item as a drag does, ignoring out-of-range moves", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});
