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

/** Resolve a place name to the location CLEAR knows, as the user. */
async function findPlace(
  run: RunCuratedTool,
  query: string,
  level: 0 | 1,
  withinLocationId: string | undefined,
  signal?: AbortSignal,
): Promise<{ id: string; name: string } | NavigateError> {
  const outcome = await run(
    "clear_find_location",
    { query, level, ...(withinLocationId ? { withinLocationId } : {}), limit: 1 },
    signal,
  );
  if (!outcome.ok) return { error: outcome.error };
  const found = (outcome.value as { items?: Array<{ id: string; name: string }> }).items?.[0];
  if (!found) {
    return { error: { code: "NOT_FOUND", message: `CLEAR has no ${level ? "region" : "country"} called ${query}.` } };
  }
  return found;
}

const isError = (v: unknown): v is NavigateError => !!v && typeof v === "object" && "error" in v;

/**
 * Whether the user's teams let them see this country. A team without a
 * country (level 0) binding monitors globally, as the pages treat it; with
 * only country-scoped teams, the country must be one of their bindings.
 */
async function countryInScope(
  run: RunCuratedTool,
  country: { id: string; name: string },
  signal?: AbortSignal,
): Promise<true | NavigateError> {
  const outcome = await run("clear_whoami", {}, signal);
  if (!outcome.ok) return { error: outcome.error };
  const teams =
    (outcome.value as { teams?: Array<{ locations?: Array<{ id: string; name: string; level: number }> }> })
      .teams ?? [];
  const bound = teams.map((t) => (t.locations ?? []).filter((l) => l.level === 0));
  if (bound.length === 0 || bound.some((countries) => countries.length === 0)) return true;
  const allowed = bound.flat();
  if (allowed.some((c) => c.id === country.id)) return true;
  const names = [...new Set(allowed.map((c) => c.name))].join(", ");
  return {
    error: {
      code: "OUT_OF_SCOPE",
      message: `${country.name} is outside the user's team scope (${names}); the page can't show it.`,
    },
  };
}

async function resolveScope(
  filters: { country?: string; region?: string },
  run: RunCuratedTool,
  signal?: AbortSignal,
): Promise<{ country?: { id: string; name: string }; region?: { id: string; name: string } } | NavigateError> {
  if (filters.region && !filters.country) {
    return { error: { code: "BAD_USER_INPUT", message: "A region needs its country." } };
  }
  if (!filters.country) return {};
  const country = await findPlace(run, filters.country, 0, undefined, signal);
  if (isError(country)) return country;
  const inScope = await countryInScope(run, country, signal);
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
  signal?: AbortSignal,
): Promise<NavigateOutput | NavigateError> {
  if (target.kind === "map" || target.kind === "detection") {
    const scope = await resolveScope(target.filters, run, signal);
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

export function createNavigateTool(run: RunCuratedTool) {
  return createTool({
    id: NAVIGATE_TOOL_ID,
    description:
      "Move the user's screen so they can see something: an Event, Signal or Crisis (by id " +
      "from a clear_* tool result), or the Map or Detection with filters (country and region " +
      "by name; the app resolves them). Changes no data. The app announces the move in the " +
      "Thread and offers Back. Use it when the user asks to see, open, show or go to something.",
    inputSchema: navigateInputSchema,
    // No outputSchema: an error value must reach the model as-is.
    execute: async (input, context) => resolveNavigation(input, run, context?.abortSignal),
  });
}
