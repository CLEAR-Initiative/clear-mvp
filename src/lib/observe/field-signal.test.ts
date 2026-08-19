import { describe, expect, it } from "vitest";
import {
  classifyObserveSubmitError,
  locationFieldsForPayload,
  parseAtMentionQuery,
  resolveTeamIdForSubmit,
  stripTrailingAtMention,
} from "./field-signal";

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
});

describe("resolveTeamIdForSubmit", () => {
  it("waits while the session query is pending so we do not queue without a team", () => {
    expect(
      resolveTeamIdForSubmit({ meStatus: "pending", defaultTeamId: undefined }),
    ).toEqual({ ok: false, reason: "loading" });
  });

  it("surfaces a dedicated missing-team path when defaultTeamId is absent", () => {
    expect(resolveTeamIdForSubmit({ meStatus: "success", defaultTeamId: null })).toEqual({
      ok: false,
      reason: "noTeam",
    });
    expect(resolveTeamIdForSubmit({ meStatus: "success", defaultTeamId: "  " })).toEqual({
      ok: false,
      reason: "noTeam",
    });
  });

  it("passes through the persisted default team", () => {
    expect(resolveTeamIdForSubmit({ meStatus: "success", defaultTeamId: "team-1" })).toEqual({
      ok: true,
      teamId: "team-1",
    });
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
