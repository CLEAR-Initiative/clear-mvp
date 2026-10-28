/** A knowledge-base report row that can hand back a PDF link. */
export interface EvidenceReport {
  reportId: string;
  downloadUrl: string | null;
}

/**
 * The download link for the report this upload created.
 * A title search can return other reports; only the stored report id matches.
 */
export function pickEvidenceDownload(reports: readonly EvidenceReport[], reportId: string): string | null {
  const hit = reports.find((report) => report.reportId === reportId && report.downloadUrl);
  return hit?.downloadUrl ?? null;
}
