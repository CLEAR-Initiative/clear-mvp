import { useEffect, useMemo } from "react";
import { skipToken } from "@tanstack/react-query";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { reportHandledError } from "~/lib/report-handled-error";
import { api } from "~/trpc/react";
import { toBoundaryFeatures } from "./features";
import { boundaryRequest, type BoundaryLevel, type BoundaryScope } from "./model";

export function useAdminBoundaries(
  level: BoundaryLevel,
  scope: BoundaryScope,
): FeatureCollection<Polygon | MultiPolygon> | undefined {
  const request = boundaryRequest(level, scope);
  const query = api.locations.getAdminBoundaries.useQuery(request ?? skipToken, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2-boundaries", stage: "fetch" });
  }, [query.error]);

  return useMemo(() => (query.data ? toBoundaryFeatures(query.data) : undefined), [query.data]);
}
