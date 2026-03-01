"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "~/trpc/react";

interface FeatureFlagsContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  toggle: (key: string, enabled: boolean) => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: {},
  isLoading: true,
  toggle: () => {},
});

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const utils = api.useUtils();

  const { data, isLoading } = api.featureFlags.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  const toggleMutation = api.featureFlags.toggle.useMutation({
    onMutate: async ({ key, enabled }) => {
      // Optimistic update
      await utils.featureFlags.getAll.cancel();
      const prev = utils.featureFlags.getAll.getData();
      if (prev) {
        utils.featureFlags.getAll.setData(undefined,
          prev.map((f) => (f.key === key ? { ...f, enabled } : f)),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.featureFlags.getAll.setData(undefined, context.prev);
      }
    },
    onSettled: () => {
      void utils.featureFlags.getAll.invalidate();
    },
  });

  const flags: Record<string, boolean> = {};
  if (data) {
    for (const f of data) {
      flags[f.key] = f.enabled;
    }
  }

  const toggle = useCallback(
    (key: string, enabled: boolean) => {
      toggleMutation.mutate({ key, enabled });
    },
    [toggleMutation],
  );

  return (
    <FeatureFlagsContext.Provider value={{ flags, isLoading, toggle }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

export function useFeatureEnabled(key: string): boolean {
  const { flags } = useContext(FeatureFlagsContext);
  return flags[key] ?? true; // Default to enabled if not loaded yet
}
