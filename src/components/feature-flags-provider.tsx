"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "~/trpc/react";
import { FEATURE_FLAGS, type FeatureFlagDefinition } from "~/lib/constants/feature-flags";
import { useHydrated } from "~/hooks/use-hydrated";

export type EnrichedFeatureFlag = FeatureFlagDefinition & { enabled: boolean };

interface FeatureFlagsContextValue {
  flags: Record<string, boolean>;
  features: EnrichedFeatureFlag[];
  isLoading: boolean;
  toggle: (key: string, enabled: boolean) => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: {},
  features: FEATURE_FLAGS.map((f) => ({ ...f, enabled: f.defaultEnabled })),
  isLoading: true,
  toggle: () => {},
});

/**
 * Provider for feature-flag state. Server (clear-api) is the source of
 * truth — toggles go through a tRPC mutation that upserts the row in
 * Postgres, then we optimistically patch the React Query cache so the
 * UI reflects the change before the round-trip resolves.
 *
 * No localStorage layer: previously the provider kept "local overrides"
 * in localStorage which meant toggles were per-browser and got wiped by
 * the logout handler's `localStorage.clear()`. With server persistence
 * those overrides became actively misleading (an admin's toggle never
 * reached other users), so the layer is gone.
 */
export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const utils = api.useUtils();
  const { data, isLoading } = api.featureFlags.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  const toggleMutation = api.featureFlags.toggle.useMutation({
    // Optimistic update: snapshot the cache, patch the toggled flag,
    // roll back on error. `onSettled` refetches so server truth wins
    // even if the optimistic shape ever drifts from the API response.
    onMutate: async ({ key, enabled }) => {
      await utils.featureFlags.getAll.cancel();
      const previous = utils.featureFlags.getAll.getData();
      utils.featureFlags.getAll.setData(undefined, (old) =>
        old?.map((f) => (f.key === key ? { ...f, enabled } : f)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        utils.featureFlags.getAll.setData(undefined, ctx.previous);
      }
    },
    onSettled: () => {
      void utils.featureFlags.getAll.invalidate();
    },
  });

  // Build the flag map from defaults + server state. No third layer.
  const flags: Record<string, boolean> = {};
  for (const f of FEATURE_FLAGS) flags[f.key] = f.defaultEnabled;
  if (data) {
    for (const f of data) flags[f.key] = f.enabled;
  }

  const features: EnrichedFeatureFlag[] = FEATURE_FLAGS.map((def) => ({
    ...def,
    enabled: flags[def.key] ?? def.defaultEnabled,
  }));

  const toggle = useCallback(
    (key: string, enabled: boolean) => {
      toggleMutation.mutate({ key, enabled });
    },
    [toggleMutation],
  );

  return (
    <FeatureFlagsContext.Provider value={{ flags, features, isLoading, toggle }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

// What the server renders: the flags are fetched only in the browser, so
// server markup always uses the defaults with the flags still loading.
const DEFAULT_FLAGS: Record<string, boolean> = Object.fromEntries(
  FEATURE_FLAGS.map((f) => [f.key, f.defaultEnabled]),
);
const DEFAULT_FEATURES: EnrichedFeatureFlag[] = FEATURE_FLAGS.map((f) => ({ ...f, enabled: f.defaultEnabled }));

/**
 * The flags as the consuming component may render them. Until that component
 * has hydrated, this is the server view (defaults, loading): if the flags
 * landed before a page's Suspense boundary hydrated, branching on them during
 * hydration renders markup the server never sent and React throws #418.
 * One render later the component catches up with the loaded flags.
 */
export function useFeatureFlags(): FeatureFlagsContextValue {
  const ctx = useContext(FeatureFlagsContext);
  const hydrated = useHydrated();
  if (hydrated) return ctx;
  return { ...ctx, flags: DEFAULT_FLAGS, features: DEFAULT_FEATURES, isLoading: true };
}

export function useFeatureEnabled(key: string): boolean {
  const { flags } = useFeatureFlags();
  return flags[key] ?? true; // Default to enabled if key not found
}
