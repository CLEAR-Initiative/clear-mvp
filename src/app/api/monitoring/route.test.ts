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
  it("points an envelope for our DSN at that project's envelope endpoint", () => {
    expect(envelopeTarget(DSN, DSN)).toBe("https://sentry.example.org/api/4/envelope/");
  });

  it("refuses another host, another project, or no DSN configured", () => {
    expect(envelopeTarget("https://abc123@evil.example.com/4", DSN)).toBeNull();
    expect(envelopeTarget("https://abc123@sentry.example.org/5", DSN)).toBeNull();
    expect(envelopeTarget(DSN, undefined)).toBeNull();
    expect(envelopeTarget(undefined, DSN)).toBeNull();
    expect(envelopeTarget("not a url", DSN)).toBeNull();
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
    expect(url).toBe("https://sentry.example.org/api/4/envelope/");
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

  it("answers 502 when GlitchTip can't be reached", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await POST(
      new Request("http://app/api/monitoring", { method: "POST", body: envelope(DSN) }),
    );
    expect(res.status).toBe(502);
  });
});
