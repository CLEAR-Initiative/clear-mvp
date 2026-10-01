/**
 * One feature flag, read server-side from clear-api, for procedures that
 * must honour a flag and not only hide its UI. Unreadable flags fall back to
 * their registry default.
 *
 * Flags are global (not per user) and clear-api's `featureFlags` query is
 * open, so each server process keeps the list for CACHE_MS: a polled
 * procedure doesn't add a flags round-trip every time. A toggle reaches the
 * server within that window.
 */

import { FEATURE_FLAGS } from "~/lib/constants/feature-flags";
import { graphqlFetch } from "~/server/api/graphql";

const CACHE_MS = 30_000;
let cached: { at: number; flags: Map<string, boolean> } | null = null;

export async function readFeatureFlag(key: string, headers: Record<string, string>): Promise<boolean> {
  const fallback = FEATURE_FLAGS.find((f) => f.key === key)?.defaultEnabled ?? false;
  if (!cached || Date.now() - cached.at >= CACHE_MS) {
    try {
      const data = await graphqlFetch<{ featureFlags: Array<{ key: string; enabled: boolean }> }>(
        `{ featureFlags { key enabled } }`,
        undefined,
        headers,
      );
      cached = { at: Date.now(), flags: new Map(data.featureFlags.map((f) => [f.key, f.enabled])) };
    } catch {
      // Not cached: the next call tries clear-api again.
      return cached?.flags.get(key) ?? fallback;
    }
  }
  return cached.flags.get(key) ?? fallback;
}

/** Test seam: forget the cached flags. */
export function resetFeatureFlagCache(): void {
  cached = null;
}
