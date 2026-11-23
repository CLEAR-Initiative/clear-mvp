"use client";

import { UnstyledButton } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import type { Map as MapboxMap } from "mapbox-gl";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/mapbox";
import type { LngLatPoint } from "../selection";
import {
  angularDistance,
  initialBearing,
  placementForBearing,
  placementForPoint,
  type IndicatorPlacement,
  type ViewArea,
} from "./placement";

/** Beyond a quarter of the globe a point is on its far side, where projecting it means nothing. */
const FAR_SIDE_DEG = 90;

function placementFor(map: MapboxMap, target: LngLatPoint): IndicatorPlacement | null {
  const container = map.getContainer();
  const { top = 0, right = 0, bottom = 0, left = 0 } = map.getPadding();
  const view: ViewArea = {
    width: container.clientWidth,
    height: container.clientHeight,
    padding: { top, right, bottom, left },
  };
  const center = map.getCenter().toArray() as LngLatPoint;
  if (angularDistance(center, target) > FAR_SIDE_DEG) {
    return placementForBearing(view, initialBearing(center, target) - map.getBearing());
  }
  return placementForPoint(view, map.project(target));
}

/** An arrow on the edge of the visible map pointing at the selection while it is out of view. */
export function SelectionIndicator({ coordinates }: { coordinates: LngLatPoint }) {
  const t = useTranslations("mapV2.selection");
  const { current: mapRef } = useMap();
  const [placement, setPlacement] = useState<IndicatorPlacement | null>(null);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setPlacement(placementFor(map, coordinates));
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    map.on("move", schedule);
    map.on("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      map.off("move", schedule);
      map.off("resize", schedule);
    };
  }, [mapRef, coordinates]);

  if (!placement) return null;

  return (
    <UnstyledButton
      className="map-v2-selection-indicator"
      aria-label={t("showOnMap")}
      title={t("showOnMap")}
      style={{ left: placement.x, top: placement.y }}
      onClick={() => mapRef?.flyTo({ center: coordinates })}
    >
      <IconArrowUp size={16} stroke={1.6} style={{ transform: `rotate(${placement.angle}deg)` }} aria-hidden />
    </UnstyledButton>
  );
}
