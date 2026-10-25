import { describe, expect, it } from "vitest";
import { changeChips, changeSessionKey, looseChangeNotes, sectionForChangeKey } from "./change-notes";

describe("sectionForChangeKey", () => {
  it("places known pipeline keys", () => {
    expect(sectionForChangeKey("summary")).toBe("summary");
    expect(sectionForChangeKey("context_risks.security")).toBe("contexts");
    expect(sectionForChangeKey("hazards")).toBe("hazards");
    expect(sectionForChangeKey("displacement.push")).toBe("displacement");
    expect(sectionForChangeKey("scenarios.most_likely")).toBe("forecast");
    expect(sectionForChangeKey("sectors.health")).toBe("figures");
    expect(sectionForChangeKey("funding_received")).toBe("figures");
  });

  it("leaves unknown keys unplaced", () => {
    expect(sectionForChangeKey("something_else")).toBeNull();
  });
});

describe("changeChips", () => {
  it("keeps one chip per section and drops blanks", () => {
    expect(
      changeChips({
        summary: "  Cholera line revised. ",
        "summary.extra": "ignored",
        hazards: "",
        "context_risks.security": "Two new security findings.",
        mystery: "Still shown elsewhere",
      }),
    ).toEqual([
      { section: "summary", note: "Cholera line revised." },
      { section: "contexts", note: "Two new security findings." },
    ]);
  });
});

describe("changeSessionKey", () => {
  it("changes when the notes change and ignores blank notes and key order", () => {
    const a = changeSessionKey("country:sdn", { summary: " Revised ", hazards: "" });
    const b = changeSessionKey("country:sdn", { hazards: "", summary: "Revised" });
    const c = changeSessionKey("country:sdn", { summary: "Revised again" });
    expect(a).toBe(b);
    expect(c).not.toBe(a);
    expect(changeSessionKey("created:1", { summary: "Revised" })).not.toBe(a);
  });
});

describe("looseChangeNotes", () => {
  it("returns only notes that do not map to a section", () => {
    expect(looseChangeNotes({ summary: "Known", mystery: " Loose " })).toEqual([
      { key: "mystery", note: "Loose" },
    ]);
  });
});
