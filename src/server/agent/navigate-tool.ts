/**
 * Agent navigation: the CLEAR Agent changing what the user is looking at,
 * never any data (CONTEXT.md). The model picks a target from a closed set —
 * an Event, Signal or Crisis — so it can't send the user anywhere else
 * (admin pages are never targets). An entity target is fetched first with
 * the matching clear_get_* tool, as the user, so it exists and they can see
 * it. The client performs the move, announces it in the Thread and offers
 * Back to the exact previous view.
 */

import "server-only";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
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

export const navigateInputSchema = z.object({ target: entityTarget });
export type NavigateInput = z.infer<typeof navigateInputSchema>;

/** What the client needs to make the move and announce it. */
export interface NavigateOutput {
  moved: true;
  target: NavigateInput["target"];
  /** App path; always one of the fixed entity routes. */
  url: string;
  /** Short name for the announcement. Plain text from CLEAR's data. */
  label: string;
}

type RunCuratedTool = (name: string, input: unknown, signal?: AbortSignal) => Promise<CuratedToolOutcome>;

function labelOf(kind: EntityKind, id: string, item: Record<string, unknown>): string {
  const content = item.content as { title?: unknown } | undefined;
  const title = [content?.title, item.title].find((t): t is string => typeof t === "string" && t.trim() !== "");
  const name = title?.trim() ?? id;
  return name.length > LABEL_CHARS ? `${name.slice(0, LABEL_CHARS - 1)}…` : name;
}

export async function resolveNavigation(
  { target }: NavigateInput,
  run: RunCuratedTool,
  signal?: AbortSignal,
): Promise<NavigateOutput | { error: { code: string; message: string } }> {
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
    label: labelOf(target.kind, target.id, item),
  };
}

export function createNavigateTool(run: RunCuratedTool) {
  return createTool({
    id: NAVIGATE_TOOL_ID,
    description:
      "Move the user's screen to an Event, Signal or Crisis so they can see it. Changes no " +
      "data. The app announces the move in the Thread and offers Back. Use it when the user " +
      "asks to see, open or go to something, with an id from a clear_* tool result.",
    inputSchema: navigateInputSchema,
    // No outputSchema: an error value must reach the model as-is.
    execute: async (input, context) => resolveNavigation(input, run, context?.abortSignal),
  });
}
