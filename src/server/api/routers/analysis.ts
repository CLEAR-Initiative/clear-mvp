import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import { fetchReportMeta, type ReportMeta } from "~/server/api/routers/situationAnalysis";
import {
  eventIdFromCitation,
  mapAnalysis,
  type Analysis,
  type AnalysisRow,
} from "~/server/api/mappers/analysis";
import { toMapPointGeometry } from "~/lib/geo/to-map-point";
import {
  ANALYSIS_CADENCES,
  MAX_CREATED_LOCATIONS,
  createdWindowStart,
  scopeLabel,
  type LabelLocation,
} from "~/lib/analysis-view";

/**
 * Unified frame-scoped analysis (clear-api ADR-0007).
 *
 * The page reads what the pipeline has already generated; nothing is
 * generated on request. Events enter the analysis through the knowledgebase
 * incident tier (ADR-0006) and surface as `event:<id>` citations; the page's
 * map and timeline read the scope's events directly.
 */

const ANALYSIS_QUERY = `
  query Analysis($frame: AnalysisFrameInput!) {
    analysis(frame: $frame) {
      id
      locationIds
      eventTypes
      needSectors
      windowStart
      windowEnd
      data
      sourceReportIds
      generatedByModel
      generatedAt
      schemaVersion
    }
  }
`;

const EVENT_FIELDS = `
  id
  title
  types
  severity
  firstSignalCreatedAt
  lastSignalCreatedAt
  casualties
  populationDisplaced
  representativePoint { id name level geometry }
  generalLocation { id name level ancestors { id name level } }
`;

const EVENTS_PAGE_QUERY = `
  query AnalysisEvents($input: EventsPageInput) {
    eventsPage(input: $input) {
      totalCount
      items { ${EVENT_FIELDS} }
    }
  }
`;

const FIGURES_QUERY = `
  query AnalysisFigures($locationId: String, $windowStart: DateTime!, $windowEnd: DateTime!) {
    aggregatedDatapoint(
      locationId: $locationId
      windowStart: $windowStart
      windowEnd: $windowEnd
      windowKind: "all"
    ) {
      data
      newestSourceAt
    }
  }
`;

/** SAF sectors the pipeline extracts a people-in-need figure for (`pin_<sector>`). */
export const PIN_SECTORS = [
  "food_security",
  "health",
  "wash",
  "protection",
  "shelter",
  "education",
  "nutrition",
] as const;
export type PinSector = (typeof PIN_SECTORS)[number];

interface RawEnvelope {
  value?: number | null;
  value_low?: number | null;
  value_high?: number | null;
  newest_report_at?: string | null;
}

export interface AnalysisFigure {
  value: number;
  low: number | null;
  high: number | null;
  newestAt: string | null;
}

/**
 * The scope's current stock figures from the all-time aggregation tier: the
 * latest reported value per field, which is what "current" means for stocks
 * (displaced, refugees, people in need). Flows and funding are deliberately
 * not read here: an all-time tier sums them across years.
 */
export interface AnalysisFigures {
  idpStock: AnalysisFigure | null;
  refugees: AnalysisFigure | null;
  returneeStock: AnalysisFigure | null;
  overallPin: AnalysisFigure | null;
  pinBySector: { sector: PinSector; figure: AnalysisFigure }[];
}

function toFigure(raw: unknown): AnalysisFigure | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as RawEnvelope;
  if (typeof e.value !== "number" || !Number.isFinite(e.value)) return null;
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : null);
  return {
    value: Math.round(e.value),
    low: num(e.value_low),
    high: num(e.value_high),
    newestAt: typeof e.newest_report_at === "string" ? e.newest_report_at : null,
  };
}

export function mapFigures(data: Record<string, unknown> | null | undefined): AnalysisFigures {
  const d = data ?? {};
  return {
    idpStock: toFigure(d.idp_stock),
    refugees: toFigure(d.refugees),
    returneeStock: toFigure(d.returnee_stock),
    overallPin: toFigure(d.overall_pin),
    pinBySector: PIN_SECTORS.map((sector) => ({ sector, figure: toFigure(d[`pin_${sector}`]) }))
      .filter((r): r is { sector: PinSector; figure: AnalysisFigure } => r.figure !== null)
      .sort((a, b) => b.figure.value - a.figure.value),
  };
}

/** clear-api clamps `eventsPage.limit` to 100. */
const EVENTS_LIMIT = 100;

interface GqlAnalysisLocation {
  id: string;
  name: string;
  level: number;
  geometry?: unknown;
  ancestors?: { id: string; name: string; level: number }[] | null;
}

interface GqlAnalysisEvent {
  id: string;
  title: string | null;
  types: string[];
  severity: number | null;
  firstSignalCreatedAt: string;
  lastSignalCreatedAt: string;
  casualties: number | null;
  populationDisplaced: string | null;
  representativePoint: GqlAnalysisLocation | null;
  generalLocation: GqlAnalysisLocation | null;
}

export interface AnalysisEvent {
  id: string;
  title: string | null;
  types: string[];
  severity: number | null;
  startedAt: string;
  lastSignalAt: string;
  casualties: number | null;
  populationDisplaced: number | null;
  /** [lng, lat] for the map marker, null when the event has no geometry. */
  point: [number, number] | null;
  locationName: string | null;
  /** The admin-1 area the event sits in, for the scope panel's breakdown. */
  admin1: { id: string; name: string } | null;
}

export interface AnalysisEvents {
  totalCount: number;
  items: AnalysisEvent[];
}

/**
 * The frame the weekly pipeline writes for a country: the calendar year to
 * date, regenerated weekly. clear-api matches `windowEnd` exactly, so this must
 * stay byte-identical to the pipeline's `_calendar_year_window`.
 */
export function countryFrame(countryLocationId: string, year: number) {
  return {
    locationIds: [countryLocationId],
    windowStart: `${year}-01-01T00:00:00Z`,
    windowEnd: `${year}-12-31T23:59:59Z`,
  };
}

function admin1Of(loc: GqlAnalysisLocation | null): { id: string; name: string } | null {
  if (!loc) return null;
  if (loc.level === 1) return { id: loc.id, name: loc.name };
  const a1 = loc.ancestors?.find((a) => a.level === 1);
  return a1 ? { id: a1.id, name: a1.name } : null;
}

export function toAnalysisEvent(e: GqlAnalysisEvent): AnalysisEvent {
  const geometry = (e.representativePoint?.geometry ?? null) as Parameters<typeof toMapPointGeometry>[0];
  const point = toMapPointGeometry(geometry)?.coordinates ?? null;
  const displaced = e.populationDisplaced != null ? Number(e.populationDisplaced) : null;
  return {
    id: e.id,
    title: e.title,
    types: e.types ?? [],
    severity: e.severity,
    startedAt: e.firstSignalCreatedAt,
    lastSignalAt: e.lastSignalCreatedAt,
    casualties: e.casualties,
    populationDisplaced: displaced != null && Number.isFinite(displaced) ? displaced : null,
    point,
    locationName: e.generalLocation?.name ?? e.representativePoint?.name ?? null,
    admin1: admin1Of(e.generalLocation),
  };
}

/** Title/date for cited events, one aliased round trip. Best-effort. */
async function fetchEventMeta(
  ids: string[],
  headers: Record<string, string>,
): Promise<Map<string, GqlAnalysisEvent>> {
  const out = new Map<string, GqlAnalysisEvent>();
  if (ids.length === 0) return out;
  const fields = ids.map((_, i) => `e${i}: event(id: $e${i}) { ${EVENT_FIELDS} }`).join("\n");
  const params = ids.map((_, i) => `$e${i}: String!`).join(", ");
  const variables = Object.fromEntries(ids.map((id, i) => [`e${i}`, id]));
  try {
    const data = await graphqlFetch<Record<string, GqlAnalysisEvent | null>>(
      `query CitedEvents(${params}) {\n${fields}\n}`,
      variables,
      headers,
    );
    for (const ev of Object.values(data ?? {})) if (ev?.id) out.set(ev.id, ev);
  } catch {
    // Citations still number without titles.
  }
  return out;
}

const AUTOMATION_FIELDS = `
  id
  locationIds
  eventTypes
  needSectors
  windowStart
  cadence
  teamId
  enabled
  createdAt
`;

const AUTOMATIONS_QUERY = `
  query AnalysisAutomations($teamId: String) {
    analysisAutomations(teamId: $teamId) { ${AUTOMATION_FIELDS} }
  }
`;

const CREATE_AUTOMATION_MUTATION = `
  mutation CreateAnalysisAutomation($input: CreateAnalysisAutomationInput!) {
    createAnalysisAutomation(input: $input) { ${AUTOMATION_FIELDS} }
  }
`;

const REQUEST_ANALYSIS_MUTATION = `
  mutation RequestAnalysis($input: RequestAnalysisInput!) {
    requestAnalysis(input: $input) { id status }
  }
`;

const DELETE_AUTOMATION_MUTATION = `
  mutation DeleteAnalysisAutomation($id: String!) {
    deleteAnalysisAutomation(id: $id)
  }
`;

interface GqlAutomation {
  id: string;
  locationIds: string[];
  eventTypes: string[];
  needSectors: string[];
  windowStart: string;
  cadence: string;
  teamId: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface CountryAnalysisEntry {
  id: string;
  name: string;
  analysisId: string | null;
  generatedAt: string | null;
}

export interface CreatedAnalysis {
  /** Automation id. */
  id: string;
  name: string;
  locationIds: string[];
  eventTypes: string[];
  needSectors: string[];
  /** Country the scope sits in, for filtering by the selected country. */
  countryId: string | null;
  windowStart: string;
  cadence: string;
  enabled: boolean;
  createdAt: string;
  /** Null until the first run has generated the analysis. */
  analysisId: string | null;
  generatedAt: string | null;
}

export interface AnalysisScopes {
  countries: CountryAnalysisEntry[];
  created: CreatedAnalysis[];
}

type GqlLabelLocation = LabelLocation & { level: number };

function countryOf(loc: GqlLabelLocation): string | null {
  if (loc.level === 0) return loc.id;
  return loc.ancestors?.find((a) => a.level === 0)?.id ?? null;
}

/** Names and ancestor chains for scope labels, one aliased round trip. Best-effort. */
async function fetchLabelLocations(
  ids: string[],
  headers: Record<string, string>,
): Promise<Map<string, GqlLabelLocation>> {
  const out = new Map<string, GqlLabelLocation>();
  if (ids.length === 0) return out;
  const fields = ids
    .map((_, i) => `l${i}: location(id: $l${i}) { id name level parent { id name } ancestors { id name level } }`)
    .join("\n");
  const params = ids.map((_, i) => `$l${i}: String!`).join(", ");
  const variables = Object.fromEntries(ids.map((id, i) => [`l${i}`, id]));
  try {
    const data = await graphqlFetch<Record<string, GqlLabelLocation | null>>(
      `query ScopeLocations(${params}) {\n${fields}\n}`,
      variables,
      headers,
    );
    for (const loc of Object.values(data ?? {})) if (loc?.id) out.set(loc.id, loc);
  } catch {
    // Falls back to raw ids in the label.
  }
  return out;
}

type FrameInput = {
  locationIds: string[];
  eventTypes?: string[];
  needSectors?: string[];
  windowStart: string;
  windowEnd: string | null;
};

/** Id and generation time of the current analysis per frame, in input order. */
async function fetchAnalysisStamps(
  frames: FrameInput[],
  headers: Record<string, string>,
): Promise<({ id: string; generatedAt: string } | null)[]> {
  if (frames.length === 0) return [];
  const fields = frames.map((_, i) => `a${i}: analysis(frame: $f${i}) { id generatedAt }`).join("\n");
  const params = frames.map((_, i) => `$f${i}: AnalysisFrameInput!`).join(", ");
  const variables = Object.fromEntries(frames.map((f, i) => [`f${i}`, f]));
  const data = await graphqlFetch<Record<string, { id: string; generatedAt: string } | null>>(
    `query AnalysisStamps(${params}) {\n${fields}\n}`,
    variables,
    headers,
  );
  return frames.map((_, i) => data?.[`a${i}`] ?? null);
}

/**
 * The pipeline lists only aggregation contributors in `sources.reports`; most
 * narrative citations (every event, many reports) are missing and would
 * render as bare numbers. Hydrate both kinds, then map.
 */
async function hydrateAnalysis(
  row: AnalysisRow,
  scopeName: string,
  headers: Record<string, string>,
): Promise<Analysis> {
  const listed = row.data?.sources?.reports ?? [];
  const listedIds = new Set(listed.map((r) => r.report_id).filter(Boolean));
  const missing = (row.sourceReportIds ?? []).filter((id) => id && !listedIds.has(id));
  const missingEvents = missing
    .map((id) => [id, eventIdFromCitation(id)] as const)
    .filter((p): p is readonly [string, string] => p[1] !== null);
  const reportIds = [...listedIds, ...missing.filter((id) => eventIdFromCitation(id) === null)].filter(
    (id): id is string => !!id,
  );

  const [reportMeta, eventMeta] = await Promise.all([
    fetchReportMeta(reportIds, headers),
    fetchEventMeta(
      missingEvents.map(([, eventId]) => eventId),
      headers,
    ),
  ]);

  const withPublisher = listed.map((r) => {
    const name = r.report_id ? reportMeta.get(r.report_id)?.source?.name : undefined;
    return name ? { ...r, publisher: name } : r;
  });
  const hydratedReports = missing
    .map((id) => reportMeta.get(id))
    .filter((m): m is ReportMeta => !!m)
    .map((m) => ({
      report_id: m.reportId,
      report_title: m.reportTitle ?? undefined,
      source_url: m.sourceUrl ?? undefined,
      published_at: m.publishedAt ?? undefined,
      publisher: m.source?.name ?? undefined,
    }));
  const hydratedEvents = missingEvents
    .map(([citationId, eventId]) => {
      const ev = eventMeta.get(eventId);
      return ev
        ? {
            report_id: citationId,
            report_title: ev.title ?? undefined,
            source_url: `/event/${eventId}`,
            published_at: ev.firstSignalCreatedAt,
            publisher: "CLEAR",
          }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return mapAnalysis(
    {
      ...row,
      data: {
        ...row.data,
        sources: { reports: [...withPublisher, ...hydratedReports, ...hydratedEvents] },
      },
    },
    scopeName,
  );
}

export const analysisRouter = createTRPCRouter({
  /**
   * The current analysis for a country (the country-default scope). Tries the
   * current year's frame, then last year's for the days after New Year before
   * the weekly run has written the new one.
   */
  current: protectedProcedure
    .input(z.object({ countryLocationId: z.string().min(1), countryName: z.string().min(1) }))
    .query(async ({ ctx, input }): Promise<Analysis | null> => {
      const headers = cookieHeaders(ctx);
      const year = new Date().getUTCFullYear();

      let row: AnalysisRow | null = null;
      for (const y of [year, year - 1]) {
        const res = await graphqlFetch<{ analysis: AnalysisRow | null }>(
          ANALYSIS_QUERY,
          { frame: countryFrame(input.countryLocationId, y) },
          headers,
        );
        row = res.analysis;
        if (row) break;
      }
      return row ? hydrateAnalysis(row, input.countryName, headers) : null;
    }),

  /**
   * A created analysis: the rolling frame an automation keeps current. Null
   * until the pipeline's first run for the frame has landed.
   */
  forFrame: protectedProcedure
    .input(
      z.object({
        locationIds: z.array(z.string().min(1)).min(1),
        eventTypes: z.array(z.string()).default([]),
        needSectors: z.array(z.string()).default([]),
        windowStart: z.string().datetime(),
        name: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }): Promise<Analysis | null> => {
      const headers = cookieHeaders(ctx);
      const { name, ...frame } = input;
      const res = await graphqlFetch<{ analysis: AnalysisRow | null }>(
        ANALYSIS_QUERY,
        { frame: { ...frame, windowEnd: null } },
        headers,
      );
      return res.analysis ? hydrateAnalysis(res.analysis, name, headers) : null;
    }),

  /**
   * Every analysis the team can open: one per country (the weekly country
   * frame) and the team's created ones, named from their locations. Only the
   * row id and timestamp are read here; the payload loads on selection.
   */
  scopes: protectedProcedure
    .input(
      z.object({
        teamId: z.string().nullable(),
        countries: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
      }),
    )
    .query(async ({ ctx, input }): Promise<AnalysisScopes> => {
      const headers = cookieHeaders(ctx);
      const year = new Date().getUTCFullYear();

      // Without a team, clear-api would list every team's automations.
      const automations = input.teamId
        ? (
            await graphqlFetch<{ analysisAutomations: GqlAutomation[] }>(
              AUTOMATIONS_QUERY,
              { teamId: input.teamId },
              headers,
            )
          ).analysisAutomations
        : [];

      const locationIds = [...new Set(automations.flatMap((a) => a.locationIds))];
      const frames = [
        ...input.countries.flatMap((c) => [countryFrame(c.id, year), countryFrame(c.id, year - 1)]),
        ...automations.map((a) => ({
          locationIds: a.locationIds,
          eventTypes: a.eventTypes,
          needSectors: a.needSectors,
          windowStart: a.windowStart,
          windowEnd: null,
        })),
      ];
      const [locations, stamps] = await Promise.all([
        fetchLabelLocations(locationIds, headers),
        fetchAnalysisStamps(frames, headers),
      ]);

      const countries = input.countries.map((c, i) => {
        const stamp = stamps[2 * i] ?? stamps[2 * i + 1] ?? null;
        return { id: c.id, name: c.name, analysisId: stamp?.id ?? null, generatedAt: stamp?.generatedAt ?? null };
      });
      const offset = input.countries.length * 2;
      const created = automations.map((a, i): CreatedAnalysis => {
        const locs = a.locationIds.map((id) => locations.get(id)).filter((l): l is GqlLabelLocation => !!l);
        const stamp = stamps[offset + i] ?? null;
        return {
          id: a.id,
          name: scopeLabel(locs) || a.locationIds.join(", "),
          locationIds: a.locationIds,
          eventTypes: a.eventTypes,
          needSectors: a.needSectors,
          countryId: locs[0] ? countryOf(locs[0]) : null,
          windowStart: a.windowStart,
          cadence: a.cadence,
          enabled: a.enabled,
          createdAt: a.createdAt,
          analysisId: stamp?.id ?? null,
          generatedAt: stamp?.generatedAt ?? null,
        };
      });
      return { countries, created };
    }),

  /**
   * Create an analysis over one or more areas: a rolling automation keeps it
   * current, plus a one-off request for the same rolling frame so the first
   * version comes from the on-demand queue (polled every minute) instead of
   * waiting for the automation sensor's hourly poll. Admin / analyst, enforced
   * by clear-api.
   */
  create: protectedProcedure
    .input(
      z.object({
        teamId: z.string().min(1),
        locationIds: z.array(z.string().min(1)).min(1).max(MAX_CREATED_LOCATIONS),
        cadence: z.enum(ANALYSIS_CADENCES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const headers = cookieHeaders(ctx);
      const res = await graphqlFetch<{ createAnalysisAutomation: GqlAutomation }>(
        CREATE_AUTOMATION_MUTATION,
        {
          input: {
            teamId: input.teamId,
            locationIds: input.locationIds,
            cadence: input.cadence,
            windowStart: createdWindowStart(),
          },
        },
        headers,
      );
      const automation = res.createAnalysisAutomation;
      // Best-effort: without it the automation still generates, just on its hourly poll.
      let firstVersionRequested = true;
      try {
        await graphqlFetch(
          REQUEST_ANALYSIS_MUTATION,
          {
            input: {
              teamId: input.teamId,
              locationIds: automation.locationIds,
              eventTypes: automation.eventTypes,
              needSectors: automation.needSectors,
              windowStart: automation.windowStart,
              windowEnd: null,
            },
          },
          headers,
        );
      } catch {
        firstVersionRequested = false;
      }
      return { id: automation.id, firstVersionRequested };
    }),

  /** Stop and remove a created analysis. Its generated rows stay in history. */
  remove: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await graphqlFetch<{ deleteAnalysisAutomation: boolean }>(
        DELETE_AUTOMATION_MUTATION,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return { id: input.id };
    }),

  /**
   * Breakdown figures for the KPI cards (inside vs abroad, people in need by
   * sector) from the scope's all-time aggregation. Null-safe: missing fields
   * come back null and the card hides that subsection.
   */
  figures: protectedProcedure
    .input(z.object({ locationId: z.string().min(1) }))
    .query(async ({ ctx, input }): Promise<AnalysisFigures> => {
      const res = await graphqlFetch<{ aggregatedDatapoint: { data: Record<string, unknown> } | null }>(
        FIGURES_QUERY,
        {
          locationId: input.locationId,
          windowStart: "1970-01-01T00:00:00Z",
          windowEnd: new Date().toISOString(),
        },
        cookieHeaders(ctx),
      );
      return mapFigures(res.aggregatedDatapoint?.data);
    }),

  /**
   * Events in the scope since `from`, newest first, for the map and timeline.
   * clear-api filters to each location's whole admin subtree; a multi-district
   * scope is fetched per district and merged.
   */
  events: protectedProcedure
    .input(z.object({ locationIds: z.array(z.string().min(1)).min(1).max(MAX_CREATED_LOCATIONS), from: z.string().datetime() }))
    .query(async ({ ctx, input }): Promise<AnalysisEvents> => {
      const headers = cookieHeaders(ctx);
      const pages = await Promise.all(
        input.locationIds.map((locationId) =>
          graphqlFetch<{ eventsPage: { totalCount: number; items: GqlAnalysisEvent[] } }>(
            EVENTS_PAGE_QUERY,
            { input: { locationId, from: input.from, orderBy: "CREATED_DESC", limit: EVENTS_LIMIT } },
            headers,
          ),
        ),
      );
      const seen = new Set<string>();
      const items = pages
        .flatMap((p) => p.eventsPage.items)
        .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
        .map(toAnalysisEvent)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, EVENTS_LIMIT);
      return {
        totalCount: pages.reduce((n, p) => n + p.eventsPage.totalCount, 0),
        items,
      };
    }),
});
