import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FitTo } from "~/containers/map";
import type { MapPlaceStatus } from "~/containers/map/hooks/use-map-place";
import { useMapView } from "~/containers/map/hooks/use-map-view";
import { placeLocationId, type MapPlace } from "~/containers/map/place/model";
import { WORLD_VIEW } from "~/lib/constants/country-config";
import { geometryBounds } from "~/lib/geo/country-mask";
import { reportHandledError } from "~/lib/report-handled-error";
import { api } from "~/trpc/react";

/** The camera request for the map place: on every place change, and on load when the URL has no view. */
export function usePlaceFit(status: MapPlaceStatus, place: MapPlace): FitTo | null {
  const searchParams = useSearchParams();
  const [urlHasView] = useState(() => searchParams.has("center") || searchParams.has("zoom"));
  const { setView } = useMapView();
  const utils = api.useUtils();
  const [fitTo, setFitTo] = useState<FitTo | null>(null);
  const previous = useRef<string | null | undefined>(undefined);
  const latest = useRef<string | null>(null);

  const placeId = status === "loading" ? undefined : placeLocationId(place);

  useEffect(() => {
    if (placeId === undefined) return;
    const first = previous.current === undefined;
    if (previous.current === placeId) return;
    previous.current = placeId;
    latest.current = placeId;
    if (first && (urlHasView || placeId === null)) return;

    if (placeId === null) {
      setFitTo(null);
      setView(WORLD_VIEW);
      return;
    }
    utils.locations.getById
      .fetch({ id: placeId })
      .then((location) => {
        if (latest.current !== placeId) return;
        const bounds = geometryBounds(location?.geometry as Parameters<typeof geometryBounds>[0]);
        if (bounds) setFitTo({ bounds, key: placeId });
      })
      .catch((error: unknown) => reportHandledError(error, { feature: "map-v2-place", stage: "fit" }));
  }, [placeId, urlHasView, setView, utils]);

  return fitTo;
}
