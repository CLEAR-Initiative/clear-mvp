/**
 * CLEAR's own data as CLEAR Agent tools (ADR-0009 in clear-mcp).
 *
 * The curated clear-mcp tools, in-process, through the Tool library — the
 * same names, descriptions, schemas and results as the MCP server, with no
 * MCP protocol. Each request builds its own upstream on the signed-in user's
 * Cookie and locale, so every call runs with exactly that user's clear-api
 * permissions. The escape hatch (clear_graphql) is not in the library and is
 * never offered.
 *
 * Results and errors are values: a FORBIDDEN or UNAUTHENTICATED outcome
 * reaches the model as `{ error }`, never as a thrown failure.
 */

import "server-only";
import {
  createLocationIndex,
  createUpstream,
  curatedTools,
  runTool,
  silentLogger,
  type Config,
} from "@clear-initiative/mcp/library";
import { createTool } from "@mastra/core/tools";
import type { Locale } from "~/i18n/config";
import { API_URL } from "~/server/env";

/**
 * One per process: the location index holds location tiers only (per
 * locale), never an upstream or a credential, so it is safe to share.
 */
const CURATED_TOOLS = curatedTools({ locationIndex: createLocationIndex() });

export const CLEAR_DATA_TOOL_NAMES: readonly string[] = CURATED_TOOLS.map((t) => t.name);

export interface ClearDataToolsRequest {
  /** The signed-in user's Cookie header, forwarded to clear-api as-is. */
  cookie: string;
  locale: Locale;
}

export type CuratedToolOutcome =
  | { ok: true; value: unknown }
  | { ok: false; error: { code: string; subCode?: string; message: string } };

/**
 * The CLEAR data tools for one request, as Mastra tools, plus `run` for
 * calling one directly (Agent navigation validates its targets with it).
 */
export function createClearData({ cookie, locale }: ClearDataToolsRequest) {
  const config: Config = {
    apiUrl: API_URL,
    credential: { kind: "headers", headers: { cookie } },
    locale,
    rawGraphql: false,
    logLevel: "silent",
  };
  const upstream = createUpstream({ config });
  const log = silentLogger();

  const run = async (name: string, input: unknown, signal?: AbortSignal): Promise<CuratedToolOutcome> => {
    const tool = CURATED_TOOLS.find((t) => t.name === name);
    if (!tool) throw new Error(`No curated tool ${name}`);
    return runTool(tool, input, { config, upstream, log, signal }) as Promise<CuratedToolOutcome>;
  };

  const tools = Object.fromEntries(
    CURATED_TOOLS.map((tool) => [
      tool.name,
      createTool({
        id: tool.name,
        description: tool.description,
        inputSchema: tool.input,
        // No outputSchema: an error value must reach the model as-is.
        execute: async (input, context) => {
          const outcome = await run(tool.name, input, context?.abortSignal);
          return outcome.ok ? outcome.value : { error: outcome.error };
        },
      }),
    ]),
  );

  return { tools, run };
}
