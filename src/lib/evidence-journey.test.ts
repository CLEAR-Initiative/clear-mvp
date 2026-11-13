import { describe, expect, it } from "vitest";
import { evidenceJourney } from "./evidence-journey";

const uploaded = { uploading: false, failed: false, reportId: "manual:abc", addedAt: "2026-10-30T12:31:00Z" };
const before = { sourceIds: ["r1", "event:e1"], generatedAt: "2026-10-30T09:00:00Z" };

describe("evidenceJourney", () => {
  it("is uploading while the request is in flight", () => {
    expect(evidenceJourney({ ...uploaded, uploading: true, reportId: undefined }, before)).toEqual({ stage: "uploading" });
  });

  it("is failed when the upload broke off or clear-api gave no id", () => {
    expect(evidenceJourney({ ...uploaded, failed: true }, before)).toEqual({ stage: "failed" });
    expect(evidenceJourney({ ...uploaded, reportId: undefined }, before)).toEqual({ stage: "failed" });
  });

  it("is processing until the analysis updates after the upload", () => {
    expect(evidenceJourney(uploaded, before)).toEqual({ stage: "processing" });
    expect(evidenceJourney(uploaded, { ...before, generatedAt: null })).toEqual({ stage: "processing" });
  });

  it("is cited with its number when the analysis cites the report", () => {
    const sources = { sourceIds: ["r1", "manual:abc"], generatedAt: "2026-10-30T12:52:00Z" };
    expect(evidenceJourney(uploaded, sources)).toEqual({ stage: "cited", citation: 2 });
  });

  it("is left out when a later update does not cite it", () => {
    expect(evidenceJourney(uploaded, { ...before, generatedAt: "2026-10-30T12:52:00Z" })).toEqual({ stage: "notInUpdate" });
  });
});
