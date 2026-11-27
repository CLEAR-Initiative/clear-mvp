import { useCallback, useEffect, useMemo } from "react";
import { parseAsString, useQueryStates } from "nuqs";
import type { HierarchyLevel1 } from "~/components/disaster-type-picker";
import { reportHandledError } from "~/lib/report-handled-error";
import { api } from "~/trpc/react";
import { filterEventTypes, NO_FILTERS, resolveMapFilters, type MapFilters } from "../filters/model";

export type MapFiltersStatus = "loading" | "ready" | "error";

const EMPTY_HIERARCHY: HierarchyLevel1[] = [];

const filterParams = { category: parseAsString, crisisType: parseAsString };

export function useMapFilters() {
  const [params, setParams] = useQueryStates(filterParams, { history: "replace" });
  const hierarchyQuery = api.alerts.getDisasterTypeHierarchy.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const hierarchy = hierarchyQuery.data ?? EMPTY_HIERARCHY;

  const status: MapFiltersStatus = hierarchyQuery.isError ? "error" : hierarchyQuery.isPending ? "loading" : "ready";

  const raw = useMemo<MapFilters>(
    () => ({ category: params.category, crisisType: params.crisisType }),
    [params.category, params.crisisType],
  );
  const resolved = useMemo(
    () => (status === "ready" ? resolveMapFilters(raw, hierarchy) : null),
    [status, raw, hierarchy],
  );

  const filters: MapFilters = resolved ? resolved.filters : status === "error" ? NO_FILTERS : raw;
  const eventTypes = useMemo(
    () => (resolved ? filterEventTypes(resolved.filters, hierarchy) : undefined),
    [resolved, hierarchy],
  );
  const held = status === "loading" && (raw.category !== null || raw.crisisType !== null);

  const changed = resolved?.changed ?? false;
  const resolvedFilters = resolved?.filters;
  useEffect(() => {
    if (changed && resolvedFilters) void setParams(resolvedFilters);
  }, [changed, resolvedFilters, setParams]);

  useEffect(() => {
    if (hierarchyQuery.error) {
      reportHandledError(hierarchyQuery.error, { feature: "map-v2-filters", stage: "hierarchy" });
    }
  }, [hierarchyQuery.error]);

  const setCategory = useCallback(
    (name: string | null) => {
      const keepType =
        name !== null &&
        filters.crisisType !== null &&
        (hierarchy.find((l1) => l1.name === name)?.groups.some((g) => g.name === filters.crisisType) ?? false);
      void setParams({ category: name, crisisType: keepType ? filters.crisisType : null });
    },
    [filters.crisisType, hierarchy, setParams],
  );

  const setCrisisType = useCallback(
    (name: string | null) => {
      if (name === null) {
        void setParams({ crisisType: null });
        return;
      }
      const category = hierarchy.find((l1) => l1.groups.some((g) => g.name === name))?.name ?? null;
      void setParams({ category, crisisType: name });
    },
    [hierarchy, setParams],
  );

  return { status, hierarchy, filters, eventTypes, held, setCategory, setCrisisType };
}
