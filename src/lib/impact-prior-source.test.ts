import { describe, expect, it } from "vitest";
import { impactPriorSource, isImpactPriorKind, requestLabel, requestSourceLabel, sourceLabel, sourceSearchTerm } from "./impact-prior-source";

const t = (key: string) => key;

describe("impact prior sources", () => {
  it("names the known sources and keeps the raw kind for anything else, including the bare kind", () => {
    expect(impactPriorSource("event.impact_prior.clear")).toEqual({ key: "clear" });
    expect(impactPriorSource("event.impact_prior.web")).toEqual({ key: "web" });
    expect(impactPriorSource("event.impact_prior")).toEqual({ key: "legacy" });
    expect(impactPriorSource("event.impact_prior.satellite")).toEqual({ key: "other", kind: "event.impact_prior.satellite" });
    expect(impactPriorSource("event.other")).toEqual({ key: "other", kind: "event.other" });
  });

  it("labels through the translator for known sources only", () => {
    expect(sourceLabel("event.impact_prior.clear", t)).toBe("sourceKind.clear");
    expect(sourceLabel("event.impact_prior.web", t)).toBe("sourceKind.web");
    expect(sourceLabel("event.impact_prior", t)).toBe("sourceKind.legacy");
    expect(sourceLabel("event.impact_prior.satellite", t)).toBe("event.impact_prior.satellite");
  });

  it("searches by the source word, never the shared family prefix", () => {
    expect(sourceSearchTerm("event.impact_prior.clear")).toBe("clear");
    expect(sourceSearchTerm("event.impact_prior.web")).toBe("web");
    expect(sourceSearchTerm("event.impact_prior")).toBe("");
  });

  it("recognises the family", () => {
    expect(isImpactPriorKind("event.impact_prior")).toBe(true);
    expect(isImpactPriorKind("event.impact_prior.web")).toBe(true);
    expect(isImpactPriorKind("event.impact_prior_x")).toBe(false);
  });

  it("calls the web Worker's request a web search, and names the rest by source", () => {
    expect(requestLabel("event.impact_prior.web", t)).toBe("webSearch");
    expect(requestLabel("event.impact_prior.clear", t)).toBe("kinds.impactPrior · sourceKind.clear");
    expect(requestLabel("event.other", t)).toBe("event.other");
    expect(requestSourceLabel("event.impact_prior.web", t)).toBe("webSearch");
    expect(requestSourceLabel("event.impact_prior.clear", t)).toBe("sourceKind.clear");
  });
});
