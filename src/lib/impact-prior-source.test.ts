import { describe, expect, it } from "vitest";
import { compareSourceKinds, groupBySourceKind, impactPriorSource, isImpactPriorKind, sourceLabel } from "./impact-prior-source";

const t = (key: string) => key;

describe("impact prior sources", () => {
  it("names the known sources and keeps the raw kind for anything else, including the bare kind", () => {
    expect(impactPriorSource("event.impact_prior.clear")).toEqual({ key: "clear" });
    expect(impactPriorSource("event.impact_prior.web")).toEqual({ key: "web" });
    expect(impactPriorSource("event.impact_prior")).toEqual({ key: "other", kind: "event.impact_prior" });
    expect(impactPriorSource("event.impact_prior.satellite")).toEqual({ key: "other", kind: "event.impact_prior.satellite" });
    expect(impactPriorSource("event.other")).toEqual({ key: "other", kind: "event.other" });
  });

  it("labels through the translator for known sources only", () => {
    expect(sourceLabel("event.impact_prior.clear", t)).toBe("sourceKind.clear");
    expect(sourceLabel("event.impact_prior.web", t)).toBe("sourceKind.web");
    expect(sourceLabel("event.impact_prior", t)).toBe("event.impact_prior");
  });

  it("recognises the family", () => {
    expect(isImpactPriorKind("event.impact_prior")).toBe(true);
    expect(isImpactPriorKind("event.impact_prior.web")).toBe(true);
    expect(isImpactPriorKind("event.impact_prior_x")).toBe(false);
  });

  it("groups proposals by source, CLEAR first, then web, then the rest by kind, keeping arrival order inside a group", () => {
    const rows = [
      { id: "w1", sourceKind: "event.impact_prior.web" },
      { id: "o1", sourceKind: "event.impact_prior.satellite" },
      { id: "c1", sourceKind: "event.impact_prior.clear" },
      { id: "b1", sourceKind: "event.impact_prior" },
      { id: "c2", sourceKind: "event.impact_prior.clear" },
    ];
    expect(groupBySourceKind(rows).map((g) => [g.kind, g.rows.map((r) => r.id)])).toEqual([
      ["event.impact_prior.clear", ["c1", "c2"]],
      ["event.impact_prior.web", ["w1"]],
      ["event.impact_prior", ["b1"]],
      ["event.impact_prior.satellite", ["o1"]],
    ]);
    expect(["event.impact_prior.web", "event.impact_prior.clear"].sort(compareSourceKinds)).toEqual([
      "event.impact_prior.clear",
      "event.impact_prior.web",
    ]);
  });
});
