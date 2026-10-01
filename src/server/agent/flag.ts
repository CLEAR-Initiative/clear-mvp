/**
 * Whether the `agent` feature flag is on, read server-side. The flag hides
 * the UI; the route checks it too, so turning it off stops model spend
 * (before rollout, or during an incident) instead of only hiding a button.
 * Unreadable flags fall back to the flag's default, which is off.
 */

import "server-only";
import { FEATURE_FLAGS } from "~/lib/constants/feature-flags";
import { graphqlFetch } from "~/server/api/graphql";

const AGENT_FLAG = "agent";

export async function agentFlagEnabled(cookie: string): Promise<boolean> {
  const fallback = FEATURE_FLAGS.find((f) => f.key === AGENT_FLAG)?.defaultEnabled ?? false;
  try {
    const data = await graphqlFetch<{ featureFlags: Array<{ key: string; enabled: boolean }> }>(
      `{ featureFlags { key enabled } }`,
      undefined,
      { Cookie: cookie },
    );
    return data.featureFlags.find((f) => f.key === AGENT_FLAG)?.enabled ?? fallback;
  } catch {
    return fallback;
  }
}
