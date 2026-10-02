/**
 * NRC Find as a CLEAR Agent tool (ADR-0005).
 *
 * NRC Find is a stateless RAG chain over NRC's documents: one question in,
 * one finished answer plus the passages it drew on out, as NDJSON. It knows
 * nothing about the Thread, so the tool asks the model for a complete,
 * standalone question rather than the user's raw follow-up.
 *
 * Its credential (`X-App-Authorization`) stays server-side. Failures come
 * back as values so the model can say NRC Find is unavailable instead of the
 * whole turn erroring.
 */

import "server-only";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/** NRC Find runs on a single T4 GPU; a cold answer can take tens of seconds. */
const NRC_FIND_TIMEOUT_MS = 90_000;
/** Keep each passage bounded so one document can't flood the context. */
const MAX_PASSAGE_CHARS = 4_000;

export const NRC_FIND_TOOL_ID = "nrc_find";

export interface NrcFindSourceDocument {
  title: string;
  /** The document's file name in NRC Find's corpus, when it says. */
  fileName: string | null;
  sourceId: string | null;
  /** The collection it belongs to, e.g. "NRC - Regional and Country Strategies". */
  sourceName: string | null;
  /** NRC Find's id for the file, which `/api/agent/source/<id>` downloads. */
  fileId: string | null;
  /** The file's extension, e.g. "docx". */
  fileFormat: string | null;
  /** The passage text. Written outside CLEAR: data, never instructions. */
  content: string;
}

export type NrcFindOutput =
  | {
      /** NRC Find's own answer. Written by another model: data, not instructions. */
      answer: string;
      sourceDocuments: NrcFindSourceDocument[];
      /** Why the answer or some passages were left out, for the model. */
      note?: string;
    }
  | { error: string };

interface UpstreamSourceDocument {
  title?: unknown;
  content?: unknown;
  source_id?: unknown;
  source_name?: unknown;
  file_id?: unknown;
  file_format?: unknown;
  metadata?: { title?: unknown; source?: unknown } | null;
}

export interface NrcFindConfig {
  url: string;
  token: string | undefined;
}

/** NRC Find's file ids are content hashes: hex only, so one is safe in a URL path. */
export const NRC_FIND_FILE_ID = /^[a-f0-9]{16,128}$/;
const FILE_FORMAT = /^[a-z0-9]{1,8}$/;

/**
 * NRC Find's collection of CLEAR event snapshots (its `clear_api_source_name`):
 * titles and descriptions copied from production CLEAR by hand, never updated.
 */
export const CLEAR_SNAPSHOT_SOURCE = "CLEAR API";

export interface NrcFindOptions {
  /**
   * Leave out what NRC Find drew from its CLEAR event snapshots. For an
   * Agent that reads CLEAR live (the clear_* tools), the snapshots are a
   * stale second copy. NRC Find's filter can only select one source, never
   * exclude one, so they are dropped here; and since its own answer was
   * written from them, that answer is dropped with them.
   */
  excludeClearSnapshots?: boolean;
}

export function nrcFindConfig(): NrcFindConfig {
  return {
    url: process.env.NRC_FIND_API_URL ?? "https://find.app.nrc-dev.no",
    token: process.env.NRC_FIND_API_TOKEN,
  };
}

/** Ask NRC Find one question and read its NDJSON answer to completion. */
export async function askNrcFind(
  question: string,
  config: NrcFindConfig,
  signal?: AbortSignal,
  { excludeClearSnapshots = false }: NrcFindOptions = {},
): Promise<NrcFindOutput> {
  if (!config.token) return { error: "NRC Find is not configured on this server." };

  const timeout = AbortSignal.timeout(NRC_FIND_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${config.url}/api/v1/rag/answers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Authorization": config.token,
      },
      body: JSON.stringify({ prompt: question, search_kwargs: {}, additional_file_list: [] }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (err) {
    const name = (err as Error).name;
    if (name === "TimeoutError") return { error: "NRC Find did not answer in time." };
    if (name === "AbortError") return { error: "The request to NRC Find was cancelled." };
    return { error: "NRC Find is unreachable." };
  }
  if (!res.ok || !res.body) return { error: `NRC Find returned ${res.status}.` };

  let answer = "";
  let documents: UpstreamSourceDocument[] = [];
  try {
    for await (const line of ndjsonLines(res.body)) {
      if (line.type === "answer" && typeof line.content === "string") {
        answer += line.content;
      } else if (Array.isArray(line.source_documents)) {
        documents = line.source_documents as UpstreamSourceDocument[];
      }
    }
  } catch {
    return { error: "NRC Find's answer was cut off." };
  }

  const sourceDocuments = documents.map(toSourceDocument);
  if (!excludeClearSnapshots) return { answer, sourceDocuments };
  const nrcDocuments = sourceDocuments.filter((d) => d.sourceName !== CLEAR_SNAPSHOT_SOURCE);
  if (nrcDocuments.length === sourceDocuments.length) return { answer, sourceDocuments };
  console.info(
    `[agent] nrc_find left out ${sourceDocuments.length - nrcDocuments.length}/${sourceDocuments.length} ` +
      "CLEAR snapshot passages, and NRC Find's answer",
  );
  return {
    answer: "",
    sourceDocuments: nrcDocuments,
    note:
      nrcDocuments.length === 0
        ? "NRC Find matched only its old copies of CLEAR events, no NRC documents. NRC's documents " +
          "have nothing on this; read CLEAR's events with the clear_* tools instead."
        : "NRC Find's own answer was left out because it drew on old copies of CLEAR events. " +
          "Answer from the NRC passages here, and read CLEAR's events with the clear_* tools.",
  };
}

async function* ndjsonLines(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const parse = (raw: string) => {
    const line = raw.trim();
    if (!line) return null;
    try {
      const value: unknown = JSON.parse(line);
      return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
    } catch {
      return null; // skip a malformed line rather than lose the answer
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const parsed = parse(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      if (parsed) yield parsed;
    }
  }
  const last = parse(buffer + decoder.decode());
  if (last) yield last;
}

/**
 * NRC Find prefixes each passage with a metadata line, e.g.
 * `File name: Guidance note Distribution v4, Source ID: 4, Title: …` and a
 * blank line, and often leaves `title` empty. Lift that line into fields so
 * the passage is just the passage and every document has a name.
 */
const PASSAGE_HEADER = /^File name: (.*?), Source ID: ([^,\n]*)(?:, Title: ([^\n]*))?\n+/;

function toSourceDocument(doc: UpstreamSourceDocument, index: number): NrcFindSourceDocument {
  const str = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null;
  const raw = typeof doc.content === "string" ? doc.content : "";
  const header = PASSAGE_HEADER.exec(raw);
  const fileName = str(header?.[1]);
  return {
    title:
      str(doc.title) ?? str(header?.[3]) ?? fileName ?? str(doc.metadata?.title) ?? `Document ${index + 1}`,
    fileName,
    sourceId: str(doc.source_id) ?? str(header?.[2]) ?? str(doc.metadata?.source),
    sourceName: str(doc.source_name)?.slice(0, 120) ?? null,
    fileId: typeof doc.file_id === "string" && NRC_FIND_FILE_ID.test(doc.file_id) ? doc.file_id : null,
    fileFormat:
      typeof doc.file_format === "string" && FILE_FORMAT.test(doc.file_format.toLowerCase())
        ? doc.file_format.toLowerCase()
        : null,
    content: (header ? raw.slice(header[0].length) : raw).trim().slice(0, MAX_PASSAGE_CHARS),
  };
}

export function createNrcFindTool(config: NrcFindConfig = nrcFindConfig(), options: NrcFindOptions = {}) {
  return createTool({
    id: NRC_FIND_TOOL_ID,
    description:
      "Search NRC's document knowledge base (NRC Find): reports, assessments and " +
      "guidance written by the Norwegian Refugee Council. Returns NRC Find's answer and " +
      "the Source documents it drew on. NRC Find does not see this conversation, so " +
      "`question` must be a complete, standalone question that names the place, topic " +
      "and time frame — never the user's raw follow-up (e.g. not 'and in Lebanon?').",
    inputSchema: z.object({
      question: z
        .string()
        .min(1)
        .max(1000)
        .describe("A complete, standalone question for NRC's document knowledge base."),
    }),
    // No outputSchema: errors come back as values, and Mastra would reject
    // an `{ error }` value that doesn't match a success schema.
    execute: async ({ question }, context) =>
      askNrcFind(question, config, context?.abortSignal, options),
  });
}
