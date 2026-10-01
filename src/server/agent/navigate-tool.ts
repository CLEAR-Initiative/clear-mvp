/**
 * Agent navigation: the CLEAR Agent changing what the user is looking at,
 * never any data (CONTEXT.md). The model picks a target from a closed set —
 * an Event, Signal or Crisis, or the Map or Detection with filters — so it
 * can't send the user anywhere else (admin pages are never targets). An
 * entity target is fetched first with the matching clear_get_* tool, as the
 * user, so it exists and they can see it; place names in filters are
 * resolved with clear_find_location, so the page gets names and ids it
 * knows. The client performs the move, announces it in the Thread and offers
 * Back to the exact previous view.
 */

import "server-only";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  DETECTION_ROLLING_DATES,
  DETECTION_SEVERITIES,
  MAP_TIMEFRAMES,
  detectionDeepLinkHref,
  mapDeepLinkHref,
} from "~/lib/agent-deep-link";
import type { CuratedToolOutcome } from "~/server/agent/clear-data-tools";

export const NAVIGATE_TOOL_ID = "navigate";

export const ENTITY_KINDS = ["event", "signal", "crisis"] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

const GET_TOOL: Record<EntityKind, string> = {
  event: "clear_get_event",
  signal: "clear_get_signal",
  crisis: "clear_get_crisis",
};

const LABEL_CHARS = 80;

const entityTarget = z.object({
  kind: z.enum(ENTITY_KINDS),
  id: z.string().min(1).max(128).describe("The entity's id, from a clear_* tool result."),
});

const place = z.string().trim().min(1).max(100);
const mapTarget = z.object({
  kind: z.literal("map"),
  filters: z.object({
    country: place.optional().describe("Country name, e.g. \"Sudan\". Omit for all countries."),
    region: place.optional().describe("State/province name within that country."),
    timeframe: z.enum(MAP_TIMEFRAMES).optional().describe("Default 30d."),
  }),
});
const detectionTarget = z.object({
  kind: z.literal("detection"),
  filters: z.object({
    country: place.optional().describe("Country name, e.g. \"Sudan\"."),
    region: place.optional().describe("State/province name within that country."),
    date: z.enum(DETECTION_ROLLING_DATES).optional().describe("Default Last 30 days."),
    severities: z.array(z.enum(DETECTION_SEVERITIES)).min(1).max(4).optional(),
  }),
});

export const navigateInputSchema = z.object({
  target: z.union([entityTarget, mapTarget, detectionTarget]),
});
export type NavigateInput = z.infer<typeof navigateInputSchema>;
type NavigateError = { error: { code: string; message: string } };

/** What the client needs to make the move and announce it. */
export interface NavigateOutput {
  moved: true;
  target: { kind: string; id?: string };
  /** App path; always one of the fixed entity routes. */
  url: string;
  /**
   * The announcement's short name. Under `content` because an entity's name
   * is its title, which can come from outside CLEAR (a Signal's headline):
   * the system prompt's third-party rule covers text under a `content` key.
   */
  content: { label: string };
}

type RunCuratedTool = (name: string, input: unknown, signal?: AbortSignal) => Promise<CuratedToolOutcome>;

function labelOf(kind: EntityKind, id: string, item: Record<string, unknown>): string {
  const content = item.content as { title?: unknown } | undefined;
  const title = [content?.title, item.title].find((t): t is string => typeof t === "string" && t.trim() !== "");
  const name = title?.trim() ?? id;
  return name.length > LABEL_CHARS ? `${name.slice(0, LABEL_CHARS - 1)}…` : name;
}

/** Candidates fetched per lookup: enough to tell a clear match from a tie. */
const PLACE_CANDIDATES = 5;
/** clear_find_location's score for an exact name match. */
const EXACT_MATCH = 100;

/**
 * Resolve a place name to the one location CLEAR knows by it, as the user.
 * An exact name match wins; so does the only match. Anything else is
 * AMBIGUOUS with the candidates, so the Agent asks rather than moving the
 * user to whichever "… Darfur" happens to sort first.
 */
async function findPlace(
  run: RunCuratedTool,
  query: string,
  level: 0 | 1,
  withinLocationId: string | undefined,
  signal?: AbortSignal,
): Promise<{ id: string; name: string } | NavigateError> {
  const outcome = await run(
    "clear_find_location",
    { query, level, ...(withinLocationId ? { withinLocationId } : {}), limit: PLACE_CANDIDATES },
    signal,
  );
  if (!outcome.ok) return { error: outcome.error };
  const { items = [], totalCount = items.length } = outcome.value as {
    items?: Array<{ id: string; name: string; score?: number }>;
    totalCount?: number;
  };
  const kind = level ? "region" : "country";
  if (items.length === 0) {
    return { error: { code: "NOT_FOUND", message: `CLEAR has no ${kind} called ${query}.` } };
  }
  const exact = items.filter((i) => i.score === EXACT_MATCH);
  if (exact.length === 1) return pick(exact[0]!);
  if (exact.length === 0 && totalCount === 1) return pick(items[0]!);
  const names = (exact.length > 1 ? exact : items).map((i) => i.name);
  return {
    error: {
      code: "AMBIGUOUS",
      message: `More than one ${kind} matches ${query}: ${names.join(", ")}${totalCount > items.length ? ", …" : ""}. Ask the user which one.`,
    },
  };
}

const pick = ({ id, name }: { id: string; name: string }) => ({ id, name });

const isError = (v: unknown): v is NavigateError => !!v && typeof v === "object" && "error" in v;

/** What navigate knows about the turn beyond its input. */
export interface NavigateContext {
  /**
   * The user's active team, from the turn's Current view. The pages scope to
   * this team only, so scope is checked against it when it's known.
   */
  activeTeamId?: string;
}

/**
 * Whether the page will show this country. A team without a country
 * (level 0) binding monitors globally, as the pages treat it; a
 * country-scoped team must have the country among its bindings. The pages
 * scope to the active team, so that is the team checked; only when the turn
 * didn't say which team is active does any of the user's teams do.
 */
async function countryInScope(
  run: RunCuratedTool,
  country: { id: string; name: string },
  { activeTeamId }: NavigateContext,
  signal?: AbortSignal,
): Promise<true | NavigateError> {
  const outcome = await run("clear_whoami", {}, signal);
  if (!outcome.ok) return { error: outcome.error };
  const allTeams =
    (
      outcome.value as {
        teams?: Array<{ id: string; locations?: Array<{ id: string; name: string; level: number }> }>;
      }
    ).teams ?? [];
  const active = activeTeamId ? allTeams.filter((t) => t.id === activeTeamId) : [];
  const teams = active.length > 0 ? active : allTeams;
  const bound = teams.map((t) => (t.locations ?? []).filter((l) => l.level === 0));
  if (bound.length === 0 || bound.some((countries) => countries.length === 0)) return true;
  const allowed = bound.flat();
  if (allowed.some((c) => c.id === country.id)) return true;
  const names = [...new Set(allowed.map((c) => c.name))].join(", ");
  return {
    error: {
      code: "OUT_OF_SCOPE",
      message: `${country.name} is outside the ${active.length > 0 ? "active team's" : "user's team"} scope (${names}); the page can't show it.`,
    },
  };
}

async function resolveScope(
  filters: { country?: string; region?: string },
  run: RunCuratedTool,
  context: NavigateContext,
  signal?: AbortSignal,
): Promise<{ country?: { id: string; name: string }; region?: { id: string; name: string } } | NavigateError> {
  if (filters.region && !filters.country) {
    return { error: { code: "BAD_USER_INPUT", message: "A region needs its country." } };
  }
  if (!filters.country) return {};
  const country = await findPlace(run, filters.country, 0, undefined, signal);
  if (isError(country)) return country;
  const inScope = await countryInScope(run, country, context, signal);
  if (isError(inScope)) return inScope;
  if (!filters.region) return { country };
  const region = await findPlace(run, filters.region, 1, country.id, signal);
  if (isError(region)) return region;
  return { country, region };
}

function scopeLabel(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" · ");
}

export async function resolveNavigation(
  { target }: NavigateInput,
  run: RunCuratedTool,
  context: NavigateContext = {},
  signal?: AbortSignal,
): Promise<NavigateOutput | NavigateError> {
  if (target.kind === "map" || target.kind === "detection") {
    const scope = await resolveScope(target.filters, run, context, signal);
    if (isError(scope)) return scope;
    if (target.kind === "map") {
      const { timeframe } = target.filters;
      return {
        moved: true,
        target: { kind: "map" },
        url: mapDeepLinkHref({ country: scope.country?.name, region: scope.region?.name, timeframe }),
        content: { label: scopeLabel([scope.country?.name ?? "All countries", scope.region?.name, timeframe]) },
      };
    }
    const { date, severities } = target.filters;
    return {
      moved: true,
      target: { kind: "detection" },
      url: detectionDeepLinkHref({ country: scope.country?.name, region: scope.region?.id, date, severities }),
      content: {
        label: scopeLabel([scope.country?.name ?? "All countries", scope.region?.name, date, severities?.join(", ")]),
      },
    };
  }

  const outcome = await run(GET_TOOL[target.kind], { id: target.id }, signal);
  if (!outcome.ok) return { error: outcome.error };
  const item = (outcome.value as { item?: Record<string, unknown> | null }).item;
  if (!item) {
    return { error: { code: "NOT_FOUND", message: `No ${target.kind} has id ${target.id}.` } };
  }
  return {
    moved: true,
    target,
    url: `/${target.kind}/${encodeURIComponent(target.id)}`,
    content: { label: labelOf(target.kind, target.id, item) },
  };
}

export function createNavigateTool(run: RunCuratedTool, context: NavigateContext = {}) {
  return createTool({
    id: NAVIGATE_TOOL_ID,
    description:
      "Move the user's screen so they can see something: an Event, Signal or Crisis (by id " +
      "from a clear_* tool result), or the Map or Detection with filters (country and region " +
      "by name; the app resolves them). Changes no data. The app announces the move in the " +
      "Thread and offers Back. Use it when the user asks to see, open, show or go to something.",
    inputSchema: navigateInputSchema,
    // No outputSchema: an error value must reach the model as-is.
    execute: async (input, toolContext) => resolveNavigation(input, run, context, toolContext?.abortSignal),
  });
}
