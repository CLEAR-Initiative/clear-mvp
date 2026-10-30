import { afterEach, describe, expect, it } from "vitest";
import {
  analysisStorageKey,
  clearAnalysisCollaboration,
  dropConfirmed,
  readAnalysisComments,
  readAnalysisTitle,
  writeAnalysisComments,
  writeAnalysisTitle,
} from "./analysis-collaboration";

const ANA = { userId: "ana", teamId: "team-a" };
const BEN = { userId: "ben", teamId: "team-a" };

afterEach(() => {
  clearAnalysisCollaboration();
});

describe("analysis collaboration storage", () => {
  it("keeps one user's title and comments off another account", () => {
    const sudan = "country:sudan";
    writeAnalysisTitle(analysisStorageKey(sudan, ANA), "Ana's brief");
    writeAnalysisComments(analysisStorageKey(sudan, ANA), [
      { id: "c1", text: "Ana's note", createdAt: "2026-10-01T00:00:00Z", author: "Ana", pending: true },
    ]);

    expect(readAnalysisTitle(analysisStorageKey(sudan, BEN))).toBeNull();
    expect(readAnalysisComments(analysisStorageKey(sudan, BEN))).toEqual([]);
    expect(readAnalysisTitle(analysisStorageKey(sudan, ANA))).toBe("Ana's brief");
  });

  it("separates the same user across teams", () => {
    const sudan = "country:sudan";
    writeAnalysisTitle(analysisStorageKey(sudan, ANA), "Team A");
    writeAnalysisTitle(analysisStorageKey(sudan, { userId: "ana", teamId: "team-b" }), "Team B");

    expect(readAnalysisTitle(analysisStorageKey(sudan, ANA))).toBe("Team A");
    expect(readAnalysisTitle(analysisStorageKey(sudan, { userId: "ana", teamId: "team-b" }))).toBe("Team B");
  });

  it("removes every analysis copy on sign-out", () => {
    writeAnalysisTitle(analysisStorageKey("country:sudan", ANA), "Brief");
    writeAnalysisTitle(analysisStorageKey("country:sudan", BEN), "Other");
    localStorage.setItem("clear.feature-flags", "keep");

    clearAnalysisCollaboration();

    expect(readAnalysisTitle(analysisStorageKey("country:sudan", ANA))).toBeNull();
    expect(readAnalysisTitle(analysisStorageKey("country:sudan", BEN))).toBeNull();
    expect(localStorage.getItem("clear.feature-flags")).toBe("keep");
  });

  it("drops only the upload that the server confirmed", () => {
    const files = [
      { id: "a", name: "a.pdf" },
      { id: "b", name: "b.pdf" },
    ];

    expect(dropConfirmed(files, new Set(["a"]))).toEqual([{ id: "b", name: "b.pdf" }]);
  });
});
