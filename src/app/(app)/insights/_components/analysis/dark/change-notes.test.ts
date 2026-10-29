import { describe, expect, it } from "vitest";
import { changeChips, changeSessionKey, looseChangeNotes, notesWithoutFundingShares, sectionForChangeKey, withoutFundingShare } from "./change-notes";

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

describe("withoutFundingShare", () => {
  it("drops a funding percentage and keeps the rest of the note", () => {
    expect(
      withoutFundingShare("People in need rose. Funding coverage moved from 41% to 31%."),
    ).toBe("People in need rose.");
  });

  it("keeps a funding sentence that states no share", () => {
    expect(withoutFundingShare("Funding requirements were revised.")).toBe("Funding requirements were revised.");
  });

  it("removes a note that is only a funding share", () => {
    expect(notesWithoutFundingShares({ funding_received: "41% of requirements are funded." })).toEqual({});
  });
});

describe("looseChangeNotes", () => {
  it("returns only notes that do not map to a section", () => {
    expect(looseChangeNotes({ summary: "Known", mystery: " Loose " })).toEqual([
      { key: "mystery", note: "Loose" },
    ]);
  });
});
