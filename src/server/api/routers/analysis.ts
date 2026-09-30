import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import { fetchReportMeta, type ReportMeta } from "~/server/api/routers/situationAnalysis";
import {
  eventIdFromCitation,
  mapAnalysis,
  mapFigures,
  countryFrame,
  toAnalysisEvent,
  toCreatedAnalysis,
  type Analysis,
  type AnalysisEvents,
  type AnalysisFigures,
  type AnalysisRow,
  type AnalysisScopes,
  type CountryAnalysisEntry,
  type GqlAnalysisEvent,
  type GqlAutomation,
  type GqlLabelLocation,
} from "~/server/api/mappers/analysis";
import { leadSentences } from "~/app/(app)/insights/_components/situation/summary-citations";
import {
  ANALYSIS_CADENCES,
  MAX_CREATED_LOCATIONS,
  createdWindowStart,
  sameLocations,
  type AnalysisCadence,
} from "~/lib/analysis-view";
import { isPlatformAdmin } from "~/lib/roles";

// Domain types live in the mapper; re-exported so existing imports keep compiling.
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

/** clear-api clamps `eventsPage.limit` to 100. */
const EVENTS_LIMIT = 100;

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

/**
 * The caller's teams and a team's automations in one round trip: clear-api
 * checks only the role on automation writes and lists any team's automations
 * (S1/S2), so membership is checked here as well.
 */
const TEAM_AUTOMATIONS_QUERY = `
  query TeamAnalysisAutomations($teamId: String) {
    myTeams { id }
    analysisAutomations(teamId: $teamId) { ${AUTOMATION_FIELDS} }
  }
`;

const MY_TEAMS_QUERY = `
  query AnalysisMyTeams {
    myTeams { id }
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

const UPDATE_AUTOMATION_MUTATION = `
  mutation UpdateAnalysisAutomation($id: String!, $input: UpdateAnalysisAutomationInput!) {
    updateAnalysisAutomation(id: $id, input: $input) { id cadence enabled }
  }
`;

const DELETE_AUTOMATION_MUTATION = `
  mutation DeleteAnalysisAutomation($id: String!) {
    deleteAnalysisAutomation(id: $id)
  }
`;

type Caller = { user: { role: string } };

/** A team's automations, with whether the caller belongs to the team. */
async function fetchTeamAutomations(
  teamId: string,
  headers: Record<string, string>,
): Promise<{ member: boolean; automations: GqlAutomation[] }> {
  const data = await graphqlFetch<{ myTeams: { id: string }[] | null; analysisAutomations: GqlAutomation[] | null }>(
    TEAM_AUTOMATIONS_QUERY,
    { teamId },
    headers,
  );
  return {
    member: (data.myTeams ?? []).some((t) => t.id === teamId),
    automations: data.analysisAutomations ?? [],
  };
}

/** The cadence a user picked for an automation: a disabled one updates only on request. */
function cadenceOf(a: GqlAutomation): AnalysisCadence {
  if (!a.enabled) return "manual";
  return (ANALYSIS_CADENCES as readonly string[]).includes(a.cadence) ? (a.cadence as AnalysisCadence) : "weekly";
}

function forbidden(): never {
  throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this team" });
}

/** The team's automations; rejects a caller outside the team unless a platform admin. */
async function requireTeamAutomations(
  ctx: Caller,
  teamId: string,
  headers: Record<string, string>,
): Promise<GqlAutomation[]> {
  const { member, automations } = await fetchTeamAutomations(teamId, headers);
  if (!member && !isPlatformAdmin(ctx.user.role)) forbidden();
  return automations;
}

/**
 * An automation write: the caller must belong to `teamId` and the automation
 * to that team. Platform admins skip both checks (and the round trip).
 */
async function requireTeamAutomation(
  ctx: Caller,
  teamId: string,
  id: string,
  headers: Record<string, string>,
): Promise<void> {
  if (isPlatformAdmin(ctx.user.role)) return;
  const automations = await requireTeamAutomations(ctx, teamId, headers);
  if (!automations.some((a) => a.id === id)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found in this team" });
  }
}

/** A team-scoped request: the caller must belong to `teamId` unless a platform admin. */
async function requireTeamMember(ctx: Caller, teamId: string, headers: Record<string, string>): Promise<void> {
  if (isPlatformAdmin(ctx.user.role)) return;
  const data = await graphqlFetch<{ myTeams: { id: string }[] | null }>(MY_TEAMS_QUERY, {}, headers);
  if (!(data.myTeams ?? []).some((t) => t.id === teamId)) forbidden();
}

/**
 * Names and ancestor chains for scope labels, one aliased round trip, retried
 * once. Best-effort: an empty map leaves raw ids in the label and a null
 * country, which the UI lists everywhere rather than hiding.
 */
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
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await graphqlFetch<Record<string, GqlLabelLocation | null>>(
        `query ScopeLocations(${params}) {\n${fields}\n}`,
        variables,
        headers,
      );
      for (const loc of Object.values(data ?? {})) if (loc?.id) out.set(loc.id, loc);
      return out;
    } catch {
      // Retry once, then fall back to raw ids in the label.
    }
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
 * First summary sentence per frame, in input order. Reads `data` only for the
 * frames given (the ones known to exist). Best-effort: the list still renders
 * without headlines.
 */
async function fetchHeadlines(
  frames: FrameInput[],
  headers: Record<string, string>,
): Promise<(string | null)[]> {
  if (frames.length === 0) return [];
  const fields = frames.map((_, i) => `h${i}: analysis(frame: $f${i}) { data }`).join("\n");
  const params = frames.map((_, i) => `$f${i}: AnalysisFrameInput!`).join(", ");
  const variables = Object.fromEntries(frames.map((f, i) => [`f${i}`, f]));
  try {
    const data = await graphqlFetch<Record<string, { data: { ai_summary?: { text?: unknown } } | null } | null>>(
      `query AnalysisHeadlines(${params}) {\n${fields}\n}`,
      variables,
      headers,
    );
    return frames.map((_, i) => {
      const text = data?.[`h${i}`]?.data?.ai_summary?.text;
      if (typeof text !== "string" || !text.trim()) return null;
      return leadSentences(text, 1).lead || null;
    });
  } catch {
    return frames.map(() => null);
  }
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

      // Without a team, clear-api would list every team's automations; it
      // would also list a team the caller is not in, so that is checked here.
      let automations: GqlAutomation[] = [];
      if (input.teamId) {
        const team = await fetchTeamAutomations(input.teamId, headers);
        if (team.member || isPlatformAdmin(ctx.user.role)) automations = team.automations;
      }

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

      // Headlines only for the country frame that exists (this year's, else last year's).
      const existing = input.countries
        .map((c, i) => {
          if (stamps[2 * i]) return { i, frame: countryFrame(c.id, year) };
          if (stamps[2 * i + 1]) return { i, frame: countryFrame(c.id, year - 1) };
          return null;
        })
        .filter((e): e is { i: number; frame: ReturnType<typeof countryFrame> } => e !== null);
      const headlines = await fetchHeadlines(
        existing.map((e) => e.frame),
        headers,
      );
      const headlineOf = new Map(existing.map((e, k) => [e.i, headlines[k] ?? null]));

      const countries = input.countries.map((c, i): CountryAnalysisEntry => {
        const stamp = stamps[2 * i] ?? stamps[2 * i + 1] ?? null;
        return {
          id: c.id,
          name: c.name,
          analysisId: stamp?.id ?? null,
          generatedAt: stamp?.generatedAt ?? null,
          headline: headlineOf.get(i) ?? null,
        };
      });
      const offset = input.countries.length * 2;
      const created = automations.map((a, i) => toCreatedAnalysis(a, locations, stamps[offset + i] ?? null));
      return { countries, created };
    }),

  /**
   * Create an analysis over one or more areas: a rolling automation keeps it
   * current, plus a one-off request for the same rolling frame so the first
   * version comes from the on-demand queue (polled every minute) instead of
   * waiting for the automation sensor's hourly poll. "manual" disables the
   * automation once that request is in, so it only updates on request; if
   * the request fails the automation stays on weekly so a first version still
   * comes. The team already covering the same areas gets that analysis back
   * instead of a second one. Team membership is checked here; the role
   * (admin / analyst) by clear-api.
   */
  create: protectedProcedure
    .input(
      z.object({
        teamId: z.string().min(1),
        locationIds: z.array(z.string().min(1)).min(1).max(MAX_CREATED_LOCATIONS),
        cadence: z.enum(ANALYSIS_CADENCES),
      }),
    )
    .mutation(
      async ({
        ctx,
        input,
      }): Promise<{ id: string; firstVersionRequested: boolean; existing: boolean; cadence: AnalysisCadence }> => {
        const headers = cookieHeaders(ctx);
        const automations = await requireTeamAutomations(ctx, input.teamId, headers);
        const same = automations.find((a) => sameLocations(a.locationIds, input.locationIds));
        if (same) {
          return { id: same.id, firstVersionRequested: false, existing: true, cadence: cadenceOf(same) };
        }

        const res = await graphqlFetch<{ createAnalysisAutomation: GqlAutomation }>(
          CREATE_AUTOMATION_MUTATION,
          {
            input: {
              teamId: input.teamId,
              locationIds: input.locationIds,
              // clear-api has no "manual" cadence; the automation is disabled below.
              cadence: input.cadence === "manual" ? "weekly" : input.cadence,
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

        let cadence: AnalysisCadence = input.cadence;
        if (input.cadence === "manual") {
          // Disabled before its first version, it would never generate: stay weekly.
          cadence = "weekly";
          if (firstVersionRequested) {
            try {
              await graphqlFetch(UPDATE_AUTOMATION_MUTATION, { id: automation.id, input: { enabled: false } }, headers);
              cadence = "manual";
            } catch {
              // Still weekly, which the user can change.
            }
          }
        }
        return { id: automation.id, firstVersionRequested, existing: false, cadence };
      },
    ),

  /**
   * Ask for a new version of a frame now. The pipeline drains the request
   * queue within about a minute and writes a new version of the same frame.
   * Admin / analyst, enforced by clear-api; errors propagate to the UI.
   */
  refresh: protectedProcedure
    .input(
      z.object({
        locationIds: z.array(z.string().min(1)).min(1).max(MAX_CREATED_LOCATIONS),
        eventTypes: z.array(z.string()).default([]),
        needSectors: z.array(z.string()).default([]),
        windowStart: z.string().datetime(),
        windowEnd: z.string().datetime().nullable(),
        teamId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const headers = cookieHeaders(ctx);
      if (input.teamId) await requireTeamMember(ctx, input.teamId, headers);
      await graphqlFetch(REQUEST_ANALYSIS_MUTATION, { input }, headers);
      return { requested: true as const };
    }),

  /**
   * Change how often a created analysis updates; "manual" pauses the
   * automation. The caller must belong to the team that owns it.
   */
  setCadence: protectedProcedure
    .input(z.object({ id: z.string().min(1), cadence: z.enum(ANALYSIS_CADENCES), teamId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const headers = cookieHeaders(ctx);
      await requireTeamAutomation(ctx, input.teamId, input.id, headers);
      await graphqlFetch(
        UPDATE_AUTOMATION_MUTATION,
        {
          id: input.id,
          input: input.cadence === "manual" ? { enabled: false } : { cadence: input.cadence, enabled: true },
        },
        headers,
      );
      return { id: input.id };
    }),

  /**
   * Stop and remove a created analysis. Its generated rows stay in history.
   * The caller must belong to the team that owns it.
   */
  remove: protectedProcedure
    .input(z.object({ id: z.string().min(1), teamId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const headers = cookieHeaders(ctx);
      await requireTeamAutomation(ctx, input.teamId, input.id, headers);
      await graphqlFetch<{ deleteAnalysisAutomation: boolean }>(DELETE_AUTOMATION_MUTATION, { id: input.id }, headers);
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
