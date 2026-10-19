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
