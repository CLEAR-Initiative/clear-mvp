import { describe, expect, it } from "vitest";
import type { SaDisplacement } from "~/server/api/mappers/situation-analysis";
import { displacementBullets, displacementStory } from "./displacement-story";

const groups = { push: "What is forcing people out", return: "Return intentions" };

function displacement(over: Partial<SaDisplacement>): SaDisplacement {
  return { push: [], return: [], summary: null, findings: [], dataCheck: null, flows: [], mapSince: null, ...over };
}

const bullets = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => ({ text: `${prefix} ${i + 1}.`, refs: [] }));

describe("displacementStory", () => {
  it("uses edited findings as they are and marks the ones on the map", () => {
    const story = displacementStory(
      displacement({
        summary: "Conflict drives most movement.",
        findings: [
          { label: "What forces people out", callout: "Conflict", text: "882 incidents.", refs: [7], tone: "out", group: null, asOf: "to 31 Aug 2026", isNew: false },
          { label: "Across borders", callout: "64% fled insecurity", text: "of people crossing into Chad.", refs: [], tone: "out", group: "refugee", asOf: "Jun 2026", isNew: true },
        ],
        flows: [
          { direction: "out", group: "refugee", from: { id: null, name: null }, to: { id: "tcd", name: "Chad" }, label: "Chad · 5,402", sublabel: null, people: 5402, finding: 2, refs: [], eventId: null },
        ],
      }),
      groups,
    );
    expect(story.summary).toBe("Conflict drives most movement.");
    expect(story.more).toEqual([]);
    expect(story.rows.map((r) => [r.num, r.label, r.onMap])).toEqual([
      [1, "What forces people out", false],
      [2, "Across borders", true],
    ]);
  });

  it("turns older bullets into rows: subject as label, leading figure as callout, push or return tone", () => {
    const story = displacementStory(
      displacement({
        push: [{ text: "Blue Nile: 20,000+ fled Geisan after bombardment.", refs: [3] }],
        return: [{ text: "Few intend to return while fighting continues.", refs: [] }],
      }),
      groups,
    );
    expect(story.rows).toEqual([
      { num: 1, label: "Blue Nile", callout: "20,000+", text: "fled Geisan after bombardment.", refs: [3], tone: "out", group: null, asOf: null, isNew: false, onMap: false },
      { num: 2, label: "Return intentions", callout: null, text: "Few intend to return while fighting continues.", refs: [], tone: "back", group: null, asOf: null, isNew: false, onMap: false },
    ]);
  });

  it("shows six rows, shared between pushes and returns, and keeps the rest behind Show all", () => {
    const even = displacementStory(displacement({ push: bullets("Push", 10), return: bullets("Return", 10) }), groups);
    expect(even.rows.map((r) => r.tone)).toEqual(["out", "out", "out", "back", "back", "back"]);
    expect(even.more).toHaveLength(14);

    const fewReturns = displacementStory(displacement({ push: bullets("Push", 10), return: bullets("Return", 1) }), groups);
    expect(fewReturns.rows.map((r) => r.tone)).toEqual(["out", "out", "out", "out", "out", "back"]);

    const fewPushes = displacementStory(displacement({ push: bullets("Push", 1), return: bullets("Return", 10) }), groups);
    expect(fewPushes.rows.map((r) => r.tone)).toEqual(["out", "back", "back", "back", "back", "back"]);
  });
});

describe("displacementBullets", () => {
  it("reads the edited findings for the report, with label and callout", () => {
    const d = displacement({
      findings: [{ label: "Uneven returns", callout: "59% vs <1%", text: "Returns are uneven.", refs: [2], tone: "back", group: "idp", asOf: null, isNew: false }],
      push: [{ text: "Older bullet.", refs: [1] }],
    });
    expect(displacementBullets(d)).toEqual([{ text: "Uneven returns: 59% vs <1% Returns are uneven.", refs: [2] }]);
  });

  it("falls back to the older push list", () => {
    const d = displacement({ push: [{ text: "Conflict drives movement.", refs: [1] }] });
    expect(displacementBullets(d)).toEqual([{ text: "Conflict drives movement.", refs: [1] }]);
  });
});
