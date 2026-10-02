/**
 * The CLEAR Agent's feature flags, read server-side. The flags hide the UI;
 * the route checks them too, so turning one off stops what it gates (model
 * spend, CLEAR data access) instead of only hiding a button. Unreadable
 * flags fall back to their defaults, which are off.
 *
 *  - `agent`: the CLEAR Agent at all.
 *  - `agent_clear_data`: CLEAR data tools, Current view and Agent navigation
 *    (V2). Off, the Agent answers from NRC Find only.
 */

import "server-only";
import { FEATURE_FLAGS } from "~/lib/constants/feature-flags";
import { graphqlFetch } from "~/server/api/graphql";

export interface AgentFlags {
  agent: boolean;
  clearData: boolean;
}

const defaultOf = (key: string) => FEATURE_FLAGS.find((f) => f.key === key)?.defaultEnabled ?? false;

export async function readAgentFlags(cookie: string): Promise<AgentFlags> {
  const read = (flags: Array<{ key: string; enabled: boolean }>, key: string) =>
    flags.find((f) => f.key === key)?.enabled ?? defaultOf(key);
  try {
    const data = await graphqlFetch<{ featureFlags: Array<{ key: string; enabled: boolean }> }>(
      `{ featureFlags { key enabled } }`,
      undefined,
      { Cookie: cookie },
    );
    const agent = read(data.featureFlags, "agent");
    return { agent, clearData: agent && read(data.featureFlags, "agent_clear_data") };
  } catch {
    const agent = defaultOf("agent");
    return { agent, clearData: agent && defaultOf("agent_clear_data") };
  }
}
