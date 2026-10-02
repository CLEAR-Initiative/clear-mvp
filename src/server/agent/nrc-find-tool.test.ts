// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { askNrcFind } from "~/server/agent/nrc-find-tool";

vi.mock("server-only", () => ({}));

const config = { url: "https://find.test", token: "find-secret" };

function ndjson(lines: unknown[], chunkAt?: number): Response {
  const body = lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  const bytes = new TextEncoder().encode(body);
  const split = chunkAt ?? bytes.length;
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.slice(0, split));
        controller.enqueue(bytes.slice(split));
        controller.close();
      },
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("askNrcFind", () => {
  it("reads the NDJSON to completion and lifts NRC Find's passage header into fields", async () => {
    const fetchMock = vi.fn(async () =>
      ndjson(
        [
          {
            user_prompt: "q",
            source_documents: [
              {
                title: "",
                source_id: 4,
                source_name: "NRC - Guidance",
                file_id: "e29e1fb446e29d6ed894ffc6c07fcd7f",
                file_format: "DOCX",
                content: "File name: Guidance note Distribution v4, Source ID: 4\n\nIn emergency response, timely delivery is key.",
              },
              {
                title: "Annual Report 2017",
                file_id: "../../etc/passwd",
                content: "File name: annual report 2017, Source ID: 2, Title: Annual Report 2017\n\nCash-based assistance.",
              },
            ],
          },
          { type: "answer", content: "Timely " },
          { type: "answer", content: "delivery." },
        ],
        37, // split mid-line: the reader must buffer across chunks
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await askNrcFind("What is NRC's approach to distributions?", config);

    expect(result).toEqual({
      answer: "Timely delivery.",
      sourceDocuments: [
        {
          title: "Guidance note Distribution v4",
          fileName: "Guidance note Distribution v4",
          sourceId: "4",
          sourceName: "NRC - Guidance",
          fileId: "e29e1fb446e29d6ed894ffc6c07fcd7f",
          fileFormat: "docx",
          content: "In emergency response, timely delivery is key.",
        },
        {
          title: "Annual Report 2017",
          fileName: "annual report 2017",
          sourceId: "2",
          sourceName: null,
          fileId: null,
          fileFormat: null,
          content: "Cash-based assistance.",
        },
      ],
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://find.test/api/v1/rag/answers");
    expect(new Headers(init.headers).get("X-App-Authorization")).toBe("find-secret");
    expect(JSON.parse(init.body as string)).toEqual({
      prompt: "What is NRC's approach to distributions?",
      search_kwargs: {},
      additional_file_list: [],
    });
  });

  it("returns errors as values", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 503 })));
    await expect(askNrcFind("q", config)).resolves.toEqual({ error: "NRC Find returned 503." });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    await expect(askNrcFind("q", config)).resolves.toEqual({ error: "NRC Find is unreachable." });
    await expect(askNrcFind("q", { ...config, token: undefined })).resolves.toEqual({
      error: "NRC Find is not configured on this server.",
    });
  });
});
