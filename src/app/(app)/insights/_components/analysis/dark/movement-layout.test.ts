import { describe, expect, it } from "vitest";
import type { SaDisplacementFlow } from "~/server/api/mappers/situation-analysis";
import { contains, layoutMovement, type Geometry } from "./movement-layout";

/** A plain map view: 25 px per degree, north up, 660 by 440. */
const view = {
  project: ([lon, lat]: [number, number]) => ({ x: (lon - 15) * 25, y: (25 - lat) * 25 }),
  size: { w: 660, h: 440 },
};

/** A square country from 20°E to 30°E and 10°N to 20°N. */
const country: Geometry = {
  type: "Polygon",
  coordinates: [[[20, 10], [30, 10], [30, 20], [20, 20], [20, 10]]],
};

function flow(over: Partial<SaDisplacementFlow>): SaDisplacementFlow {
  return {
    direction: "out",
    group: "idp",
    from: { id: null, name: null },
    to: { id: null, name: null },
    label: "Flow",
    sublabel: null,
    people: null,
    finding: null,
    refs: [],
    eventId: null,
    ...over,
  };
}

/** The middle of the square country and of the district, on the map. */
const middle = view.project([25, 15]);
const districtMiddle = view.project([27.5, 12.5]);

describe("layoutMovement", () => {
  const centers = new Map<string, [number, number]>([
    ["south", [25, 0]],
    ["west", [10, 15]],
    ["city", [26, 16]],
    ["camp", [28, 12]],
  ]);

  it("draws a flow leaving the country from its border towards the destination", () => {
    const layout = layoutMovement({
      ...view,
      flows: [flow({ to: { id: "south", name: "South" }, people: 1_300_000, finding: 3 })],
      scope: country,
      scopeIds: ["sq"],
      centers,
      badges: new Set([3]),
    })!;
    const [f] = layout.flows;
    expect(f!.kind).toBe("out");
    expect(f!.width).toBe(8);
    // Leaves through the southern border, pointing down.
    expect(f!.start.y).toBeGreaterThan(middle.y);
    expect(f!.d).toMatch(/^M/);
    expect(f!.badge).toMatchObject({ num: 3 });
  });

  it("sizes flows against the largest and draws unknown sizes dotted", () => {
    const layout = layoutMovement({
      ...view,
      flows: [
        flow({ to: { id: "south", name: "South" }, people: 1_000_000 }),
        flow({ to: { id: "west", name: "West" }, people: 10_000 }),
        flow({ label: "Other countries" }),
      ],
      scope: country,
      scopeIds: ["sq"],
      centers,
      badges: new Set(),
    })!;
    expect(layout.flows.map((f) => f.width)).toEqual([8, 3.5, 2]);
    expect(layout.flows[2]).toMatchObject({ kind: "unknown", dotted: true });
  });

  it("marks a return without a known origin as a circle where people arrive, with no invented arrow", () => {
    const layout = layoutMovement({
      ...view,
      flows: [flow({ direction: "back", to: { id: "city", name: "City" }, people: 2_100_000 })],
      scope: country,
      scopeIds: ["sq"],
      centers,
      badges: new Set(),
    })!;
    const [f] = layout.flows;
    expect(f!.d).toBe("");
    expect(f!.ring).toMatchObject(view.project([26, 16]));
    expect(f!.ring!.r).toBeGreaterThan(6);
  });

  it("ends a return at its destination with a ring, and badges only listed findings", () => {
    const layout = layoutMovement({
      ...view,
      flows: [flow({ direction: "back", from: { id: "camp", name: "Camp" }, to: { id: "city", name: "City" }, people: 2_600_000, finding: 4 })],
      scope: country,
      scopeIds: ["sq"],
      centers,
      badges: new Set([1]),
    })!;
    const [f] = layout.flows;
    expect(f!.kind).toBe("back");
    expect(f!.ring).toMatchObject(view.project([26, 16]));
    // The arrow stops short of the ring, so its head is not hidden under it.
    const ring = view.project([26, 16]);
    const end = f!.d.split(" ").pop()!.split(",").map(Number);
    expect(Math.hypot(end[0]! - ring.x, end[1]! - ring.y)).toBeGreaterThan(6);
    expect(f!.badge).toBeNull();
  });

  it("leaves out flows it cannot place", () => {
    const layout = layoutMovement({
      ...view,
      flows: [
        flow({ direction: "back", to: { id: "nowhere", name: "Nowhere" } }),
        flow({ direction: "within", from: { id: "camp", name: "Camp" }, to: { id: null, name: "Unknown" } }),
        flow({ direction: "within", from: { id: "camp", name: "Camp" }, to: { id: "city", name: "City" }, people: 20_000 }),
      ],
      scope: country,
      scopeIds: ["sq"],
      centers,
      badges: new Set(),
    })!;
    expect(layout.flows).toHaveLength(1);
  });
});

describe("layoutMovement abroad", () => {
  it("points a flow to a country off the map from the border facing it", () => {
    const layout = layoutMovement({
      ...view,
      flows: [flow({ to: { id: null, name: "Westland" }, people: 900_000 })],
      scope: country,
      scopeIds: ["sq"],
      centers: new Map(),
      abroad: (name) => (name === "Westland" ? [5, 15] : null),
      badges: new Set(),
    })!;
    const [f] = layout.flows;
    // Leaves through the western border and points west.
    expect(f!.start.x).toBeLessThan(middle.x);
    expect(f!.d).toMatch(/ Q /);
    const end = f!.d.split(" ").pop()!.split(",").map(Number);
    expect(end[0]).toBeLessThan(f!.start.x);
  });

  it("starts a return from abroad at the border facing that country", () => {
    const layout = layoutMovement({
      ...view,
      flows: [flow({ direction: "back", from: { id: null, name: "Northland" }, to: { id: "city", name: "City" }, people: 53_000 })],
      scope: country,
      scopeIds: ["sq"],
      centers: new Map([["city", [26, 16]]]),
      abroad: (name) => (name === "Northland" ? [25, 40] : null),
      badges: new Set(),
    })!;
    const [f] = layout.flows;
    expect(f!.kind).toBe("back");
    // Enters from the north.
    expect(f!.start.y).toBeLessThan(middle.y);
  });
});

describe("layoutMovement for a district", () => {
  /** A district in the south-east of the square country. */
  const district: Geometry = {
    type: "Polygon",
    coordinates: [[[26, 11], [29, 11], [29, 14], [26, 14], [26, 11]]],
  };
  const centers = new Map<string, [number, number]>([
    ["town", [27.5, 12.5]],
    ["capital", [22, 18]],
    ["other", [21, 11]],
  ]);
  const scoped = (flows: SaDisplacementFlow[]) =>
    layoutMovement({ ...view, flows, scope: district, scopeIds: ["dist"], centers, badges: new Set() })!;

  it("draws the places where events displaced people, sized by people, and names the largest", () => {
    const layout = layoutMovement({
      ...view,
      flows: [],
      scope: district,
      scopeIds: ["dist"],
      centers,
      badges: new Set(),
      points: [
        { id: "ev-big", lonLat: [27, 12], people: 31_287, name: "Gebrat Al Sheikh" },
        { id: "ev-small", lonLat: [28, 13], people: 1_920, name: "Sodari" },
        { id: "ev-outside", lonLat: [21, 18], people: 50_000, name: "Elsewhere" },
      ],
    })!;
    expect(contains(district, [27.5, 12.5])).toBe(true);
    // Points outside the analysed area are not drawn.
    expect(layout.points.map((p) => p.id)).toEqual(["ev-big", "ev-small"]);
    expect(layout.points[0]!.r).toBeGreaterThan(layout.points[1]!.r);
    expect(layout.points[0]!.label).toBe("Gebrat Al Sheikh");
    expect(contains(district, [22, 18])).toBe(false);
  });

  it("draws people leaving the district towards a place outside it", () => {
    const layout = scoped([flow({ from: { id: "dist", name: "District" }, to: { id: "capital", name: "Capital" }, people: 5_000 })]);
    const [f] = layout.flows;
    // Leaves through the north-west edge.
    expect(f!.start.x).toBeLessThan(districtMiddle.x);
    expect(f!.start.y).toBeLessThan(districtMiddle.y);
  });

  it("draws people arriving from outside to a town in the district", () => {
    const layout = scoped([flow({ direction: "within", from: { id: "other", name: "Other" }, to: { id: "town", name: "Town" }, people: 300 })]);
    expect(layout.flows).toHaveLength(1);
    // Comes in from the west, outside the district, and ends at the town in its middle.
    expect(layout.flows[0]!.start.x).toBeLessThan(districtMiddle.x);
    expect(layout.flows[0]!.d).toMatch(new RegExp(`${districtMiddle.x.toFixed(1)},${districtMiddle.y.toFixed(1)}$`));
  });

  it("leaves out a movement that neither starts nor ends in the district", () => {
    expect(scoped([flow({ direction: "within", from: { id: "other", name: "Other" }, to: { id: "capital", name: "Capital" } })]).flows).toEqual([]);
  });

  it("draws one arrow for two movements along the same route, the larger", () => {
    const layout = scoped([
      flow({ from: { id: "town", name: "Town" }, to: { id: "capital", name: "Capital" }, people: 1_920, label: "small" }),
      flow({ from: { id: "town", name: "Town" }, to: { id: "capital", name: "Capital" }, people: 31_287, label: "large" }),
    ]);
    expect(layout.flows.map((f) => f.label.title)).toEqual(["large"]);
  });

  it("names the origin beside the start when it is a place on the map", () => {
    const layout = scoped([flow({ from: { id: "town", name: "Town" }, to: { id: "capital", name: "Capital" }, people: 10 })]);
    expect(layout.flows[0]!.origin).toMatchObject({ name: "Town" });
  });

  it("carries the event a movement comes from", () => {
    const layout = scoped([flow({ from: { id: "town", name: "Town" }, to: { id: "capital", name: "Capital" }, eventId: "ev-1" })]);
    expect(layout.flows[0]!.eventId).toBe("ev-1");
  });
});
