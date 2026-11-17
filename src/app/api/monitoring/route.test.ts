// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envelopeTarget } from "~/lib/sentry-tunnel";
import { POST } from "./route";

const DSN = "https://abc123@sentry.example.org/4";

function envelope(dsn: string): string {
  return [
    JSON.stringify({ event_id: "e1", dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify({ message: "map failed" }),
  ].join("\n");
}

describe("envelopeTarget", () => {
  it("points an envelope for our DSN at that project's envelope endpoint, with our key", () => {
    // GlitchTip answers 403 to an envelope POST with no sentry_key.
    expect(envelopeTarget(DSN, DSN)).toBe(
      "https://sentry.example.org/api/4/envelope/?sentry_key=abc123&sentry_version=7",
    );
  });

  it("authenticates with our key, not the one the client sent", () => {
    expect(envelopeTarget("https://other@sentry.example.org/4", DSN)).toBe(
      "https://sentry.example.org/api/4/envelope/?sentry_key=abc123&sentry_version=7",
    );
  });

  it("refuses another host, another project, or no DSN configured", () => {
    expect(envelopeTarget("https://abc123@evil.example.com/4", DSN)).toBeNull();
    expect(envelopeTarget("https://abc123@sentry.example.org/5", DSN)).toBeNull();
    expect(envelopeTarget(DSN, undefined)).toBeNull();
    expect(envelopeTarget(undefined, DSN)).toBeNull();
    expect(envelopeTarget("not a url", DSN)).toBeNull();
    expect(envelopeTarget(DSN, "https://sentry.example.org/4")).toBeNull();
  });
});

describe("POST /api/monitoring", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("forwards our envelopes unchanged and passes the upstream status back", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const body = envelope(DSN);

    const res = await POST(new Request("http://app/api/monitoring", { method: "POST", body }));

    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://sentry.example.org/api/4/envelope/?sentry_key=abc123&sentry_version=7");
    expect(new TextDecoder().decode(init.body as Uint8Array)).toBe(body);
  });

  it("rejects an envelope addressed to someone else's DSN without forwarding", async () => {
    const res = await POST(
      new Request("http://app/api/monitoring", {
        method: "POST",
        body: envelope("https://k@evil.example.com/1"),
      }),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty or oversized body", async () => {
    const empty = await POST(new Request("http://app/api/monitoring", { method: "POST", body: "" }));
    expect(empty.status).toBe(413);

    const huge = await POST(
      new Request("http://app/api/monitoring", { method: "POST", body: "x".repeat(1024 * 1024 + 1) }),
    );
    expect(huge.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops reading a stream once it passes the cap, with no Content-Length to go on", async () => {
    const chunk = new Uint8Array(256 * 1024);
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(chunk);
      },
    });

    const res = await POST(
      new Request("http://app/api/monitoring", {
        method: "POST",
        body: stream,
        // Node's fetch Request needs this for a streamed body.
        duplex: "half",
      } as RequestInit),
    );

    expect(res.status).toBe(413);
    // An endless stream: we stopped a chunk or two past 1 MB, not at the end.
    expect(pulled).toBeLessThan(10);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a declared Content-Length over the cap before reading", async () => {
    const res = await POST(
      new Request("http://app/api/monitoring", {
        method: "POST",
        body: "x",
        headers: { "content-length": String(5 * 1024 * 1024) },
      }),
    );
    expect(res.status).toBe(413);
  });

  it("answers 502 when GlitchTip can't be reached", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await POST(
      new Request("http://app/api/monitoring", { method: "POST", body: envelope(DSN) }),
    );
    expect(res.status).toBe(502);
  });
});
