import { describe, expect, it } from "vitest";
import {
  classifyObserveSubmitError,
  drainQueuedFieldSignals,
  isObserveQaOverrideAllowed,
  isObservePlatformWriter,
  locationFieldsForPayload,
  parseAtMentionQuery,
  resolveTeamIdForSubmit,
  searchForcesMissingTeam,
  stripTrailingAtMention,
  type QueuedFieldSignal,
} from "./field-signal";

describe("isObservePlatformWriter", () => {
  it("admits admin and analyst, not viewer or empty", () => {
    expect(isObservePlatformWriter("admin")).toBe(true);
    expect(isObservePlatformWriter("analyst")).toBe(true);
    expect(isObservePlatformWriter("viewer")).toBe(false);
    expect(isObservePlatformWriter(undefined)).toBe(false);
  });
});

describe("classifyObserveSubmitError", () => {
  it("treats FORBIDDEN as a missing-team failure, not a queueable network blip", () => {
    expect(classifyObserveSubmitError({ data: { code: "FORBIDDEN" }, message: "FORBIDDEN" })).toBe(
      "noTeam",
    );
    expect(classifyObserveSubmitError(new Error("Forbidden: no team"))).toBe("noTeam");
  });

  it("does not queue generic GraphQL/tRPC failures that merely say failed", () => {
    expect(classifyObserveSubmitError(new Error("GraphQL request failed"))).toBe("other");
    expect(classifyObserveSubmitError(new Error("Something failed"))).toBe("other");
  });

  it("queues only connectivity-shaped errors", () => {
    expect(classifyObserveSubmitError(new TypeError("Failed to fetch"))).toBe("network");
    expect(classifyObserveSubmitError(new Error("Failed to fetch"))).toBe("network");
    expect(classifyObserveSubmitError(new Error("NetworkError when attempting to fetch resource."))).toBe(
      "network",
    );
    expect(classifyObserveSubmitError({ data: { code: "TIMEOUT" }, message: "timeout" })).toBe(
      "network",
    );
  });

  it("does not treat a programming TypeError as a queueable network blip", () => {
    expect(classifyObserveSubmitError(new TypeError("x.foo is not a function"))).toBe("other");
    expect(classifyObserveSubmitError(new TypeError("Cannot read properties of undefined"))).toBe(
      "other",
    );
  });
});

describe("resolveTeamIdForSubmit", () => {
  it("waits while the session query is pending so we do not queue without a team", () => {
    expect(
      resolveTeamIdForSubmit({ meStatus: "pending", defaultTeamId: undefined }),
    ).toEqual({ ok: false, reason: "loading" });
  });

  it("surfaces a dedicated missing-team path when a non-platform user has no team", () => {
    expect(resolveTeamIdForSubmit({ meStatus: "success", defaultTeamId: null })).toEqual({
      ok: false,
      reason: "noTeam",
    });
    expect(
      resolveTeamIdForSubmit({ meStatus: "success", defaultTeamId: "  ", role: "viewer" }),
    ).toEqual({
      ok: false,
      reason: "noTeam",
    });
  });

  it("lets admin/analyst submit without a default team (API ignores teamId for them)", () => {
    expect(
      resolveTeamIdForSubmit({ meStatus: "success", defaultTeamId: null, role: "analyst" }),
    ).toEqual({ ok: true, teamId: undefined });
    expect(
      resolveTeamIdForSubmit({ meStatus: "success", defaultTeamId: undefined, role: "admin" }),
    ).toEqual({ ok: true, teamId: undefined });
  });

  it("passes through the persisted default team", () => {
    expect(resolveTeamIdForSubmit({ meStatus: "success", defaultTeamId: "team-1" })).toEqual({
      ok: true,
      teamId: "team-1",
    });
  });

  it("falls back to the first membership team when defaultTeamId is unset", () => {
    expect(
      resolveTeamIdForSubmit({
        meStatus: "success",
        defaultTeamId: null,
        membershipsStatus: "success",
        membershipTeamIds: ["team-nrc-sdn", "team-other"],
      }),
    ).toEqual({ ok: true, teamId: "team-nrc-sdn" });
  });

  it("waits for memberships before treating a missing default as noTeam", () => {
    expect(
      resolveTeamIdForSubmit({
        meStatus: "success",
        defaultTeamId: null,
        membershipsStatus: "pending",
      }),
    ).toEqual({ ok: false, reason: "loading" });
  });

  it("lets a platform analyst file without a team and without waiting on memberships", () => {
    expect(
      resolveTeamIdForSubmit({
        meStatus: "success",
        defaultTeamId: null,
        membershipsStatus: "pending",
        globalWriter: true,
      }),
    ).toEqual({ ok: true });
  });
});

describe("observe QA missing-team override", () => {
  it("allows the flag in next dev and Vercel preview, never in production", () => {
    expect(isObserveQaOverrideAllowed({ nodeEnv: "development" })).toBe(true);
    expect(isObserveQaOverrideAllowed({ nodeEnv: "production", vercelEnv: "preview" })).toBe(true);
    expect(isObserveQaOverrideAllowed({ nodeEnv: "production", vercelEnv: "production" })).toBe(false);
    expect(isObserveQaOverrideAllowed({ nodeEnv: "production" })).toBe(false);
    expect(isObserveQaOverrideAllowed({ nodeEnv: "production", e2e: "1" })).toBe(true);
  });

  it("reads ?noTeam=1 from the query string", () => {
    expect(searchForcesMissingTeam("?noTeam=1")).toBe(true);
    expect(searchForcesMissingTeam("noTeam")).toBe(true);
    expect(searchForcesMissingTeam("?tab=signals")).toBe(false);
    expect(searchForcesMissingTeam("")).toBe(false);
  });
});

describe("parseAtMentionQuery", () => {
  it("reads hyphenated and unicode place names after @", () => {
    expect(parseAtMentionQuery("Flooding at @Al-Fashir")).toBe("Al-Fashir");
    expect(parseAtMentionQuery("At @El Geneina")).toBe("El Geneina");
    expect(parseAtMentionQuery("At @الفاشر")).toBe("الفاشر");
  });

  it("only matches an @ token at the end of the draft", () => {
    expect(parseAtMentionQuery("no mention")).toBeNull();
    expect(parseAtMentionQuery("see @Khartoum later")).toBe("Khartoum later");
    expect(parseAtMentionQuery("see @Khartoum\nand more")).toBeNull();
  });
});

describe("stripTrailingAtMention", () => {
  it("removes the trailing @ token used by the typeahead", () => {
    expect(stripTrailingAtMention("Flooding @Al-Fashir")).toBe("Flooding ");
  });
});

describe("locationFieldsForPayload", () => {
  it("sends lat/lng for GPS pins and omits locationId", () => {
    expect(
      locationFieldsForPayload({
        locationId: "loc-should-be-ignored",
        gps: { lat: 15.5, lng: 32.5 },
      }),
    ).toEqual({ lat: 15.5, lng: 32.5 });
  });

  it("sends locationId for @ tags so Detection and /map can resolve the place", () => {
    expect(
      locationFieldsForPayload({ locationId: "loc-khartoum", gps: null }),
    ).toEqual({ locationId: "loc-khartoum" });
  });
});

describe("drainQueuedFieldSignals", () => {
  const gpsQueued: QueuedFieldSignal = {
    sourceId: "source-field-officer",
    title: "Checkpoint closed at market",
    description: "Checkpoint closed at market",
    lat: 15.5007,
    lng: 32.5599,
    teamId: "team-nrc-sdn",
  };

  it("does not create while offline — the device queue stays intact", async () => {
    const created: QueuedFieldSignal[] = [];
    const acked: string[] = [];
    const result = await drainQueuedFieldSignals({
      isOnline: false,
      pending: [{ key: "k1", data: gpsQueued }],
      create: async (payload) => {
        created.push(payload);
      },
      acknowledge: async (key) => {
        acked.push(String(key));
      },
    });
    expect(result).toEqual({ sent: 0, stop: "offline" });
    expect(created).toEqual([]);
    expect(acked).toEqual([]);
  });

  it("replays a GPS-queued signal with lat/lng and teamId once online", async () => {
    const created: Array<QueuedFieldSignal & { teamId: string }> = [];
    const acked: string[] = [];
    const result = await drainQueuedFieldSignals({
      isOnline: true,
      pending: [{ key: "k1", data: gpsQueued }],
      fallbackTeamId: "team-should-not-win",
      create: async (payload) => {
        created.push(payload);
      },
      acknowledge: async (key) => {
        acked.push(String(key));
      },
    });
    expect(result).toEqual({ sent: 1, stop: "done" });
    expect(created).toEqual([
      {
        sourceId: "source-field-officer",
        title: "Checkpoint closed at market",
        description: "Checkpoint closed at market",
        lat: 15.5007,
        lng: 32.5599,
        teamId: "team-nrc-sdn",
      },
    ]);
    expect(acked).toEqual(["k1"]);
  });

  it("uses the session default team when the queued row has none", async () => {
    const created: Array<QueuedFieldSignal & { teamId: string }> = [];
    const queued: QueuedFieldSignal = {
      sourceId: "source-field-officer",
      title: "Flooding at school",
      description: "Flooding at school",
      locationId: "loc-khartoum",
    };
    const result = await drainQueuedFieldSignals({
      isOnline: true,
      pending: [{ key: "k2", data: queued }],
      fallbackTeamId: "team-nrc-sdn",
      create: async (payload) => {
        created.push(payload);
      },
      acknowledge: async () => undefined,
    });
    expect(result).toEqual({ sent: 1, stop: "done" });
    expect(created[0]?.teamId).toBe("team-nrc-sdn");
    expect(created[0]?.locationId).toBe("loc-khartoum");
  });

  it("attempts create without a teamId when neither queued nor session team is present", async () => {
    const created: QueuedFieldSignal[] = [];
    const result = await drainQueuedFieldSignals({
      isOnline: true,
      pending: [{ key: "k3", data: { ...gpsQueued, teamId: undefined } }],
      create: async (payload) => {
        created.push(payload);
      },
      acknowledge: async () => undefined,
    });
    expect(result).toEqual({ sent: 1, stop: "done" });
    expect(created).toEqual([{ ...gpsQueued, teamId: undefined }]);
  });

  it("maps FORBIDDEN from a no-team create into stop: noTeam", async () => {
    const created: unknown[] = [];
    const result = await drainQueuedFieldSignals({
      isOnline: true,
      pending: [{ key: "k3", data: { ...gpsQueued, teamId: undefined } }],
      create: async (payload) => {
        created.push(payload);
        throw { data: { code: "FORBIDDEN" }, message: "FORBIDDEN" };
      },
      acknowledge: async () => undefined,
    });
    expect(result).toEqual({ sent: 0, stop: "noTeam" });
    expect(created).toHaveLength(1);
  });

  it("replays a queued signal without a team when the caller is a platform writer", async () => {
    const created: QueuedFieldSignal[] = [];
    const result = await drainQueuedFieldSignals({
      isOnline: true,
      pending: [{ key: "k4", data: { ...gpsQueued, teamId: undefined } }],
      allowMissingTeam: true,
      create: async (payload) => {
        created.push(payload);
      },
      acknowledge: async () => undefined,
    });
    expect(result).toEqual({ sent: 1, stop: "done" });
    expect(created).toHaveLength(1);
    expect(created[0]?.teamId).toBeUndefined();
  });

  it("keeps later items queued when create fails for a non-team reason", async () => {
    const createdTitles: string[] = [];
    const acked: string[] = [];
    const result = await drainQueuedFieldSignals({
      isOnline: true,
      pending: [
        { key: "k1", data: gpsQueued },
        {
          key: "k2",
          data: { ...gpsQueued, title: "Second observation" },
        },
      ],
      create: async (payload) => {
        createdTitles.push(payload.title);
        throw new TypeError("Failed to fetch");
      },
      acknowledge: async (key) => {
        acked.push(String(key));
      },
    });
    expect(result).toEqual({ sent: 0, stop: "createFailed" });
    expect(createdTitles).toEqual(["Checkpoint closed at market"]);
    expect(acked).toEqual([]);
  });

  it("treats FORBIDDEN as noTeam and does not acknowledge", async () => {
    const acked: string[] = [];
    const result = await drainQueuedFieldSignals({
      isOnline: true,
      pending: [{ key: "k1", data: gpsQueued }],
      create: async () => {
        throw { data: { code: "FORBIDDEN" }, message: "FORBIDDEN" };
      },
      acknowledge: async (key) => {
        acked.push(String(key));
      },
    });
    expect(result).toEqual({ sent: 0, stop: "noTeam" });
    expect(acked).toEqual([]);
  });
});
