import { describe, expect, it } from "vitest";
import { boundaryRequest } from "../boundaries/model";
import { detectionsQueryInput } from "../hooks/use-detections-for-map";
import type { TimelineExtent } from "../timeframe/model";
import { dailyCountsInput } from "../timeline/use-daily-counts";
import { placeLocationId, type MapPlace } from "./model";

const extent: TimelineExtent = {
  startMs: Date.parse("2026-08-29T00:00:00.000Z"),
  from: "2026-08-29T00:00:00.000Z",
  to: "2026-11-26T23:59:59.999Z",
};
const scope = { scopeReady: true, countries: [{ id: "sd" }, { id: "td" }] };

const global: MapPlace = { kind: "global" };
const sudan: MapPlace = { kind: "country", id: "sd", name: "Sudan" };
const khartoum: MapPlace = { kind: "state", id: "sd-kh", name: "Khartoum", country: { id: "sd", name: "Sudan" } };

function inputs(place: MapPlace) {
  const locationId = placeLocationId(place);
  return {
    detections: detectionsQueryInput("alert", { from: extent.from, to: extent.to }, locationId),
    counts: dailyCountsInput("alert", extent, locationId),
  };
}

describe("place query inputs", () => {
  it("filters neither the map nor the timeline on Global", () => {
    const { detections, counts } = inputs(global);
    expect(detections).not.toHaveProperty("locationId");
    expect(counts).not.toHaveProperty("locationId");
  });

  it("filters the map and the timeline to the same state", () => {
    const { detections, counts } = inputs(khartoum);
    expect(detections).toHaveProperty("locationId", "sd-kh");
    expect(counts).toHaveProperty("locationId", "sd-kh");
  });

  it("draws every scope country's boundaries on Global", () => {
    expect(boundaryRequest("state", scope, global)).toEqual({ level: 1, countryIds: ["sd", "td"] });
  });

  it("draws one country's boundaries on a country", () => {
    expect(boundaryRequest("districts", scope, sudan)).toEqual({ level: 2, countryId: "sd" });
  });

  it("draws one state's boundaries on a state", () => {
    expect(boundaryRequest("districts", scope, khartoum)).toEqual({ level: 2, stateId: "sd-kh" });
  });
});

describe("filter query inputs", () => {
  const range = { from: extent.from, to: extent.to };
  const codes = ["ba", "bg", "bo"];

  it("sends the crisis type to the event layer and its counts", () => {
    expect(detectionsQueryInput("event", range, null, codes)).toHaveProperty("eventTypes", codes);
    expect(dailyCountsInput("event", extent, null, codes)).toHaveProperty("eventTypes", codes);
  });

  it("never sends it for signals", () => {
    expect(detectionsQueryInput("signal", range, null, codes)).not.toHaveProperty("eventTypes");
    expect(dailyCountsInput("signal", extent, null, codes)).not.toHaveProperty("eventTypes");
  });
});
