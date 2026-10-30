import { afterEach, describe, expect, it } from "vitest";
import { clearAnalysisFiles, readAnalysisFile, saveAnalysisFile } from "./analysis-file-store";

afterEach(async () => {
  await clearAnalysisFiles();
});

describe("analysis file store", () => {
  it("returns a PDF after it was saved for that analysis", async () => {
    const pdf = new Blob(["%PDF"], { type: "application/pdf" });
    await saveAnalysisFile("user:team:country:sudan", "local-1", pdf);

    const saved = await readAnalysisFile("user:team:country:sudan", "local-1");
    expect(saved).toBeInstanceOf(Blob);
    expect(saved?.size).toBe(pdf.size);
    expect(await readAnalysisFile("user:team:country:sudan", "other")).toBeNull();
    expect(await readAnalysisFile("other-user:country:sudan", "local-1")).toBeNull();
  });

  it("drops every PDF on sign-out", async () => {
    await saveAnalysisFile("user:team:country:sudan", "local-1", new Blob(["a"]));
    await clearAnalysisFiles();
    expect(await readAnalysisFile("user:team:country:sudan", "local-1")).toBeNull();
  });
});
