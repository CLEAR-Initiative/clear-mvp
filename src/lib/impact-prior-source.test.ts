import { describe, expect, it } from "vitest";
import { isImpactPriorKind, isRetiredKind, requestLabel, sourceSearchTerm } from "./impact-prior-source";

const t = (key: string) => key;

describe("enrichment Task kinds", () => {
  it("recognises the family", () => {
    expect(isImpactPriorKind("event.impact_prior")).toBe(true);
    expect(isImpactPriorKind("event.impact_prior.web")).toBe(true);
    expect(isImpactPriorKind("event.impact_prior_x")).toBe(false);
  });

  it("retires the whole-prior kinds only", () => {
    expect(isRetiredKind("event.impact_prior")).toBe(true);
    expect(isRetiredKind("event.impact_prior.clear")).toBe(true);
    expect(isRetiredKind("event.impact_prior.web")).toBe(false);
    expect(isRetiredKind("event.other")).toBe(false);
  });

  it("searches by the source word, never the shared family prefix", () => {
    expect(sourceSearchTerm("event.impact_prior.web")).toBe("web");
    expect(sourceSearchTerm("event.impact_prior")).toBe("");
    expect(sourceSearchTerm("event.other")).toBe("event.other");
  });

  it("calls the web Worker's request a web search, any older kind in the family an impact prior, and the rest by raw kind", () => {
    expect(requestLabel("event.impact_prior.web", t)).toBe("webSearch");
    // Retired kinds still in an Event's Task history read generically.
    expect(requestLabel("event.impact_prior.clear", t)).toBe("kinds.impactPrior");
    expect(requestLabel("event.impact_prior", t)).toBe("kinds.impactPrior");
    expect(requestLabel("event.other", t)).toBe("event.other");
  });
});
