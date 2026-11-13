// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DEFAULT_CALLBACK_URL, safeCallbackUrl } from "~/lib/callback-url";
import { middleware } from "~/middleware";

describe("safeCallbackUrl", () => {
  it("keeps a path on this origin", () => {
    expect(safeCallbackUrl("/metrics")).toBe("/metrics");
    expect(safeCallbackUrl("/crises/c1")).toBe("/crises/c1");
  });

  it("keeps the query and the hash", () => {
    expect(safeCallbackUrl("/metrics?view=same-ruler&metric=ALERTED_SAME_DAY")).toBe(
      "/metrics?view=same-ruler&metric=ALERTED_SAME_DAY",
    );
    expect(safeCallbackUrl("/map?location=SD#layers")).toBe("/map?location=SD#layers");
  });

  it("keeps a query whose value is itself a URL", () => {
    expect(safeCallbackUrl("/agent?source=https%3A%2F%2Fexample.org%2Fa")).toBe(
      "/agent?source=https%3A%2F%2Fexample.org%2Fa",
    );
    expect(safeCallbackUrl("/agent?source=https://example.org/a")).toBe(
      "/agent?source=https://example.org/a",
    );
  });

  it("falls back when the value is missing", () => {
    expect(safeCallbackUrl(null)).toBe(DEFAULT_CALLBACK_URL);
    expect(safeCallbackUrl(undefined)).toBe(DEFAULT_CALLBACK_URL);
    expect(safeCallbackUrl("")).toBe(DEFAULT_CALLBACK_URL);
  });

  it("refuses an absolute URL", () => {
    for (const raw of [
      "https://evil.example/metrics",
      "http://evil.example",
      "javascript:alert(1)",
      "data:text/html,x",
      "evil.example/metrics",
      "metrics",
    ]) {
      expect(safeCallbackUrl(raw), raw).toBe(DEFAULT_CALLBACK_URL);
    }
  });

  it("refuses a //host value", () => {
    for (const raw of ["//evil.example", "//evil.example/metrics?view=same-ruler", "///evil.example"]) {
      expect(safeCallbackUrl(raw), raw).toBe(DEFAULT_CALLBACK_URL);
    }
  });

  it("refuses a value that a browser resolves to another host", () => {
    for (const raw of [
      "/\\evil.example",
      "/\\/evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "/.//evil.example",
      "/x/..//evil.example",
    ]) {
      expect(safeCallbackUrl(raw), JSON.stringify(raw)).toBe(DEFAULT_CALLBACK_URL);
    }
  });
});

describe("login redirect round trip", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** The page a signed-out visitor opens after sign-in, for a given request path. */
  async function landingAfterLogin(path: string, headers: Record<string, string> = {}) {
    const res = await middleware(new NextRequest(new URL(path, "http://localhost:3000"), { headers }));
    const login = new URL(res.headers.get("location")!);
    expect(login.pathname).toBe("/auth/login");
    return safeCallbackUrl(login.searchParams.get("callbackUrl"));
  }

  it("opens the same /metrics view after sign-in", async () => {
    const path =
      "/metrics?from=2026-10-01&to=2026-11-01&location=SD&metric=ALERTED_SAME_DAY&granularity=week&lines=a,b&sources=dataminr&view=same-ruler";
    expect(await landingAfterLogin(path)).toBe(path);
  });

  it("opens the same page when the session cookie is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    const path = "/metrics?view=same-ruler&metric=ALERTED_SAME_DAY";
    expect(await landingAfterLogin(path, { cookie: "better-auth.session_token=stale" })).toBe(path);
  });

  it("keeps a query value that has encoded characters", async () => {
    const path = "/signals?q=flood%20%26%20cholera&next=%2Fmap";
    expect(await landingAfterLogin(path)).toBe(path);
  });
});
