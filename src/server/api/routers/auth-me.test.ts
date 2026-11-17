import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * auth.me holds up the app shell (src/app/(app)/app-shell.tsx awaits its
 * prefetch), so its 5 s limit has to cover the whole get-session read,
 * body included.
 */

vi.mock("~/server/api/graphql", () => ({
  graphqlFetch: vi.fn(async () => ({ me: { analyticsOptOut: false, teamMemberships: [] } })),
  cookieHeaders: () => ({ Cookie: "better-auth.session_token=x" }),
}));

const { createCaller } = await import("~/server/api/root");

function caller() {
  return createCaller({ headers: new Headers({ cookie: "better-auth.session_token=x" }) });
}

describe("auth.me", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("gives up when get-session sends headers and then stalls the body", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => ({
        ok: true,
        // A body that never arrives; only the abort ends it.
        json: () =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("The operation was aborted.", "AbortError")),
            );
          }),
      })),
    );

    let settled = false;
    const result = caller()
      .auth.me()
      .finally(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(4_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual({ authenticated: false, user: null });
  });

  it("returns the user when get-session answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: {
              id: "u",
              name: "A",
              email: "a@b.c",
              emailVerified: true,
              image: null,
              role: "user",
              isActive: true,
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await caller().auth.me();
    expect(result.authenticated).toBe(true);
    expect(result.user?.id).toBe("u");
  });
});
