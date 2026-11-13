/**
 * Where an uploaded evidence PDF is on its way into the analysis: upload,
 * processing, analysis. clear-api has no processing status yet, so
 * "processing" covers everything between the upload and the next analysis
 * update; that update either cites the file or leaves it out.
 */
export type EvidenceStage = "uploading" | "failed" | "processing" | "cited" | "notInUpdate";

export interface EvidenceFileState {
  /** The upload request is in flight. */
  uploading: boolean;
  /** The upload was refused or broke off; only this browser has the file. */
  failed: boolean;
  /** Knowledge-base id clear-api gave the PDF (`manual:<hash>`). */
  reportId?: string;
  addedAt: string;
}

export interface AnalysisCitations {
  /** The analysis's source ids, in citation order. */
  sourceIds: readonly string[];
  /** When the shown analysis version was written. */
  generatedAt: string | null;
}

export interface EvidenceJourney {
  stage: EvidenceStage;
  /** The file's citation number in the analysis, when cited. */
  citation?: number;
}

export function evidenceJourney(file: EvidenceFileState, analysis: AnalysisCitations): EvidenceJourney {
  if (file.uploading) return { stage: "uploading" };
  if (file.failed || !file.reportId) return { stage: "failed" };
  const index = analysis.sourceIds.indexOf(file.reportId);
  if (index >= 0) return { stage: "cited", citation: index + 1 };
  const generated = analysis.generatedAt ? Date.parse(analysis.generatedAt) : NaN;
  if (generated > Date.parse(file.addedAt)) return { stage: "notInUpdate" };
  return { stage: "processing" };
}
