import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Detection list routes (signalsPage / eventsPage / alertsPage) must not ship
 * admin polygons to the browser: a country- or state-tagged row used to carry
 * the full outline, and nested event signals multiplied it by up to 150.
 */

const graphqlFetch = vi.fn();
vi.mock("~/server/api/graphql", () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  cookieHeaders: () => ({ Cookie: "better-auth.session_token=x" }),
}));

const { createCaller } = await import("~/server/api/root");

function caller() {
  return createCaller({ headers: new Headers({ cookie: "better-auth.session_token=x" }) });
}

const square = {
  type: "Polygon",
  coordinates: [[[30, 10], [40, 10], [40, 20], [30, 20], [30, 10]]],
};
const centroid = { type: "Point", coordinates: [34, 14] };
const point = { type: "Point", coordinates: [32.5, 15.6] };

const location = (geometry: unknown) => ({ id: "loc", name: "Sudan", level: 0, geometry, ancestorIds: [] });

function event() {
  return {
    id: "ev1",
    title: "Flood",
    types: ["fl"],
    generalLocation: location(square),
    originLocation: null,
    destinationLocation: null,
    representativePoint: location(point),
    signals: [{ id: "s1", source: { name: "dataminr" } }],
    alerts: [],
  };
}

const page = <T,>(items: T[]) => ({ items, totalCount: items.length, hasMore: false });

describe("detection list payloads", () => {
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

  it("signalsPage replaces polygons with their centroid", async () => {
    graphqlFetch.mockResolvedValueOnce({
      signalsPage: page([
        { id: "s1", generalLocation: location(square), originLocation: location(point), destinationLocation: null },
      ]),
    });

    const result = await caller().signals.signalsPage({ limit: 25 });

    expect(result.items[0]!.generalLocation?.geometry).toEqual(centroid);
    expect(result.items[0]!.originLocation?.geometry).toEqual(point);
  });

  it("eventsPage asks for representativePoint and no nested signal locations", async () => {
    graphqlFetch.mockResolvedValueOnce({ eventsPage: page([event()]) });

    const result = await caller().alerts.eventsPage({ limit: 25 });

    const query = graphqlFetch.mock.calls[0]![0] as string;
    const nestedSignals = /signals \{([^}]*\{[^}]*\})*[^}]*\}/.exec(query)?.[0] ?? "";
    expect(query).toContain("representativePoint");
    expect(nestedSignals).toContain("source { name }");
    expect(nestedSignals).not.toMatch(/Location|geometry/);

    expect(result.items[0]!.generalLocation?.geometry).toEqual(centroid);
    expect(result.items[0]!.representativePoint?.geometry).toEqual(point);
  });

  it("alertsPage sanitizes the wrapped event", async () => {
    graphqlFetch.mockResolvedValueOnce({
      alertsPage: page([{ id: "a1", status: "published", event: event() }]),
    });

    const result = await caller().alerts.alertsPage({ limit: 25 });

    expect(result.items[0]!.event.generalLocation?.geometry).toEqual(centroid);
  });
});
