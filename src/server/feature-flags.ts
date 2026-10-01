/**
 * One feature flag, read server-side from clear-api, for procedures that
 * must honour a flag and not only hide its UI. Unreadable flags fall back to
 * their registry default.
 */

import { FEATURE_FLAGS } from "~/lib/constants/feature-flags";
import { graphqlFetch } from "~/server/api/graphql";

export async function readFeatureFlag(key: string, headers: Record<string, string>): Promise<boolean> {
  const fallback = FEATURE_FLAGS.find((f) => f.key === key)?.defaultEnabled ?? false;
  try {
    const data = await graphqlFetch<{ featureFlags: Array<{ key: string; enabled: boolean }> }>(
      `{ featureFlags { key enabled } }`,
      undefined,
      headers,
    );
    return data.featureFlags.find((f) => f.key === key)?.enabled ?? fallback;
  } catch {
    return fallback;
  }
}
