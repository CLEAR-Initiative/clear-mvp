import { describe, expect, it } from "vitest";
import { itemPreviewTarget } from "./preview-target";

const snapshot = (url: string) => ({ title: "t", severity: null, locationName: null, eventTypes: [], occurredAt: "", url });

describe("itemPreviewTarget", () => {
  it("opens an Alert item's Event, read from its snapshot URL", () => {
    expect(itemPreviewTarget({ kind: "alert", entityId: "al1", snapshot: snapshot("https://app/event/ev9?from=email") })).toEqual({
      kind: "event",
      eventId: "ev9",
    });
  });

  it("opens Events and Signals by their own id", () => {
    expect(itemPreviewTarget({ kind: "event", entityId: "ev1", snapshot: snapshot("") })).toEqual({ kind: "event", eventId: "ev1" });
    expect(itemPreviewTarget({ kind: "signal", entityId: "s1", snapshot: snapshot("") })).toEqual({ kind: "signal", signalId: "s1" });
  });

  it("opens nothing for an Alert whose URL names no Event", () => {
    expect(itemPreviewTarget({ kind: "alert", entityId: "al1", snapshot: snapshot("") })).toBeNull();
  });
});
