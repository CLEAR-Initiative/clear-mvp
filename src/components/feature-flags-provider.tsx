"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "~/trpc/react";
import { FEATURE_FLAGS, type FeatureFlagDefinition } from "~/lib/constants/feature-flags";

const LS_KEY = "clear_feature_flags";

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

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = api.featureFlags.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  // Local overrides stored in localStorage (persisted per browser/user)
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setLocalOverrides(JSON.parse(stored) as Record<string, boolean>);
    } catch {
      // ignore parse errors
    }
  }, []);

  // Build merged flags: defaults -> backend state -> local overrides
  const flags: Record<string, boolean> = {};
  for (const f of FEATURE_FLAGS) flags[f.key] = f.defaultEnabled;
  if (data) {
    for (const f of data) flags[f.key] = f.enabled;
  }
  for (const [key, val] of Object.entries(localOverrides)) {
    flags[key] = val;
  }

  const features: EnrichedFeatureFlag[] = FEATURE_FLAGS.map((def) => ({
    ...def,
    enabled: flags[def.key] ?? def.defaultEnabled,
  }));

  const toggle = useCallback((key: string, enabled: boolean) => {
    setLocalOverrides((prev) => {
      const next = { ...prev, [key]: enabled };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return (
    <FeatureFlagsContext.Provider value={{ flags, features, isLoading, toggle }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

export function useFeatureEnabled(key: string): boolean {
  const { flags } = useContext(FeatureFlagsContext);
  return flags[key] ?? true; // Default to enabled if key not found
}
