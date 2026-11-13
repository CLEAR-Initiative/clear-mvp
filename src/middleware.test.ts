// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "~/middleware";

/** The middleware's server-side gate for admin-only pages. */

function sessionAs(role: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ session: { id: "s" }, user: { role, language: "en" } }), { status: 200 }),
    ),
  );
}

function request(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: { cookie: "better-auth.session_token=x; NEXT_LOCALE=en" },
  });
}

describe("middleware: /metrics", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends a non-admin to /no-access", async () => {
    for (const role of ["analyst", "viewer"]) {
      sessionAs(role);
      const res = await middleware(request("/metrics"));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/no-access");
    }
  });

  it("lets a platform admin through", async () => {
    sessionAs("admin");
    const res = await middleware(request("/metrics"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("still sends a non-admin away from /admin to /dashboard", async () => {
    sessionAs("analyst");
    const res = await middleware(request("/admin"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/dashboard");
  });
});

describe("middleware: /brief", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends a non-admin to /no-access from the list and a Brief", async () => {
    for (const path of ["/brief", "/brief/b1"]) {
      for (const role of ["analyst", "viewer", "pending"]) {
        sessionAs(role);
        const res = await middleware(request(path));
        expect(res.status).toBe(307);
        expect(new URL(res.headers.get("location")!).pathname).toBe("/no-access");
      }
    }
  });

  it("lets a platform admin through", async () => {
    sessionAs("admin");
    for (const path of ["/brief", "/brief/b1"]) {
      const res = await middleware(request(path));
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("leaves other paths that start with the same letters alone", async () => {
    sessionAs("analyst");
    const res = await middleware(request("/briefing"));
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("middleware: login redirect", () => {
  afterEach(() => vi.unstubAllGlobals());

  function signedOut(path: string) {
    return new NextRequest(new URL(path, "http://localhost:3000"));
  }

  it("keeps the query string in callbackUrl", async () => {
    const res = await middleware(signedOut("/metrics?view=same-ruler&metric=ALERTED_SAME_DAY"));
    expect(res.status).toBe(307);
    const login = new URL(res.headers.get("location")!);
    expect(login.pathname).toBe("/auth/login");
    expect(login.searchParams.get("callbackUrl")).toBe("/metrics?view=same-ruler&metric=ALERTED_SAME_DAY");
    // The page's own parameters must not leak onto the login URL itself.
    expect([...login.searchParams.keys()]).toEqual(["callbackUrl"]);
  });

  it("sends a path with no query as the path alone", async () => {
    const res = await middleware(signedOut("/metrics"));
    expect(new URL(res.headers.get("location")!).searchParams.get("callbackUrl")).toBe("/metrics");
  });

  it("keeps the query when the backend rejects the session cookie", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    const res = await middleware(request("/map?location=SD&from=2026-11-01"));
    const login = new URL(res.headers.get("location")!);
    expect(login.pathname).toBe("/auth/login");
    expect(login.searchParams.get("callbackUrl")).toBe("/map?location=SD&from=2026-11-01");
  });
});
