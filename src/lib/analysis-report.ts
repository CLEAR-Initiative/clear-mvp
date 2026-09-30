/**
 * Pure helpers for the analysis report (PRD v5, R31): the PDF's scope map
 * drawn as vector paths, text folded to the PDF's built-in font, and the
 * download file name.
 */

type Point = [number, number];
type Ring = Point[];

function rings(geometry: unknown): Ring[] {
  const geo = geometry as { type?: string; coordinates?: unknown } | null;
  if (!geo?.coordinates) return [];
  if (geo.type === "Polygon") return geo.coordinates as Ring[];
  if (geo.type === "MultiPolygon") return (geo.coordinates as Ring[][]).flat();
  return [];
}

function bounds(rs: Ring[]): [number, number, number, number] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rs)
    for (const [x, y] of r) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}

export interface ReportMapDot {
  x: number;
  y: number;
  severity: number | null;
}

export interface ReportMap {
  width: number;
  height: number;
  country: string;
  areas: string[];
  dots: ReportMapDot[];
}

/** Drop points closer than this (in map units) to the last kept one; keeps the PDF small. */
const MIN_STEP = 0.8;

/**
 * Project the scope onto a width x height box: the country outline for
 * context, the scope's areas filled, events as dots. A country scope frames
 * the country; an area scope frames its areas with room around them.
 * Equirectangular with a cos(latitude) correction, which is plenty at
 * country scale. Null when there is no geometry to frame.
 */
export function projectReportMap({
  country,
  areas,
  events,
  width,
  height,
}: {
  country: unknown;
  areas: unknown[];
  events: { point: Point | null; severity: number | null }[];
  width: number;
  height: number;
}): ReportMap | null {
  const countryRings = rings(country);
  const areaRings = areas.map(rings);
  const focus = bounds(areaRings.flat()) ?? bounds(countryRings);
  if (!focus) return null;

  const pad = areaRings.flat().length > 0 ? 0.35 : 0.05;
  const [x0, y0, x1, y1] = focus;
  const midLat = ((y0 + y1) / 2) * (Math.PI / 180);
  const kx = Math.cos(midLat);
  const spanX = Math.max((x1 - x0) * kx, 1e-6) * (1 + 2 * pad);
  const spanY = Math.max(y1 - y0, 1e-6) * (1 + 2 * pad);
  const scale = Math.min(width / spanX, height / spanY);
  const cx = ((x0 + x1) / 2) * kx;
  const cy = (y0 + y1) / 2;
  const project = ([lng, lat]: Point): Point => [
    width / 2 + (lng * kx - cx) * scale,
    height / 2 - (lat - cy) * scale,
  ];

  const path = (rs: Ring[]) =>
    rs
      .map((ring) => {
        const out: Point[] = [];
        for (const p of ring) {
          const q = project(p);
          const last = out.at(-1);
          if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) >= MIN_STEP) out.push(q);
        }
        if (out.length < 3) return "";
        return `M${out.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
      })
      .join("");

  const dots = events
    .filter((e): e is { point: Point; severity: number | null } => !!e.point)
    .map((e) => {
      const [x, y] = project(e.point);
      return { x, y, severity: e.severity };
    })
    .filter((d) => d.x >= 0 && d.x <= width && d.y >= 0 && d.y <= height);

  return { width, height, country: path(countryRings), areas: areaRings.map(path).filter(Boolean), dots };
}

/**
 * Text safe for the PDF's built-in Helvetica (WinAnsi): characters it has pass
 * through; others lose their diacritics ("Fāshir" -> "Fashir"), and whatever
 * is still unsupported is dropped rather than rendered as garbage.
 */
export function pdfSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    if (isWinAnsi(ch)) {
      out += ch;
      continue;
    }
    const base = ch.normalize("NFKD").replace(/\p{M}/gu, "");
    out += [...base].filter(isWinAnsi).join("");
  }
  return out;
}

/** The Unicode characters Windows-1252 maps above 0x7F, besides Latin-1. */
const WIN_ANSI_EXTRA = new Set(
  [
    0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d,
    0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e,
    0x0178,
  ].map((c) => String.fromCodePoint(c)),
);

function isWinAnsi(ch: string): boolean {
  const c = ch.codePointAt(0)!;
  return c === 0x0a || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRA.has(ch);
}

/** "sitrep-sheikan-north-kordofan-sudan-2026-09-29.pdf" */
export function reportFileName(scopeName: string, at: Date): string {
  const slug = scopeName
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `sitrep-${slug || "analysis"}-${at.toISOString().slice(0, 10)}.pdf`;
}

/** Report sections in their default order. Provenance and page numbers are always included. */
export const REPORT_SECTIONS = [
  "keyDevelopments",
  "currentStatus",
  "map",
  "contexts",
  "hazards",
  "displacement",
  "priorityNeeds",
  "responseActivities",
  "outlook",
  "sources",
] as const;
export type ReportSectionKey = (typeof REPORT_SECTIONS)[number];

export interface ReportSectionChoice {
  key: ReportSectionKey;
  included: boolean;
  /** False when the analysis has nothing for this section; it can't be included. */
  available: boolean;
  /** Items the section would hold, for the builder's hint. Null where a count means nothing. */
  count: number | null;
}

interface ReportContent {
  summary: string | null;
  keyFindings: unknown[];
  contextRisks: { items: unknown[] }[];
  hazards: { hazards: unknown[] };
  displacement: { push: unknown[] };
  sectors: { severity: string | null; needs: unknown[]; interventions: unknown[] }[];
  scenarios: { mostLikely: string | null } | null;
  sources: unknown[];
}

/** Sections that have content, in their default order, all included. */
export function defaultReportSections(data: ReportContent, eventCount: number): ReportSectionChoice[] {
  const counts: Record<ReportSectionKey, number | null> = {
    keyDevelopments: data.summary || data.keyFindings.length > 0 ? data.keyFindings.length : 0,
    currentStatus: null,
    map: eventCount,
    contexts: data.contextRisks.reduce((n, r) => n + r.items.length, 0),
    hazards: data.hazards.hazards.length,
    displacement: data.displacement.push.length,
    priorityNeeds: data.sectors.filter((x) => x.severity && x.needs.length > 0).length,
    responseActivities: data.sectors.filter((x) => x.interventions.length > 0).length,
    outlook: null,
    sources: data.sources.length,
  };
  const available: Record<ReportSectionKey, boolean> = {
    keyDevelopments: !!data.summary || data.keyFindings.length > 0,
    currentStatus: true,
    map: true,
    contexts: counts.contexts! > 0,
    hazards: counts.hazards! > 0,
    displacement: counts.displacement! > 0,
    priorityNeeds: counts.priorityNeeds! > 0,
    responseActivities: counts.responseActivities! > 0,
    outlook: !!data.scenarios?.mostLikely,
    sources: counts.sources! > 0,
  };
  return REPORT_SECTIONS.map((key) => ({ key, included: available[key], available: available[key], count: counts[key] }));
}

/** Move one entry, as a drag-and-drop reorder does. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}
