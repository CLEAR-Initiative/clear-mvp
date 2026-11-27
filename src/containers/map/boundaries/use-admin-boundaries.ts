import { useEffect, useMemo } from "react";
import { skipToken } from "@tanstack/react-query";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { reportHandledError } from "~/lib/report-handled-error";
import { api } from "~/trpc/react";
import type { MapPlace } from "../place/model";
import { toBoundaryFeatures } from "./features";
import { boundaryRequest, type BoundaryLevel, type BoundaryScope } from "./model";

export function useAdminBoundaries(
  level: BoundaryLevel,
  scope: BoundaryScope,
  place: MapPlace | null,
): FeatureCollection<Polygon | MultiPolygon> | undefined {
  const request = place ? boundaryRequest(level, scope, place) : null;
  const query = api.locations.getAdminBoundaries.useQuery(request ?? skipToken, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2-boundaries", stage: "fetch" });
  }, [query.error]);

  return useMemo(() => (query.data ? toBoundaryFeatures(query.data) : undefined), [query.data]);
}
