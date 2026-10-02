import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Router tests for the hotline inbox procedures. graphqlFetch and the auth
 * session fetch are mocked; the assertions cover the query shape sent to
 * clear-api and the filtering/flattening done in the tRPC layer.
 */

const graphqlFetch = vi.fn();
vi.mock("~/server/api/graphql", () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  cookieHeaders: () => ({ Cookie: "better-auth.session_token=x" }),
}));

/** `hotline_translation`, as clear-api's feature flags report it. */
let translationOn = true;
const readFeatureFlag = vi.fn(async (key: string) => (key === "hotline_translation" ? translationOn : false));
vi.mock("~/server/feature-flags", () => ({
  readFeatureFlag: (key: string) => readFeatureFlag(key),
}));

const { createCaller } = await import("~/server/api/root");

function caller() {
  return createCaller({ headers: new Headers({ cookie: "better-auth.session_token=x" }) });
}

const sources = [
  { id: "hot1", name: "Hotline A", kind: "hotline", reviewerRoles: [], privacyDefault: "private", isActive: true },
  { id: "hot2", name: "Hotline off", kind: "hotline", reviewerRoles: [], privacyDefault: "private", isActive: false },
  { id: "grp", name: "Staff group", kind: "staff_group", reviewerRoles: [], privacyDefault: "private", isActive: true },
];

describe("ground.hotlineInbox", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: { id: "u", email: "a@b.c", role: "admin" },
          }),
          { status: 200 },
        ),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    graphqlFetch.mockReset();
    readFeatureFlag.mockClear();
    translationOn = true;
  });

  it("queries only active hotline sources and flattens threads and messages", async () => {
    graphqlFetch
      .mockResolvedValueOnce({ groundSources: sources })
      .mockResolvedValueOnce({
        groundThreads: [{ id: "t1", groundSourceId: "hot1" }],
        groundMessages: [{ id: "m1", threadId: "t1", mediaUrls: ["https://s3/a.jpg"] }],
      });

    const result = await caller().ground.hotlineInbox();

    expect(result.sources.map((s) => s.id)).toEqual(["hot1"]);
    expect(result.threads.map((t) => t.id)).toEqual(["t1"]);
    expect(result.messages[0]!.mediaUrls).toEqual(["https://s3/a.jpg"]);

    // Second call is the per-source query, scoped to unverified threads.
    expect(graphqlFetch).toHaveBeenCalledTimes(2);
    const [query, vars] = graphqlFetch.mock.calls[1] as [string, Record<string, unknown>];
    expect(query).toContain('reviewState: "unverified"');
    expect(query).toContain("mediaUrls");
    // Voice-note fields (clear-api#661) are requested on inbox messages.
    const messageSelection = query.slice(query.indexOf("groundMessages"));
    expect(messageSelection).toContain("hasVoice");
    expect(messageSelection).toContain("transcript");
    // Pipeline failure markers tell "still queued" from "given up on".
    for (const field of ["enrichFailedAt", "enrichError", "transcribeFailedAt", "transcribeError"]) {
      expect(messageSelection).toContain(field);
    }
    expect(vars).toMatchObject({ groundSourceId: "hot1", limit: 500 });
  });

  it("requests the hotline-enrichment drafts on inbox threads", async () => {
    graphqlFetch
      .mockResolvedValueOnce({ groundSources: sources })
      .mockResolvedValueOnce({
        groundThreads: [{ id: "t1", groundSourceId: "hot1", draftTitle: "Drafted", draftSeverity: 4 }],
        groundMessages: [],
      });

    const result = await caller().ground.hotlineInbox();

    const [query] = graphqlFetch.mock.calls[1] as [string];
    const threadSelection = query.slice(query.indexOf("groundThreads"), query.indexOf("groundMessages"));
    for (const field of ["draftTitle", "draftSeverity", "draftLocationId", "draftDisasterType"]) {
      expect(threadSelection).toContain(field);
    }
    expect(result.threads[0]).toMatchObject({ draftTitle: "Drafted", draftSeverity: 4 });
  });

  it("returns empty collections when no hotline source is active", async () => {
    graphqlFetch.mockResolvedValueOnce({ groundSources: [sources[1], sources[2]] });
    const result = await caller().ground.hotlineInbox();
    expect(result).toEqual({ sources: [], threads: [], messages: [] });
    expect(graphqlFetch).toHaveBeenCalledTimes(1);
  });

  /** The field names selected on inbox messages. */
  function messageFields(query: string): string[] {
    const selection = query.slice(query.indexOf("groundMessages"));
    return selection.slice(selection.indexOf("{") + 1, selection.indexOf("}")).split(/\s+/).filter(Boolean);
  }

  it("requests the detected language on inbox messages while hotline_translation is on", async () => {
    graphqlFetch
      .mockResolvedValueOnce({ groundSources: sources })
      .mockResolvedValueOnce({ groundThreads: [], groundMessages: [{ id: "m1", threadId: "t1", language: "ar" }] });
    const result = await caller().ground.hotlineInbox();
    const [query] = graphqlFetch.mock.calls[1] as [string];
    expect(messageFields(query)).toContain("language");
    expect(result.messages[0]!.language).toBe("ar");
  });

  it("leaves the language out while hotline_translation is off, so an older clear-api still serves the inbox", async () => {
    translationOn = false;
    graphqlFetch
      .mockResolvedValueOnce({ groundSources: sources })
      .mockResolvedValueOnce({ groundThreads: [], groundMessages: [{ id: "m1", threadId: "t1" }] });
    const result = await caller().ground.hotlineInbox();
    const [query] = graphqlFetch.mock.calls[1] as [string];
    expect(messageFields(query)).not.toContain("language");
    expect(result.messages[0]!.language).toBeNull();
  });

  it("translation procedures don't call clear-api while hotline_translation is off", async () => {
    translationOn = false;
    const off = { status: "unavailable", text: null };
    await expect(caller().ground.requestTranslation({ threadId: "t1", locale: "en" })).resolves.toEqual(off);
    await expect(caller().ground.translation({ threadId: "t1", locale: "en" })).resolves.toEqual(off);
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("requestTranslation keeps a message already in the locale as written, and translates the rest", async () => {
    graphqlFetch
      .mockResolvedValueOnce({
        groundThread: {
          messages: [
            { id: "m1", text: "Water is rising", language: "en" },
            { id: "m2", text: "الأسر تغادر", language: "ar" },
          ],
        },
      })
      .mockResolvedValueOnce({ requestGroundMessageTranslation: { status: "ready", text: "Families are leaving" } });

    const state = await caller().ground.requestTranslation({ threadId: "t1", locale: "en" });

    expect(state).toEqual({ status: "ready", text: "Water is rising\n\nFamilies are leaving" });
    const requested = graphqlFetch.mock.calls.slice(1).map((c) => c[1] as Record<string, unknown>);
    expect(requested).toEqual([{ messageId: "m2", locale: "en" }]);
  });

  it("requestTranslation still requests the others when one message fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    graphqlFetch
      .mockResolvedValueOnce({
        groundThread: { messages: [{ id: "m1", text: "قصف", language: "ar" }, { id: "m2", text: "وين", language: "ar" }] },
      })
      .mockRejectedValueOnce(new Error("Ground message not found"))
      .mockResolvedValueOnce({ requestGroundMessageTranslation: { status: "queued", text: null } });

    const state = await caller().ground.requestTranslation({ threadId: "t1", locale: "en" });

    // No throw: the failed message folds in as unavailable — still queued while
    // m2 is, then unavailable (with the inbox's retry) once it settles.
    expect(state).toEqual({ status: "queued", text: null });
    const requested = graphqlFetch.mock.calls.slice(1).map((c) => (c[1] as { messageId: string }).messageId);
    expect(requested).toEqual(["m1", "m2"]);
  });

  it("requestTranslation sends at most 4 requests to clear-api at once", async () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({ id: `m${i}`, text: "قصف", language: "ar" }));
    let inFlight = 0;
    let most = 0;
    graphqlFetch.mockImplementation(async (query: string) => {
      if (query.includes("GroundThreadMessageTexts")) return { groundThread: { messages } };
      inFlight++;
      most = Math.max(most, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
      return { requestGroundMessageTranslation: { status: "queued", text: null } };
    });

    await caller().ground.requestTranslation({ threadId: "t1", locale: "en" });

    expect(graphqlFetch).toHaveBeenCalledTimes(11);
    expect(most).toBe(4);
  });

  it("requestTranslation resolves the thread's text messages and requests each one", async () => {
    graphqlFetch
      .mockResolvedValueOnce({
        groundThread: { messages: [{ id: "m1", text: "قصف" }, { id: "m2", text: "  " }, { id: "m3", text: "وين" }] },
      })
      .mockResolvedValueOnce({ requestGroundMessageTranslation: { status: "queued", text: null } })
      .mockResolvedValueOnce({ requestGroundMessageTranslation: { status: "ready", text: "Where" } });

    const state = await caller().ground.requestTranslation({ threadId: "t1", locale: "en" });

    expect(state).toEqual({ status: "queued", text: null });
    const [threadQuery, threadVars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(threadQuery).toContain("groundThread(id: $id)");
    expect(threadVars).toEqual({ id: "t1" });
    // One mutation per message with text — the media-only m2 is skipped.
    const requested = graphqlFetch.mock.calls.slice(1).map((c) => c[1] as Record<string, unknown>);
    expect(requested).toEqual([
      { messageId: "m1", locale: "en" },
      { messageId: "m3", locale: "en" },
    ]);
    expect(graphqlFetch.mock.calls[1]![0]).toContain("requestGroundMessageTranslation(messageId: $messageId, locale: $locale)");
  });

  it("requestTranslation is unavailable for a media-only or missing thread", async () => {
    graphqlFetch.mockResolvedValueOnce({ groundThread: { messages: [{ id: "m1", text: "" }] } });
    await expect(caller().ground.requestTranslation({ threadId: "t1", locale: "en" })).resolves.toEqual({
      status: "unavailable",
      text: null,
    });
    graphqlFetch.mockResolvedValueOnce({ groundThread: null });
    await expect(caller().ground.requestTranslation({ threadId: "gone", locale: "en" })).resolves.toEqual({
      status: "unavailable",
      text: null,
    });
    expect(graphqlFetch).toHaveBeenCalledTimes(2);
  });

  it("translation folds the thread's per-message states into the entry's", async () => {
    graphqlFetch.mockResolvedValueOnce({
      groundThread: {
        messages: [
          { id: "m1", text: "قصف", translation: { status: "ready", text: "Shelling" } },
          { id: "m2", text: "", translation: { status: "unavailable", text: null } },
          { id: "m3", text: "وين", translation: { status: "ready", text: "Where" } },
        ],
      },
    });

    const state = await caller().ground.translation({ threadId: "t1", locale: "ar" });

    expect(state).toEqual({ status: "ready", text: "Shelling\n\nWhere" });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("translation(locale: $locale) { status text }");
    expect(vars).toEqual({ id: "t1", locale: "ar" });
  });

  it("translation uses a message already in the locale as written", async () => {
    graphqlFetch.mockResolvedValueOnce({
      groundThread: {
        messages: [
          { id: "m1", text: "Water is rising", language: "en", translation: { status: "unavailable", text: null } },
          { id: "m2", text: "وين", language: "ar", translation: { status: "ready", text: "Where" } },
        ],
      },
    });
    const state = await caller().ground.translation({ threadId: "t1", locale: "en" });
    expect(state).toEqual({ status: "ready", text: "Water is rising\n\nWhere" });
  });

  it("rejects a locale the app doesn't ship before calling the API", async () => {
    await expect(
      caller().ground.requestTranslation({ threadId: "t1", locale: "de" as "en" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers", async () => {
    const anon = createCaller({ headers: new Headers() });
    await expect(anon.ground.hotlineInbox()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("retryMessage forwards the message and stage to retryGroundMessage", async () => {
    graphqlFetch.mockResolvedValueOnce({
      retryGroundMessage: { id: "m1", enrichFailedAt: null, transcribeFailedAt: null },
    });
    const result = await caller().ground.retryMessage({ messageId: "m1", stage: "TRANSCRIBE" });
    expect(result).toEqual({ id: "m1", enrichFailedAt: null, transcribeFailedAt: null });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("$stage: GroundPipelineStage!");
    expect(query).toContain("retryGroundMessage(messageId: $messageId, stage: $stage)");
    expect(vars).toEqual({ messageId: "m1", stage: "TRANSCRIBE" });
  });

  it("retryMessage rejects an unknown stage before calling the API", async () => {
    await expect(
      caller().ground.retryMessage({ messageId: "m1", stage: "CLASSIFY" as "ENRICH" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });
});

describe("signals.updateSeverity / updateLocation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: { id: "u", email: "a@b.c", role: "admin" },
          }),
          { status: 200 },
        ),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    graphqlFetch.mockReset();
  });

  it("forwards severity to updateSignalSeverity", async () => {
    graphqlFetch.mockResolvedValueOnce({ updateSignalSeverity: { id: "sig", severity: 4 } });
    const result = await caller().signals.updateSeverity({ id: "sig", severity: 4 });
    expect(result).toEqual({ id: "sig", severity: 4 });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("updateSignalSeverity");
    expect(vars).toEqual({ id: "sig", severity: 4 });
  });

  it("rejects severity outside 1-5 before calling the API", async () => {
    await expect(caller().signals.updateSeverity({ id: "sig", severity: 9 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("forwards locationId to updateSignalLocation", async () => {
    graphqlFetch.mockResolvedValueOnce({
      updateSignalLocation: { id: "sig", generalLocation: { id: "loc", name: "Kassala" } },
    });
    const result = await caller().signals.updateLocation({ id: "sig", locationId: "loc" });
    expect(result.generalLocation?.name).toBe("Kassala");
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("updateSignalLocation");
    expect(vars).toEqual({ id: "sig", locationId: "loc" });
  });
});

describe("ground.review (clear-api#625 overrides / rejectReason)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: { id: "u", email: "a@b.c", role: "admin" },
          }),
          { status: 200 },
        ),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    graphqlFetch.mockReset();
  });

  it("sends promotion overrides with approve_public", async () => {
    graphqlFetch.mockResolvedValueOnce({ reviewGroundThread: { id: "t1", promotedSignalId: "sig" } });
    await caller().ground.review({
      id: "t1",
      decision: "approve_public",
      overrides: { title: "T", description: "D", severity: 3, locationId: "kas" },
    });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("$overrides: GroundPromotionOverridesInput");
    expect(query).toContain("overrides: $overrides");
    expect(query).toContain("rejectReason: $rejectReason");
    expect(query).toContain("rejectReason");
    expect(vars).toEqual({
      id: "t1",
      decision: "approve_public",
      note: null,
      rejectReason: null,
      overrides: { title: "T", description: "D", severity: 3, locationId: "kas" },
    });
  });

  it("sends a structured rejectReason with reject", async () => {
    graphqlFetch.mockResolvedValueOnce({ reviewGroundThread: { id: "t1" } });
    await caller().ground.review({ id: "t1", decision: "reject", rejectReason: "duplicate" });
    const [, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(vars).toMatchObject({ decision: "reject", rejectReason: "duplicate", overrides: null });
  });

  it("keeps plain decisions (detection drawer) free of overrides", async () => {
    graphqlFetch.mockResolvedValueOnce({ reviewGroundThread: { id: "t1" } });
    await caller().ground.review({ id: "t1", decision: "approve_public" });
    const [, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(vars).toMatchObject({ overrides: null, rejectReason: null });
  });

  it("rejects an unknown reason or out-of-range severity before calling the API", async () => {
    await expect(
      caller().ground.review({ id: "t1", decision: "reject", rejectReason: "boring" as "spam" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller().ground.review({ id: "t1", decision: "approve_public", overrides: { severity: 9 } }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });
});
