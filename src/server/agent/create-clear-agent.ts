/**
 * Builds the CLEAR Agent for one request (ADR-0006).
 *
 * Everything that touches a credential — the memory storage bound to the
 * user's Cookie, the tools — is constructed per request, so no Caller's
 * session ever lands in shared state. Keep this module self-contained: when
 * the Agent moves to its own service, it moves as one directory.
 */

import "server-only";
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { MastraCompositeStore } from "@mastra/core/storage";
import { Memory } from "@mastra/memory";
import { createConversationsApi } from "~/server/agent/conversations";
import { clearAgentInstructions } from "~/server/agent/instructions";
import { ClearApiMemoryStorage } from "~/server/agent/memory-storage";
import { resolveClearAgentModel } from "~/server/agent/model";
import { createClearData } from "~/server/agent/clear-data-tools";
import { createNavigateTool, NAVIGATE_TOOL_ID } from "~/server/agent/navigate-tool";
import { createNrcFindTool, NRC_FIND_TOOL_ID } from "~/server/agent/nrc-find-tool";
import type { Locale } from "~/i18n/config";
import type { SessionUser } from "~/server/session";

export const CLEAR_AGENT_ID = "clear-agent";

/** Earlier turns the Agent answers from. Tool calls and results count too. */
const HISTORY_MESSAGES = 20;

export interface ClearAgentRequest {
  user: SessionUser;
  /** The signed-in user's Cookie header, forwarded to clear-api as-is. */
  cookie: string;
  /** The user's interface language; the Agent answers in it. */
  locale: Locale;
  /** `agent_clear_data` on: offer CLEAR's own data as tools. */
  clearData: boolean;
}

export function createClearAgent({ user, cookie, locale, clearData }: ClearAgentRequest): Mastra {
  const storage = new MastraCompositeStore({
    id: "clear-api-conversations",
    domains: {
      memory: new ClearApiMemoryStorage(createConversationsApi(cookie), user.id),
    },
  });

  // V2 (agent_clear_data): CLEAR's own data, and Agent navigation over it.
  const clear = clearData ? createClearData({ cookie, locale }) : null;

  const agent = new Agent({
    id: CLEAR_AGENT_ID,
    name: "CLEAR Agent",
    instructions: clearAgentInstructions(locale, { clearData }),
    model: resolveClearAgentModel(),
    tools: {
      [NRC_FIND_TOOL_ID]: createNrcFindTool(),
      ...(clear ? { ...clear.tools, [NAVIGATE_TOOL_ID]: createNavigateTool(clear.run) } : {}),
    },
    memory: new Memory({
      storage,
      options: {
        lastMessages: HISTORY_MESSAGES,
        // What the Agent keeps about the user across Threads, stored as
        // clear-api's Agent working memory for the session user.
        workingMemory: { enabled: true, scope: "resource" },
        // ADR-0009 staging: history and working memory first; semantic
        // recall and observational memory only if long Threads need them.
        semanticRecall: false,
      },
    }),
  });

  return new Mastra({ agents: { [CLEAR_AGENT_ID]: agent }, logger: false });
}
