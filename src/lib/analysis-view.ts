import type { AnalysisEvent, AnalysisFigure, AnalysisFigures } from "~/server/api/routers/analysis";
import type { Analysis } from "~/server/api/mappers/analysis";

/** Events per admin-1 area, most first. Events with no area are left out. */
export function eventsByArea(events: AnalysisEvent[]): { id: string; name: string; count: number }[] {
  const byId = new Map<string, { id: string; name: string; count: number }>();
  for (const e of events) {
    if (!e.admin1) continue;
    const row = byId.get(e.admin1.id) ?? { ...e.admin1, count: 0 };
    row.count += 1;
    byId.set(e.admin1.id, row);
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export interface TimelineDot {
  event: AnalysisEvent;
  /** 0..1 position along the axis. */
  x: number;
}

export interface TimelineLayout {
  months: { label: Date; x: number }[];
  dots: TimelineDot[];
  /** The most severe events, oldest first, to label under the axis. */
  highlights: TimelineDot[];
}

/**
 * Place events on a horizontal axis from `start` to `end`. Events outside the
 * window are dropped; highlights are the `maxHighlights` most severe (ties go
 * to the most recent).
 */
export function timelineLayout(
  events: AnalysisEvent[],
  start: Date,
  end: Date,
  maxHighlights = 4,
): TimelineLayout {
  const t0 = start.getTime();
  const span = Math.max(end.getTime() - t0, 1);
  const pos = (t: number) => (t - t0) / span;

  const months: TimelineLayout["months"] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    if (cursor.getTime() >= t0) months.push({ label: new Date(cursor), x: pos(cursor.getTime()) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const dots = events
    .map((event) => ({ event, t: Date.parse(event.startedAt) }))
    .filter(({ t }) => Number.isFinite(t) && t >= t0 && t <= end.getTime())
    .sort((a, b) => a.t - b.t)
    .map(({ event, t }) => ({ event, x: pos(t) }));

  const highlights = [...dots]
    .sort(
      (a, b) =>
        (b.event.severity ?? 0) - (a.event.severity ?? 0) ||
        Date.parse(b.event.startedAt) - Date.parse(a.event.startedAt),
    )
    .slice(0, maxHighlights)
    .sort((a, b) => a.x - b.x);

  return { months, dots, highlights };
}

/** Funding received vs required, as shares. Null unless both are known. */
export function fundingSplit(
  received: number | null,
  required: number | null,
): { receivedShare: number; gap: number; gapShare: number } | null {
  if (received == null || required == null || required <= 0) return null;
  const receivedShare = Math.min(received / required, 1);
  return { receivedShare, gap: Math.max(required - received, 0), gapShare: 1 - receivedShare };
}

/** Default scope when the team has no single working country. */
export const DEFAULT_COUNTRY = "Sudan";

/**
 * The country the analysis page shows: the user's pick, else the app-wide
 * working country, else Sudan, else the first option. A multi-country team
 * with no working country ("all assigned") still gets one concrete scope.
 */
export function pickCountry(
  options: readonly { id: string; name: string }[],
  picked: string | null,
  workingId: string | null,
): { id: string; name: string } | null {
  return (
    options.find((c) => c.id === picked) ??
    options.find((c) => c.id === workingId) ??
    options.find((c) => c.name === DEFAULT_COUNTRY) ??
    options[0] ??
    null
  );
}

/** Update frequencies a user may pick for a created analysis (clear-api cadence strings). */
export const ANALYSIS_CADENCES = ["daily", "weekly", "monthly"] as const;
export type AnalysisCadence = (typeof ANALYSIS_CADENCES)[number];

const CADENCE_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };

/**
 * Stale when the latest version is older than its update frequency plus a
 * day's grace (a weekly run lands on a schedule, not to the minute).
 */
export function isStale(generatedAt: string | null, cadence: string, now: Date = new Date()): boolean {
  if (!generatedAt) return false;
  const days = CADENCE_DAYS[cadence] ?? 7;
  return now.getTime() - Date.parse(generatedAt) > (days + 1) * 86_400_000;
}

/** Districts one created analysis may cover (the events fetch runs per district). */
export const MAX_CREATED_LOCATIONS = 10;

/** Days of history a created analysis covers when it is set up. */
export const CREATED_WINDOW_DAYS = 90;

/** UTC midnight `days` before `now`: the created analysis' window start. */
export function createdWindowStart(now: Date = new Date(), days = CREATED_WINDOW_DAYS): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
  return d.toISOString();
}

export interface LabelLocation {
  id: string;
  name: string;
  parent: { id: string; name: string } | null;
  ancestors?: { id: string; name: string; level: number }[] | null;
}

/**
 * Name for a set of locations, mirroring the pipeline's `scope_label`:
 * "Sheikan, North Kordofan, Sudan" or "Sheikan and Um Rawaba, North Kordofan,
 * Sudan"; past `maxNames` the rest are counted.
 */
export function scopeLabel(locations: LabelLocation[], maxNames = 3): string {
  if (locations.length === 0) return "";
  const names = locations.map((l) => l.name);
  const listed =
    names.length > maxNames
      ? `${names.slice(0, maxNames).join(", ")} and ${names.length - maxNames} more`
      : names.length > 1
        ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
        : names[0]!;
  // Ancestor chains, root first (level ascending).
  const chains = locations.map((l) =>
    [...(l.ancestors ?? [])].sort((a, b) => a.level - b.level).map((a) => a.name),
  );
  const shared: string[] = [];
  for (let i = 0; ; i++) {
    const at = chains.map((c) => c[i]);
    if (at.some((n) => n === undefined) || new Set(at).size !== 1) break;
    shared.push(at[0]!);
  }
  return [listed, ...shared.reverse()].join(", ");
}

type Coords = unknown[];

/**
 * One MultiPolygon from several Polygon / MultiPolygon geometries, so the map
 * can fit and outline a multi-district scope. Other geometry types are skipped.
 */
export function combineGeometries(
  geometries: unknown[],
): { type: "MultiPolygon"; coordinates: Coords[] } | null {
  const polygons: Coords[] = [];
  for (const g of geometries) {
    const geo = g as { type?: string; coordinates?: Coords } | null;
    if (!geo?.coordinates) continue;
    if (geo.type === "Polygon") polygons.push(geo.coordinates);
    else if (geo.type === "MultiPolygon") polygons.push(...(geo.coordinates as Coords[]));
  }
  return polygons.length > 0 ? { type: "MultiPolygon", coordinates: polygons } : null;
}

/** Same districts, any order. */
export function sameLocations(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

type Ring = [number, number][];

function inRing([x, y]: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Whether a [lng, lat] point falls inside a Polygon / MultiPolygon (holes excluded). */
export function containsPoint(geometry: unknown, point: [number, number]): boolean {
  const geo = geometry as { type?: string; coordinates?: unknown } | null;
  if (!geo?.coordinates) return false;
  const polygons =
    geo.type === "Polygon"
      ? [geo.coordinates as Ring[]]
      : geo.type === "MultiPolygon"
        ? (geo.coordinates as Ring[][])
        : [];
  return polygons.some(
    ([outer, ...holes]) => !!outer && inRing(point, outer) && !holes.some((h) => inRing(point, h)),
  );
}

export interface PickableArea {
  id: string;
  level: 1 | 2;
  /** The state a district belongs to; null for a state. */
  stateId: string | null;
}

/**
 * Add an area to a created-analysis selection. A state absorbs its districts
 * (the analysis covers the state's whole subtree); a district inside an
 * already selected state is already covered and is not added.
 */
export function addArea(selected: string[], area: PickableArea, byId: Map<string, PickableArea>): string[] {
  if (selected.includes(area.id)) return selected;
  if (area.level === 2 && area.stateId && selected.includes(area.stateId)) return selected;
  const kept = area.level === 1 ? selected.filter((id) => byId.get(id)?.stateId !== area.id) : selected;
  return [...kept, area.id];
}

export interface KpiValues {
  inside: number | null;
  abroad: number | null;
  displacedTotal: number | null;
  returned: number | null;
  inNeed: AnalysisFigure | null;
  fundingReceived: number | null;
  fundingRequired: number | null;
}

/**
 * The headline figures shown in the KPI cards and the report. Stock figures
 * prefer the location's all-time aggregation (countries only) and fall back to
 * the analysis' own datapoints; funding reads only the analysis window.
 */
export function kpiValues(data: Analysis, figures: AnalysisFigures | undefined): KpiValues {
  const inside = figures?.idpStock?.value ?? data.figures.displaced;
  const abroad = figures?.refugees?.value ?? null;
  return {
    inside,
    abroad,
    displacedTotal: inside != null || abroad != null ? (inside ?? 0) + (abroad ?? 0) : null,
    returned: figures?.returneeStock?.value ?? data.figures.returnees,
    inNeed:
      figures?.overallPin ??
      (data.figures.inNeed != null ? { value: data.figures.inNeed, low: null, high: null, newestAt: null } : null),
    fundingReceived: data.figures.fundingReceived,
    fundingRequired: data.figures.fundingRequired,
  };
}

/** "Subject: finding" -> bold subject, as in NRC flash reports. No colon, no subject. */
export function splitSubject(text: string): { subject: string | null; body: string } {
  const i = text.indexOf(":");
  if (i <= 0 || i > 60) return { subject: null, body: text };
  return { subject: text.slice(0, i).trim(), body: text.slice(i + 1).trim() };
}
