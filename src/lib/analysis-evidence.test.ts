import { describe, expect, it } from "vitest";
import { pickEvidenceDownload } from "./analysis-evidence";

describe("pickEvidenceDownload", () => {
  it("returns the link for the uploaded report and ignores other titles", () => {
    const reports = [
      { reportId: "manual:other", downloadUrl: "https://files.example/other.pdf" },
      { reportId: "manual:abc", downloadUrl: "https://files.example/brief.pdf" },
    ];

    expect(pickEvidenceDownload(reports, "manual:abc")).toBe("https://files.example/brief.pdf");
    expect(pickEvidenceDownload(reports, "manual:missing")).toBeNull();
    expect(pickEvidenceDownload([{ reportId: "manual:abc", downloadUrl: null }], "manual:abc")).toBeNull();
  });
});
