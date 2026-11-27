import { describe, expect, it } from "vitest";
import type { GqlLocation } from "~/lib/types/graphql";
import { alertDetection, detectionsQueryInput, eventDetection, signalDetection } from "./use-detections-for-map";

function place(id: string, lng: number, lat: number): GqlLocation {
  return { id, name: id, level: 2, geometry: { type: "Point", coordinates: [lng, lat] } } as GqlLocation;
}

const area = { id: "area", name: "Area", level: 1, geometry: { type: "Polygon", coordinates: [] } } as GqlLocation;

const event = {
  id: "e1",
  title: "Floods",
  severity: 4,
  firstSignalCreatedAt: "2026-11-20T00:00:00.000Z",
  representativePoint: place("event-point", 30, 15),
};

describe("map detections", () => {
  it("places a signal on its first point location and dates it by publication", () => {
    const detection = signalDetection({
      id: "s1",
      title: "Shelling",
      severity: 5,
      publishedAt: "2026-11-21T00:00:00.000Z",
      generalLocation: area,
      originLocation: place("origin", 31, 16),
      destinationLocation: null,
    });

    expect(detection).toEqual({
      id: "s1",
      title: "Shelling",
      severity: 5,
      date: "2026-11-21T00:00:00.000Z",
      point: [31, 16],
      location: area,
    });
  });

  it("places an event on its representative point and dates it by its first signal", () => {
    expect(eventDetection(event)).toEqual({
      id: "e1",
      title: "Floods",
      severity: 4,
      date: "2026-11-20T00:00:00.000Z",
      point: [30, 15],
      location: event.representativePoint,
    });
  });

  it("gives an alert its own id and point, and its event's id, title, severity and date", () => {
    const own = place("alert-point", 32, 17);
    expect(alertDetection({ id: "a1", representativePoint: own, event })).toEqual({
      id: "a1",
      title: "Floods",
      severity: 4,
      date: "2026-11-20T00:00:00.000Z",
      point: [32, 17],
      location: own,
      eventId: "e1",
    });
  });

  it("falls back to the event's point for an alert without one", () => {
    expect(alertDetection({ id: "a1", representativePoint: null, event }).point).toEqual([30, 15]);
  });
});

describe("detectionsQueryInput", () => {
  const range = { from: "2026-10-27T00:00:00.000Z" };
  it("asks for published alerts only", () => {
    expect(detectionsQueryInput("alert", range, null)).toEqual({ ...range, includeDummy: true, status: "published" });
  });
  it("sends no status for events and signals", () => {
    expect(detectionsQueryInput("event", range, null)).not.toHaveProperty("status");
    expect(detectionsQueryInput("signal", range, null)).not.toHaveProperty("status");
  });
});
