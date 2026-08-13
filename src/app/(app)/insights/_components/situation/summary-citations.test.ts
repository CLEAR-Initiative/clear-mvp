import { describe, it, expect } from "vitest";
import { planSentenceSegments } from "./summary-citations";

describe("planSentenceSegments", () => {
  const para = "Alpha one. Beta two. Gamma three.";

  it("returns null when nothing is cited", () => {
    expect(planSentenceSegments(para, {})).toBeNull();
    expect(planSentenceSegments(para, { "Not present.": [1] })).toBeNull();
  });

  it("marks a cited sentence and preserves the surrounding prose", () => {
    const segs = planSentenceSegments(para, { "Beta two.": [2, 5] })!;
    expect(segs).toEqual([
      { kind: "text", text: "Alpha one. " },
      { kind: "text", text: "Beta two." },
      { kind: "cite", refs: [2, 5] },
      { kind: "text", text: " Gamma three." },
    ]);
    // No text is lost or duplicated.
    expect(segs.filter((s) => s.kind === "text").map((s) => (s as { text: string }).text).join("")).toBe(para);
  });

  it("orders citations by position, not object key order", () => {
    const segs = planSentenceSegments(para, { "Gamma three.": [9], "Alpha one.": [1] })!;
    const cites = segs.filter((s) => s.kind === "cite");
    expect(cites).toEqual([{ kind: "cite", refs: [1] }, { kind: "cite", refs: [9] }]);
  });

  it("drops an overlapping attribution rather than duplicating text", () => {
    const segs = planSentenceSegments(para, { "Alpha one. Beta two.": [1], "Beta two.": [2] })!;
    expect(segs.filter((s) => s.kind === "text").map((s) => (s as { text: string }).text).join("")).toBe(para);
  });
});
