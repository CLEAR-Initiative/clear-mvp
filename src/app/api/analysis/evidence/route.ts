/**
 * Attach a PDF to an analysis. The file is forwarded to clear-api's
 * knowledgebase upload, which also records it on the analysis automation.
 */

import { NextRequest, NextResponse } from "next/server";
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
