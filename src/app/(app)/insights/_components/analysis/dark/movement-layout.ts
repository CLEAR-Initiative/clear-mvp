import type { SaDisplacementFlow, SaDisplacementPlace } from "~/server/api/mappers/situation-analysis";

/** Arrow length in pixels for a flow that crosses the edge of the analysed area. */
const OUT_LEN = 80;
/** Outline points used to find where an arrow crosses the edge. More only costs time on every map frame. */
const EDGE_SAMPLES = 600;

type Position = number[];
export interface Geometry {
  type: string;
  coordinates?: unknown;
  geometries?: Geometry[];
}

export interface Point {
  x: number;
  y: number;
}

export type FlowKind = "out" | "back" | "unknown";

export interface FlowShape {
  key: string;
  kind: FlowKind;
  /** Quadratic path from start to end. Empty for an arrival whose origin the source does not give. */
  d: string;
  width: number;
  dotted: boolean;
  start: Point;
  startRadius: number;
  /** Where people arrive, for returns. Its radius grows with the number of people when there is no arrow. */
  ring: (Point & { r: number }) | null;
  label: { x: number; y: number; anchor: "start" | "end"; title: string; sub: string | null };
  badge: (Point & { num: number }) | null;
  /** The CLEAR event the movement comes from: its start is marked and its label links there. */
  eventId: string | null;
  /** The origin's name beside the start, when the origin is a place on the map. */
  origin: (Point & { name: string }) | null;
}

function rings(g: Geometry): Position[][] {
  if (g.type === "Polygon") return g.coordinates as Position[][];
  if (g.type === "MultiPolygon") return (g.coordinates as Position[][][]).flat();
  if (g.type === "GeometryCollection") return (g.geometries ?? []).flatMap(rings);
  return [];
}

function positions(g: Geometry): Position[] {
  if (g.type === "Point") return [g.coordinates as Position];
  if (g.type === "MultiPoint") return g.coordinates as Position[];
  return rings(g).flat();
}

/** Several areas as one geometry, for a scope of more than one district. */
export function mergeGeometries(geoms: (Geometry | null | undefined)[]): Geometry | null {
  const polys = geoms.filter((g): g is Geometry => !!g).flatMap((g) => rings(g).map((ring) => [ring]));
  return polys.length > 0 ? { type: "MultiPolygon", coordinates: polys } : null;
}

/** Centre of a geometry's bounding box, as [lon, lat]. */
export function geometryCenter(g: Geometry | null | undefined): [number, number] | null {
  const pts = g ? positions(g) : [];
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p[0]!);
  const ys = pts.map((p) => p[1]!);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/** Whether a [lon, lat] point lies in a polygon geometry (even-odd over all rings, so holes count). */
export function contains(g: Geometry, [x, y]: [number, number]): boolean {
  let inside = false;
  for (const ring of rings(g)) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = [ring[i]![0]!, ring[i]![1]!];
      const [xj, yj] = [ring[j]![0]!, ring[j]![1]!];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function curve(a: Point, b: Point): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // Bow the arrow slightly, as in the design.
  const cx = mx - dy * 0.15;
  const cy = my + dx * 0.15;
  return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q ${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
}

/** The outline point furthest in a direction: where an arrow crosses the edge. */
function edgeToward(outline: Point[], from: Point, dir: Point): Point {
  let best = from;
  let bestDot = -Infinity;
  for (const p of outline) {
    const dot = (p.x - from.x) * dir.x + (p.y - from.y) * dir.y;
    if (dot > bestDot) {
      bestDot = dot;
      best = p;
    }
  }
  // Just inside the edge.
  return { x: best.x - dir.x * 6, y: best.y - dir.y * 6 };
}

function unit(a: Point, b: Point): Point {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

/** Arrow width: 8 for the largest flow, at least 3. Unknown sizes are 2 and dotted. */
function widthFor(people: number | null, largest: number): number {
  if (people == null || largest <= 0) return 2;
  return Math.round((3 + 5 * Math.sqrt(people / largest)) * 2) / 2;
}

/** A place where people were displaced, from a CLEAR event. */
export interface DisplacedPoint {
  id: string;
  lonLat: [number, number];
  people: number;
  name: string | null;
}

export interface PointShape extends Point {
  id: string;
  r: number;
  /** Only the largest points are labelled, so names do not pile up. */
  label: string | null;
  people: number;
}

/** How many displacement points get a name on the map. */
const POINT_LABELS = 8;

export interface LayoutInput {
  flows: SaDisplacementFlow[];
  /** [lon, lat] to pixels on the map, at its current camera. */
  project: (lonLat: [number, number]) => Point;
  /** The map's size in pixels. Arrows and labels stay inside it. */
  size: { w: number; h: number };
  /** The analysed area: the country, or a created analysis' districts or states. */
  scope: Geometry;
  /** Location ids of the analysed area. A flow end named as the whole area has no single point. */
  scopeIds: string[];
  /** Location centres by id, as [lon, lat]. */
  centers: Map<string, [number, number]>;
  /** Centres of countries by name. Most are not locations in clear-api. */
  abroad?: (name: string) => [number, number] | null;
  /** Finding numbers that are on the map. Badges are drawn only for these. */
  badges: Set<number>;
  /** Places where events displaced people, drawn as circles sized by the number of people. */
  points?: DisplacedPoint[];
}

export interface MovementLayout {
  flows: FlowShape[];
  points: PointShape[];
}

type Placed = { kind: "in"; p: Point } | { kind: "away"; dir: Point } | { kind: "scope" };

/**
 * Lay out the flows over the map of the analysed area. A place inside the area is drawn
 * where it is. A place outside it (another state, another country) is a
 * direction: the arrow crosses the area's edge facing it. An end named as the
 * area itself, or not named, starts or ends at that edge. A flow whose places
 * are unknown or all outside the area is left out rather than guessed.
 */
export function layoutMovement(input: LayoutInput): MovementLayout | null {
  const { flows, project, size, scope, scopeIds, centers, abroad, badges, points = [] } = input;
  const { w: W, h: H } = size;
  const middle = geometryCenter(scope);
  if (!middle || W <= 0 || H <= 0) return null;
  const center = project(middle);
  const ring = rings(scope).flat();
  const stride = Math.max(1, Math.ceil(ring.length / EDGE_SAMPLES));
  const edge = ring.filter((_, i) => i % stride === 0).map((p) => project([p[0]!, p[1]!]));
  const largest = Math.max(0, ...flows.map((f) => f.people ?? 0));

  const placed = (place: SaDisplacementPlace): Placed | null => {
    if (place.id && scopeIds.includes(place.id)) return { kind: "scope" };
    const c = (place.id ? centers.get(place.id) : undefined) ?? (place.name ? abroad?.(place.name) : null);
    if (!c) return null;
    const p = project(c);
    return contains(scope, c) ? { kind: "in", p } : { kind: "away", dir: unit(center, p) };
  };

  // Two movements along the same route would draw on top of each other: keep the larger.
  const route = (f: SaDisplacementFlow) =>
    `${f.direction}|${f.from.id ?? f.from.name ?? ""}|${f.to.id ?? f.to.name ?? ""}`;
  const largestOnRoute = new Map<string, SaDisplacementFlow>();
  for (const f of flows) {
    const kept = largestOnRoute.get(route(f));
    if (!kept || (f.people ?? 0) > (kept.people ?? 0)) largestOnRoute.set(route(f), f);
  }

  const shapes = flows.flatMap((flow, i): FlowShape[] => {
    if (largestOnRoute.get(route(flow)) !== flow) return [];
    const a = placed(flow.from);
    const b = placed(flow.to);
    let start: Point;
    let end: Point;
    let arrival = false;
    if (a?.kind === "in" && b?.kind === "in") {
      start = a.p;
      end = b.p;
    } else if (b?.kind === "away") {
      if (a?.kind === "away") return [];
      // Leaving the area, towards the destination.
      const border = edgeToward(edge, center, b.dir);
      start = a?.kind === "in" ? a.p : border;
      end = { x: border.x + b.dir.x * OUT_LEN, y: border.y + b.dir.y * OUT_LEN };
    } else if (a?.kind === "away") {
      // Arriving from outside the area.
      const border = edgeToward(edge, center, a.dir);
      start = { x: border.x + a.dir.x * OUT_LEN * 0.6, y: border.y + a.dir.y * OUT_LEN * 0.6 };
      end = b?.kind === "in" ? b.p : { x: border.x - a.dir.x * 30, y: border.y - a.dir.y * 30 };
    } else if (b?.kind === "in") {
      // An arrival whose origin the source does not give: a circle where people arrive, no invented arrow.
      end = b.p;
      start = b.p;
      arrival = true;
    } else if (flow.direction === "out") {
      // A destination the source does not break down: up and dotted.
      start = a?.kind === "in" ? a.p : edgeToward(edge, center, { x: 0, y: -1 });
      end = { x: start.x, y: start.y - OUT_LEN * 1.8 };
    } else {
      return [];
    }
    // A real place stays where it is: pinning it to the edge would put its circle and
    // name over another place. A movement whose known destination is out of view is
    // left out; the drawn edge and stub points are kept inside the map.
    const knownStart = a?.kind === "in" || arrival;
    const knownEnd = b?.kind === "in";
    if (knownEnd && (end.x < 0 || end.x > W || end.y < 0 || end.y > H)) return [];
    if (!knownEnd) end = { x: clamp(end.x, 10, W - 10), y: clamp(end.y, 10, H - 10) };
    if (!knownStart) start = { x: clamp(start.x, 10, W - 10), y: clamp(start.y, 10, H - 10) };

    const kind: FlowKind = flow.direction === "back" ? "back" : flow.people == null ? "unknown" : "out";
    const width = widthFor(flow.people, largest);
    const arrowless = arrival;
    const ringR = arrowless ? 6 + 10 * Math.sqrt((flow.people ?? 0) / Math.max(1, largest)) : 6;
    // Stop short of the ring so the arrowhead stays visible.
    const tip = unit(start, end);
    const drawnEnd = kind === "back" && !arrowless ? { x: end.x - tip.x * (ringR + 4), y: end.y - tip.y * (ringR + 4) } : end;
    const leftHalf = end.x < W / 2;
    const nearRight = end.x > W - 180;
    const anchor: "start" | "end" = nearRight && !leftHalf ? "end" : "start";
    const going = unit(start, end);
    const label = {
      x: clamp(anchor === "start" ? (leftHalf && end.x < 140 ? 16 : end.x + 14) : end.x - 14, 12, W - 12),
      y: clamp(going.y > 0.6 ? end.y + 10 : end.y - 22, 22, H - 20),
      anchor,
      title: flow.label,
      sub: flow.sublabel,
    };
    // Beside where the arrow starts, as in the design, so it never covers the label at the end.
    const beside = { x: start.x - going.x * 6 + going.y * 18, y: start.y - going.y * 6 - going.x * 18 };
    return [
      {
        key: `${i}`,
        kind,
        d: arrowless ? "" : curve(start, drawnEnd),
        width,
        dotted: kind === "unknown",
        start,
        startRadius: kind === "unknown" ? 3 : Math.max(3.5, width * 0.75),
        ring: kind === "back" || arrowless ? { ...end, r: ringR } : null,
        label,
        badge: flow.finding != null && badges.has(flow.finding) ? { ...beside, num: flow.finding } : null,
        eventId: flow.eventId,
        origin: a?.kind === "in" && flow.from.name && !arrival ? { x: start.x, y: start.y + 16, name: flow.from.name } : null,
      },
    ];
  });

  // Several movements can end at the same place: move a label down until it clears the ones
  // already placed, and name each origin once.
  const taken: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const box = (l: FlowShape["label"]) => {
    const w = 7 * Math.max(l.title.length, l.sub?.length ?? 0);
    const x0 = l.anchor === "start" ? l.x : l.x - w;
    return { x0, x1: x0 + w, y0: l.y - 12, y1: l.y + (l.sub ? 18 : 4) };
  };
  const clashes = (b: ReturnType<typeof box>) => taken.some((t) => b.x0 < t.x1 && t.x0 < b.x1 && b.y0 < t.y1 && t.y0 < b.y1);
  const originsNamed = new Set<string>();
  for (const s of shapes) {
    for (let tries = 0; tries < 8 && clashes(box(s.label)); tries++) {
      s.label.y = clamp(s.label.y + 32, 22, H - 20);
    }
    taken.push(box(s.label));
    if (s.origin) {
      if (originsNamed.has(s.origin.name)) s.origin = null;
      else originsNamed.add(s.origin.name);
    }
  }

  const biggest = Math.max(1, ...points.map((p) => p.people));
  const named = new Set([...points].sort((a, b) => b.people - a.people).slice(0, POINT_LABELS).map((p) => p.id));
  const pointShapes = points.flatMap((p): PointShape[] => {
    if (!contains(scope, p.lonLat)) return [];
    const q = project(p.lonLat);
    if (q.x < 0 || q.y < 0 || q.x > W || q.y > H) return [];
    return [{ ...q, id: p.id, r: 4 + 14 * Math.sqrt(p.people / biggest), label: named.has(p.id) ? p.name : null, people: p.people }];
  });

  return { flows: shapes, points: pointShapes };
}
