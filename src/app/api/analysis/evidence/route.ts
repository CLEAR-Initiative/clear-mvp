/**
 * Attach a PDF to an analysis, and hand back a download link for one that
 * the knowledge base has already ingested.
 *
 * The upload is forwarded to clear-api, which stores the PDF and records it
 * on the analysis automation. The download link is the presigned URL from
 * `searchReports`, matched to the report id the upload returned. Until ingest
 * finishes, that lookup is empty and the browser copy is what opens.
 */

import { NextRequest, NextResponse } from "next/server";
import { pickEvidenceDownload } from "~/lib/analysis-evidence";
import { GRAPHQL_URL } from "~/server/env";

const UPLOAD = `
  mutation UploadAnalysisEvidence(
    $file: Upload!
    $title: String!
    $publishedAt: DateTime!
    $teamId: ID
    $analysisAutomationId: ID
  ) {
    uploadKnowledgebaseDocument(
      file: $file
      title: $title
      publishedAt: $publishedAt
      teamId: $teamId
      analysisAutomationId: $analysisAutomationId
    ) {
      reportId
      reportTitle
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();
    const file = incoming.get("file");
    const automationId = incoming.get("automationId");
    const teamId = incoming.get("teamId");
    if (!(file instanceof File) || typeof automationId !== "string" || !automationId) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    const pdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!pdf) return NextResponse.json({ error: "Only PDF files can be added" }, { status: 400 });

    const operations = {
      query: UPLOAD,
      variables: {
        file: null,
        title: file.name,
        publishedAt: new Date().toISOString(),
        teamId: typeof teamId === "string" && teamId ? teamId : null,
        analysisAutomationId: automationId,
      },
    };
    const body = new FormData();
    body.append("operations", JSON.stringify(operations));
    body.append("map", JSON.stringify({ "0": ["variables.file"] }));
    body.append("0", file, file.name);

    const resp = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { Cookie: req.headers.get("Cookie") ?? "" },
      body,
    });
    const json = (await resp.json()) as {
      data?: { uploadKnowledgebaseDocument?: { reportId?: string | null; reportTitle?: string | null } };
      errors?: Array<{ message?: string }>;
    };
    if (!resp.ok || json.errors?.length || !json.data?.uploadKnowledgebaseDocument) {
      return NextResponse.json({ error: json.errors?.[0]?.message ?? "Upload failed" }, { status: resp.ok ? 400 : resp.status });
    }
    return NextResponse.json({
      reportId: json.data.uploadKnowledgebaseDocument.reportId,
      fileName: json.data.uploadKnowledgebaseDocument.reportTitle ?? file.name,
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

const DOWNLOAD = `
  query EvidenceDownload($source: String) {
    searchReports(source: $source, limit: 20) {
      reportId
      downloadUrl
    }
  }
`;

/** A fresh download link for a PDF this analysis already uploaded. */
export async function GET(req: NextRequest) {
  const reportId = req.nextUrl.searchParams.get("reportId")?.trim();
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!reportId || !name) return NextResponse.json({ error: "Missing report" }, { status: 400 });
  try {
    const resp = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: req.headers.get("Cookie") ?? "" },
      body: JSON.stringify({ query: DOWNLOAD, variables: { source: name } }),
    });
    const json = (await resp.json()) as {
      data?: { searchReports?: Array<{ reportId?: string | null; downloadUrl?: string | null }> };
      errors?: Array<{ message?: string }>;
    };
    if (!resp.ok || json.errors?.length) {
      return NextResponse.json({ error: json.errors?.[0]?.message ?? "Download failed" }, { status: resp.ok ? 400 : resp.status });
    }
    const downloadUrl = pickEvidenceDownload(
      (json.data?.searchReports ?? []).map((report) => ({
        reportId: report.reportId ?? "",
        downloadUrl: report.downloadUrl ?? null,
      })),
      reportId,
    );
    if (!downloadUrl) return NextResponse.json({ error: "The file is not ready" }, { status: 404 });
    return NextResponse.json({ downloadUrl });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
