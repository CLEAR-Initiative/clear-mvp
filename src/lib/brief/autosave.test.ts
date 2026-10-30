import { describe, expect, it } from "vitest";
import { textPatch } from "./autosave";

const saved = { title: "Daily Brief, Sudan", summary: "", closingNotes: "" };

describe("textPatch", () => {
  it("is null when nothing changed", () => {
    expect(textPatch(saved, saved)).toBeNull();
  });

  it("sends only the changed fields", () => {
    expect(textPatch({ ...saved, summary: "Calm" }, saved)).toEqual({ summary: "Calm" });
  });

  it("never sends a blank title, which clear-api refuses", () => {
    expect(textPatch({ ...saved, title: "  " }, saved)).toBeNull();
    expect(textPatch({ ...saved, title: "", closingNotes: "End" }, saved)).toEqual({ closingNotes: "End" });
  });
});
