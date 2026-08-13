import { describe, it, expect } from "vitest";
import { planSentenceSegments, planSummaryParagraphs } from "./summary-citations";

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

describe("planSummaryParagraphs", () => {
  const s1 = "Alpha one is here.";
  const s2 = "Beta two follows.";
  const s3 = "Gamma three next.";
  const s4 = "Delta four ends it.";
  const text = [s1, s2, s3, s4].join(" ");

  it("keeps the pipeline's own paragraph breaks when present", () => {
    expect(planSummaryParagraphs(`${s1}\n\n${s2}`, {})).toEqual([s1, s2]);
  });

  it("returns one paragraph when nothing is cited", () => {
    expect(planSummaryParagraphs(text, {})).toEqual([text]);
  });

  it("breaks where the citing reports change", () => {
    const paras = planSummaryParagraphs(text, { [s1]: [1], [s3]: [7] });
    expect(paras).toEqual([`${s1} ${s2}`, `${s3} ${s4}`]);
  });

  it("does not break below the minimum sentence count", () => {
    // s2 cites a different report but only one sentence precedes it.
    expect(planSummaryParagraphs(text, { [s1]: [1], [s2]: [7] })).toEqual([text]);
  });

  it("loses no text: paragraphs rejoin to the original", () => {
    const paras = planSummaryParagraphs(text, { [s1]: [1], [s3]: [7] });
    expect(paras.join(" ")).toBe(text);
  });

  it("does not split decimals into sentences", () => {
    const withDecimal = "Inflation hit 13.8% in June. Costs are USD 12.5 billion now.";
    expect(planSummaryParagraphs(withDecimal, {})).toEqual([withDecimal]);
  });
});
