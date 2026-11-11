/**
 * Map-first Detection ("calm filters" design handoff): the pure model behind
 * the feed column, the filter menu, the chips and the timeline. No React.
 *
 * Filters live in `useDetectionFilters`; this module only reads them. Feed
 * rows from the alerts, events and signals feeds are normalised into one
 * `FeedItem` shape so the list, the markers and the client-side facets share
 * one code path.
 */

import type { HierarchyLevel1 } from "~/components/disaster-type-picker";
import { getHazardName } from "~/lib/disaster-types";
import { toMapPointGeometry } from "~/lib/geo/to-map-point";
import { resolveLocationName } from "~/lib/location";
import type { GqlAlert, GqlEvent, GqlLocation, GqlSignal } from "~/lib/types/graphql";
import { mapSeverity } from "~/lib/types/graphql";

export type Severity = "critical" | "high" | "medium" | "low";
export const SEVERITIES: readonly Severity[] = ["critical", "high", "medium", "low"];

export type FeedTab = "alerts" | "events" | "signals" | "history";

/** Fixed marker fills (Mapbox paint cannot read CSS variables). */
export const MARKER_COLORS: Record<Severity | "unknown", string> = {
  critical: "#F87171",
  high: "#D97706",
  medium: "#FBBF24",
  low: "#34D399",
  unknown: "#A3A3A3",
};

export interface RegionState {
  id: string;
  name: string;
  districts?: { id: string; name: string }[];
}

export interface FeedItem {
  /** Row key, unique within a tab. */
  id: string;
  kind: "alert" | "event" | "signal";
  /** The event behind the row (alerts and events), for the preview drawer. */
  eventId: string | null;
  href: string;
  title: string;
  severity: Severity | "unknown";
  isAlert: boolean;
  /** First source, shown on the row. */
  source: string | null;
  sources: string[];
  place: string | null;
  stateId: string | null;
  stateName: string | null;
  /** The admin-2 district the item sits in, when known. */
  districtId: string | null;
  typeCodes: string[];
  signalCount: number | null;
  /** Shown as "{relative}" on the row. */
  lastAt: string;
  /** Tooltip "first signal" time, when it differs. */
  firstAt: string | null;
  lng: number | null;
  lat: number | null;
}

// ─── Normalisation ──────────────────────────────────────────────────────────

/** A location's map point (polygons fall back to their centroid), as the map's markers do. */
function pointOf(loc: GqlLocation | null | undefined): [number, number] | null {
  const point = toMapPointGeometry(loc?.geometry ?? null);
  if (!point) return null;
  const [lng, lat] = point.coordinates;
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

/** The admin-1 state a location sits in, from the country's state list. */
export function stateFor(loc: GqlLocation | null | undefined, states: readonly RegionState[]): RegionState | null {
  if (!loc) return null;
  const ids = new Set([loc.id, ...(loc.ancestorIds ?? []), ...(loc.ancestors ?? []).map((a) => a.id)]);
  if (loc.parent) ids.add(loc.parent.id);
  for (const s of states) {
    if (ids.has(s.id)) return s;
    if (s.districts?.some((d) => ids.has(d.id))) return s;
  }
  return null;
}

/** The admin-2 district a location sits in (itself or an ancestor). */
export function districtFor(loc: GqlLocation | null | undefined, states: readonly RegionState[]): { id: string; name: string } | null {
  if (!loc) return null;
  const ids = new Set([loc.id, ...(loc.ancestorIds ?? []), ...(loc.ancestors ?? []).map((a) => a.id)]);
  if (loc.parent) ids.add(loc.parent.id);
  for (const s of states) {
    for (const d of s.districts ?? []) if (ids.has(d.id)) return d;
  }
  return null;
}

function eventLocation(e: GqlEvent): GqlLocation | null {
  return e.generalLocation ?? e.originLocation ?? e.destinationLocation ?? null;
}

function eventPoint(e: GqlEvent): [number, number] | null {
  const rep = pointOf(e.representativePoint);
  if (rep) return rep;
  for (const loc of [e.originLocation, e.destinationLocation, e.generalLocation]) {
    const p = pointOf(loc);
    if (p) return p;
  }
  for (const s of e.signals ?? []) {
    for (const loc of [s.originLocation, s.destinationLocation, s.generalLocation]) {
      const p = pointOf(loc);
      if (p) return p;
    }
  }
  return null;
}

function sevOf(n: number | null | undefined): Severity | "unknown" {
  return mapSeverity(n);
}

export function eventToItem(e: GqlEvent, states: readonly RegionState[], untitled: string): FeedItem {
  const loc = eventLocation(e);
  const state = stateFor(loc, states);
  const sources = [...new Set(e.signals.map((s) => s.source.name))];
  const point = eventPoint(e);
  return {
    id: e.id,
    kind: "event",
    eventId: e.id,
    href: `/event/${e.id}?from=detection`,
    title: e.title ?? e.description ?? e.types[0] ?? untitled,
    severity: sevOf(e.severity),
    isAlert: e.alerts.length > 0,
    source: e.signals[0]?.source?.name ?? null,
    sources,
    place: resolveLocationName(loc) ?? state?.name ?? null,
    stateId: state?.id ?? null,
    stateName: state?.name ?? null,
    districtId: districtFor(loc, states)?.id ?? null,
    typeCodes: e.types.map((c) => c.toLowerCase()),
    signalCount: e.signals.length,
    lastAt: e.lastSignalCreatedAt,
    firstAt: e.firstSignalCreatedAt,
    lng: point?.[0] ?? null,
    lat: point?.[1] ?? null,
  };
}

export function alertToItem(a: GqlAlert, states: readonly RegionState[], untitled: string): FeedItem {
  return { ...eventToItem(a.event, states, untitled), id: a.id, kind: "alert", isAlert: true };
}

export function signalToItem(s: GqlSignal, states: readonly RegionState[], untitled: string): FeedItem {
  const loc = s.generalLocation ?? s.originLocation ?? s.destinationLocation ?? null;
  const state = stateFor(loc, states);
  let point: [number, number] | null = null;
  for (const l of [s.generalLocation, s.originLocation, s.destinationLocation]) {
    point = pointOf(l);
    if (point) break;
  }
  return {
    id: s.id,
    kind: "signal",
    eventId: null,
    href: `/signal/${s.id}?from=detection`,
    title: s.title ?? s.description ?? untitled,
    severity: sevOf(s.severity),
    isAlert: false,
    source: s.source.name,
    sources: [s.source.name],
    place: resolveLocationName(loc) ?? state?.name ?? null,
    stateId: state?.id ?? null,
    stateName: state?.name ?? null,
    districtId: districtFor(loc, states)?.id ?? null,
    typeCodes: [],
    signalCount: null,
    lastAt: s.publishedAt,
    firstAt: null,
    lng: point?.[0] ?? null,
    lat: point?.[1] ?? null,
  };
}

// ─── Event types (level 1 and level 3) ─────────────────────────────────────
//
// The filter offers an event type (level 1) and its detailed types (level 3).
// Outside conflict every level-2 group holds one detailed type of the same
// name, so there level 3 is level 2. A detailed type's key is "<l1>::<l2>"
// when it is its group's only type (the key filters stored before), else
// "<l1>::<l2>::<l3>" (conflict's ACLED groups split into several).
//
// Keys and search use clear-api's names; what the filter and the feed cards
// show is the short name from `~/lib/disaster-types`.

/** "air or drone strike" -> "Air or drone strike" (clear-api's names are lower case). */
export function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface TypeLeaf {
  key: string;
  l1: string;
  /** Its level-2 group; shown as context when the group holds several types. */
  group: string;
  /** clear-api's name, for keys and search. */
  name: string;
  /** The name shown: the type's short name. */
  label: string;
  codes: string[];
  /** The group holds other detailed types too. */
  grouped: boolean;
}

/** The detailed types of every event type, or of one, in hierarchy order. */
export function typeLeaves(hierarchy: readonly HierarchyLevel1[], l1?: string): TypeLeaf[] {
  const out: TypeLeaf[] = [];
  for (const h of hierarchy) {
    if (l1 != null && h.name !== l1) continue;
    for (const g of h.groups) {
      const subs = g.subTypes ?? [];
      if (subs.length > 1) {
        const short = subs.map((sub) => getHazardName(sub.code, upperFirst(sub.name)));
        subs.forEach((sub, i) => {
          // Two types sharing a short name (a leftover duplicate) keep their own names.
          const label = short.indexOf(short[i]!) === short.lastIndexOf(short[i]!) ? short[i]! : upperFirst(sub.name);
          out.push({ key: `${h.name}::${g.name}::${sub.name}`, l1: h.name, group: g.name, name: sub.name, label, codes: [sub.code], grouped: true });
        });
      } else {
        const sub = subs[0];
        const label = sub ? getHazardName(sub.code, upperFirst(sub.name)) : upperFirst(g.name);
        out.push({ key: `${h.name}::${g.name}`, l1: h.name, group: g.name, name: sub?.name ?? g.name, label, codes: g.codes, grouped: false });
      }
    }
  }
  return out;
}

/**
 * Each code's full name from clear-api, for hover text where the short name
 * shows: "Conflict › Explosions or remote violence › Shelling or artillery or
 * missile attack". A level that repeats the one above it is left out.
 */
export function typePaths(hierarchy: readonly HierarchyLevel1[]): Map<string, string> {
  const paths = new Map<string, string>();
  const join = (...names: string[]) => names.filter((n, i) => n !== names[i - 1]).map(upperFirst).join(" › ");
  for (const h of hierarchy) {
    for (const g of h.groups) {
      for (const sub of g.subTypes ?? []) paths.set(sub.code.toLowerCase(), join(h.name, g.name, sub.name));
      for (const code of g.codes) if (!paths.has(code.toLowerCase())) paths.set(code.toLowerCase(), join(h.name, g.name));
    }
  }
  return paths;
}

/** Leaf keys of one event type. */
export function leafKeys(hierarchy: readonly HierarchyLevel1[], l1: string): string[] {
  return typeLeaves(hierarchy, l1).map((t) => t.key);
}

/**
 * A stored whole level-2 group that now splits into detailed types (older
 * filters, links and the mobile picker store groups) reads as all of them.
 */
export function normalizeTypeKeys(selected: readonly string[], hierarchy: readonly HierarchyLevel1[]): string[] {
  const out: string[] = [];
  for (const key of selected) {
    const [l1, l2, l3] = key.split("::");
    if (l3 == null && l1 && l2) {
      const leaves = typeLeaves(hierarchy, l1).filter((t) => t.group === l2 && t.grouped);
      if (leaves.length > 0) {
        out.push(...leaves.map((t) => t.key));
        continue;
      }
    }
    out.push(key);
  }
  return [...new Set(out)];
}

/** An event type counts as checked when every one of its detailed types is selected. */
export function isL1Checked(selected: readonly string[], hierarchy: readonly HierarchyLevel1[], l1: string): boolean {
  const keys = leafKeys(hierarchy, l1);
  const picked = normalizeTypeKeys(selected, hierarchy);
  return keys.length > 0 && keys.every((k) => picked.includes(k));
}

/**
 * Toggle an event type or a detailed type. Selecting an event type selects all
 * its detailed types (so the filter reads as the event type). Clicking a
 * detailed type while the event type is checked leaves the others checked.
 * Selecting every detailed type reads as the event type again.
 */
export function toggleTypeKey(selected: readonly string[], hierarchy: readonly HierarchyLevel1[], key: string): string[] {
  const picked = normalizeTypeKeys(selected, hierarchy);
  if (key.includes("::")) {
    return picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key];
  }
  const keys = leafKeys(hierarchy, key);
  if (isL1Checked(picked, hierarchy, key)) return picked.filter((k) => !keys.includes(k));
  return [...picked.filter((k) => !keys.includes(k)), ...keys];
}

/** Selection grouped for display: whole event types by name, lone detailed types by theirs. */
export function typeSelectionLabels(selected: readonly string[], hierarchy: readonly HierarchyLevel1[]): string[] {
  const picked = normalizeTypeKeys(selected, hierarchy);
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const key of picked) {
    const l1 = key.split("::")[0]!;
    if (seen.has(l1)) continue;
    if (isL1Checked(picked, hierarchy, l1)) {
      seen.add(l1);
      labels.push(upperFirst(l1));
    } else {
      labels.push(typeLeaves(hierarchy, l1).find((t) => t.key === key)?.label ?? upperFirst(key.split("::").pop()!));
    }
  }
  return labels;
}

/** The event types and detailed-type keys an item belongs to. */
export function itemTypeKeys(item: FeedItem, hierarchy: readonly HierarchyLevel1[]): { l1: Set<string>; leaves: Set<string> } {
  const l1 = new Set<string>();
  const leaves = new Set<string>();
  for (const t of typeLeaves(hierarchy)) {
    if (t.codes.some((c) => item.typeCodes.includes(c.toLowerCase()))) {
      l1.add(t.l1);
      leaves.add(t.key);
    }
  }
  return { l1, leaves };
}

// ─── Date keys ──────────────────────────────────────────────────────────────

export type DatePreset = "24h" | "7d" | "30d" | "90d";
export type DateKey = DatePreset | `c${number}`;
export const DATE_PRESETS: readonly DatePreset[] = ["24h", "7d", "30d", "90d"];
export const DEFAULT_DATE = "Last 7 days";
const PRESET_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

/** "Last N days" for a number of days (the filter hook's date string). */
export function dateForDays(days: number): string {
  return days === 1 ? "Last 1 day" : `Last ${days} days`;
}

/** Days in a rolling "Last N days" date string, or null for a fixed range. */
export function daysOf(date: string): number | null {
  const m = date.match(/^Last (\d+) days?$/i);
  return m ? Number(m[1]) : null;
}

export function dateKeyOf(date: string): DateKey | null {
  const d = daysOf(date);
  if (d == null) return null;
  const preset = Object.entries(PRESET_DAYS).find(([, n]) => n === d)?.[0];
  return (preset as DateKey | undefined) ?? (`c${d}` as DateKey);
}

export function dateOfKey(key: string): string | null {
  if (key in PRESET_DAYS) return dateForDays(PRESET_DAYS[key]!);
  const m = key.match(/^c(\d{1,2})$/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 90 ? dateForDays(n) : null;
}

// ─── Filters and matching ───────────────────────────────────────────────────

export type Dim = "region" | "sev" | "types" | "sources";

export interface FilterState {
  /** Picked states and districts; empty = the whole country. */
  locIds: readonly string[];
  severities: ReadonlySet<string>;
  typeFilters: readonly string[];
  sources: ReadonlySet<string> | null;
  search: string;
}

export function isDimActive(dim: Dim, f: FilterState): boolean {
  switch (dim) {
    case "region":
      return f.locIds.length > 0;
    case "sev":
      return f.severities.size > 0 && f.severities.size < SEVERITIES.length;
    case "types":
      return f.typeFilters.length > 0;
    case "sources":
      return f.sources != null && f.sources.size > 0;
  }
}

export function matchesSearch(item: FeedItem, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [item.title, item.place, item.stateName].some((v) => v?.toLowerCase().includes(s));
}

/**
 * Whether an item passes every filter except `except` (for faceted counts).
 * Severity, types and sources are applied client-side on top of the
 * server's range filters, exactly as the old feed did.
 */
export function passes(
  item: FeedItem,
  f: FilterState,
  hierarchy: readonly HierarchyLevel1[],
  except: Dim | "search" | null = null,
): boolean {
  if (except !== "region" && !inPlaces(item, f.locIds)) return false;
  if (except !== "sev" && !(f.severities.size === 0 || f.severities.has(item.severity))) return false;
  if (except !== "types" && item.kind !== "signal" && f.typeFilters.length > 0) {
    const { leaves } = itemTypeKeys(item, hierarchy);
    if (!normalizeTypeKeys(f.typeFilters, hierarchy).some((k) => leaves.has(k))) return false;
  }
  if (except !== "sources" && f.sources && f.sources.size > 0 && !item.sources.some((s) => f.sources!.has(s))) return false;
  if (except !== "search" && !matchesSearch(item, f.search)) return false;
  return true;
}

export function countBy<T>(items: readonly T[], keys: (item: T) => Iterable<string>): Map<string, number> {
  const out = new Map<string, number>();
  for (const it of items) for (const k of keys(it)) out.set(k, (out.get(k) ?? 0) + 1);
  return out;
}

/** Sources seen in the loaded items, by count descending. */
export function sourceCounts(items: readonly FeedItem[], f: FilterState, hierarchy: readonly HierarchyLevel1[]) {
  const base = items.filter((it) => passes(it, f, hierarchy, "sources"));
  const counts = countBy(base, (it) => it.sources);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Toggle one value in a checkbox set where "all" or "none" both mean no filter. */
export function toggleInSet(current: ReadonlySet<string> | null, value: string, all: readonly string[]): Set<string> | null {
  const next = new Set(current ?? []);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  if (next.size === 0 || (all.length > 0 && all.every((v) => next.has(v)))) return null;
  return next;
}

/**
 * Severity from the query bar: from "all", picking a level isolates it;
 * after that, picks toggle levels on and off. None or all four is "all" again.
 */
export function pickSeverity(current: ReadonlySet<string>, sev: Severity): Set<string> {
  if (current.size === 0 || current.size === SEVERITIES.length) return new Set([sev]);
  const next = new Set(current);
  if (next.has(sev)) next.delete(sev);
  else next.add(sev);
  return next.size === 0 || next.size === SEVERITIES.length ? new Set(SEVERITIES) : next;
}


// ─── Places (states and districts) ─────────────────────────────────────────

/** The state a picked place belongs to: itself for a state, its parent for a district. */
export function placeState(id: string, states: readonly RegionState[]): RegionState | null {
  return states.find((s) => s.id === id || (s.districts ?? []).some((d) => d.id === id)) ?? null;
}

/** A picked place's name, or null for an id outside the country. */
export function placeName(id: string, states: readonly RegionState[]): string | null {
  for (const s of states) {
    if (s.id === id) return s.name;
    const d = s.districts?.find((x) => x.id === id);
    if (d) return d.name;
  }
  return null;
}

/** Whether an item sits in one of the picked places (always, with none picked). */
export function inPlaces(item: Pick<FeedItem, "stateId" | "districtId">, locIds: readonly string[]): boolean {
  if (locIds.length === 0) return true;
  return (item.stateId != null && locIds.includes(item.stateId)) || (item.districtId != null && locIds.includes(item.districtId));
}

/**
 * Toggle a state or a district, the way event types toggle:
 * - picking a state drops its districts;
 * - picking a district of a picked state swaps the state for its other districts;
 * - picking every district of a state collapses them back into the state.
 */
export function toggleLocation(selected: readonly string[], id: string, states: readonly RegionState[]): string[] {
  const state = states.find((s) => s.id === id);
  if (state) {
    if (selected.includes(id)) return selected.filter((x) => x !== id);
    const kids = new Set((state.districts ?? []).map((d) => d.id));
    return [...selected.filter((x) => !kids.has(x)), id];
  }
  const parent = placeState(id, states);
  const without = selected.filter((x) => x !== id);
  if (!parent) return selected.includes(id) ? without : [...selected, id];
  const kids = (parent.districts ?? []).map((d) => d.id);
  let next: string[];
  if (selected.includes(parent.id)) next = [...selected.filter((x) => x !== parent.id), ...kids.filter((k) => k !== id)];
  else next = selected.includes(id) ? without : [...selected, id];
  if (kids.length > 1 && kids.every((k) => next.includes(k))) {
    next = [...next.filter((x) => !kids.includes(x)), parent.id];
  }
  return next;
}

/** A state not picked itself but with some of its districts picked. */
export function isStatePartial(state: RegionState, selected: readonly string[]): boolean {
  return !selected.includes(state.id) && (state.districts ?? []).some((d) => selected.includes(d.id));
}

/** A state picked itself, or through any of its districts. */
export function involvesState(state: RegionState, selected: readonly string[]): boolean {
  return selected.includes(state.id) || isStatePartial(state, selected);
}

// ─── Query bar ──────────────────────────────────────────────────────────────

export type QualifierKey = "in" | "type" | "severity" | "source" | "since" | "sort";
export const QUALIFIER_KEYS: readonly QualifierKey[] = ["in", "type", "severity", "source", "since", "sort"];

/** Keywords stay English in every locale; a few localised ones are accepted too. */
const QUALIFIER_ALIASES: Record<QualifierKey, readonly string[]> = {
  in: ["in", "region", "state", "district", "loc"],
  type: ["type"],
  severity: ["severity", "sev"],
  source: ["source", "src"],
  since: ["since", "date"],
  sort: ["sort"],
};
const LOCALE_ALIASES: Record<string, Partial<Record<QualifierKey, readonly string[]>>> = {
  ar: { in: ["في"], type: ["نوع"], severity: ["خطورة"], source: ["مصدر"], since: ["منذ"], sort: ["ترتيب"] },
  fr: { in: ["dans"], severity: ["gravité", "gravite"], since: ["depuis"], sort: ["tri"] },
  es: { in: ["en"], type: ["tipo"], severity: ["gravedad"], source: ["fuente"], since: ["desde"], sort: ["orden"] },
};

export function qualifierAliases(key: QualifierKey, locale = "en"): readonly string[] {
  const local = LOCALE_ALIASES[locale]?.[key];
  return local ? [...QUALIFIER_ALIASES[key], ...local] : QUALIFIER_ALIASES[key];
}

/** "type:drone" → { key: "type", value: "drone" }; anything else is free text. */
export function parseQuery(text: string, locale = "en"): { key: QualifierKey | null; value: string } {
  const m = /^\s*(\p{L}+):(.*)$/u.exec(text);
  if (m) {
    const word = m[1]!.toLowerCase();
    const key = QUALIFIER_KEYS.find((k) => qualifierAliases(k, locale).includes(word));
    if (key) return { key, value: m[2]!.trim() };
  }
  return { key: null, value: text.trim() };
}

/** Letters and digits only, lowercased, accents dropped: "Air / Drone Strike" → "airdronestrike". */
export function normalizeText(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/** Whether `label` contains the typed text, both normalised. Empty text matches. */
export function matchesText(label: string, typed: string): boolean {
  const q = normalizeText(typed);
  return !q || normalizeText(label).includes(q);
}

/** "14", "14d" → 14 days, clamped to the timeline (1-90); null when it isn't a day count. */
export function parseSinceDays(typed: string): number | null {
  const m = /^(\d+)\s*d?$/i.exec(typed.trim());
  return m ? Math.min(TIMELINE_DAYS, Math.max(1, Number(m[1]))) : null;
}

// ─── Timeline ───────────────────────────────────────────────────────────────

export const TIMELINE_DAYS = 90;

/** Bar heights (0-1) for per-day counts, minimum `floor` so empty days stay visible. */
export function barHeights(counts: readonly number[], floor: number): number[] {
  const max = Math.max(1, ...counts);
  return counts.map((c) => Math.max(floor, c / max));
}

/**
 * A timeline selection as inclusive bar indices: 0 is the first day of the
 * window (TIMELINE_DAYS - 1 days ago), TIMELINE_DAYS - 1 is today.
 */
export type BarRange = readonly [start: number, end: number];

const DAY = 86_400_000;
const clampBar = (i: number) => Math.min(TIMELINE_DAYS - 1, Math.max(0, Math.round(i)));

/** The bars of a rolling "last N days" window. */
export function rangeForDays(days: number): BarRange {
  return [clampBar(TIMELINE_DAYS - days), TIMELINE_DAYS - 1];
}

/** Bar index of an instant, given the window's first day (UTC midnight, ms). */
export function barIndexOf(iso: string, windowStartMs: number): number {
  return clampBar(Math.floor((Date.parse(iso) - windowStartMs) / DAY));
}

/** The handle a press at `index` grabs: the nearer one, or the one on that side. */
export function nearestHandle(range: BarRange, index: number): "start" | "end" {
  const [start, end] = range;
  if (index <= start) return "start";
  if (index >= end) return "end";
  return index - start <= end - index ? "start" : "end";
}

/** Move one handle to `index`; a handle can't pass the other one. */
export function moveHandle(range: BarRange, handle: "start" | "end", index: number): BarRange {
  const i = clampBar(index);
  return handle === "start" ? [Math.min(i, range[1]), range[1]] : [range[0], Math.max(i, range[0])];
}

/**
 * What a selection means for the filters: a range ending today is the rolling
 * "last N days" (so presets and refresh keep working); any other is a fixed
 * from-to covering whole UTC days.
 */
export function rangeToDate(
  range: BarRange,
  windowStartMs: number,
): { kind: "rolling"; days: number } | { kind: "custom"; from: string; to: string } {
  const [start, end] = range;
  if (end === TIMELINE_DAYS - 1) return { kind: "rolling", days: TIMELINE_DAYS - start };
  return {
    kind: "custom",
    from: new Date(windowStartMs + start * DAY).toISOString(),
    to: new Date(windowStartMs + (end + 1) * DAY - 1).toISOString(),
  };
}
