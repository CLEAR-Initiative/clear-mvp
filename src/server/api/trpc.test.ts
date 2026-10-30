import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCallerFactory,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

/**
 * enforceAuth looks the session up once per request, not once per procedure:
 * a batched HTTP request shares one context across all its procedures.
 */

const router = createTRPCRouter({
  a: protectedProcedure.query(({ ctx }) => ctx.user.id),
  b: protectedProcedure.query(({ ctx }) => ctx.user.id),
});
const createCaller = createCallerFactory(router);

const sessionResponse = () =>
  new Response(
    JSON.stringify({
      session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
      user: { id: "u", name: "Ana", email: "a@b.c", role: "analyst" },
    }),
    { status: 200 },
  );

describe("enforceAuth", () => {
  const fetchMock = vi.fn(async () => sessionResponse());

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares one session lookup across procedures in the same request", async () => {
    const caller = createCaller({ headers: new Headers({ cookie: "session=x" }) });

    await expect(Promise.all([caller.a(), caller.b(), caller.a()])).resolves.toEqual([
      "u",
      "u",
      "u",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("looks the session up again for a new request", async () => {
    await createCaller({ headers: new Headers({ cookie: "session=x" }) }).a();
    await createCaller({ headers: new Headers({ cookie: "session=x" }) }).a();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects every procedure in the request when the session is invalid", async () => {
    fetchMock.mockImplementation(async () => new Response("{}", { status: 401 }));
    const caller = createCaller({ headers: new Headers({ cookie: "session=x" }) });

    await expect(caller.a()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.b()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
