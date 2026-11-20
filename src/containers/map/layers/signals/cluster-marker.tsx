"use client";

import { useTranslations } from "next-intl";
import { Marker, useMap } from "react-map-gl/mapbox";
import { ZOOM_RANGE } from "../../constants";
import { abbreviateCount, clusterSize, type ClusterMarker } from "./clusters";

export function SignalClusterMarker({ cluster, opacity }: { cluster: ClusterMarker; opacity: number }) {
  const t = useTranslations("mapV2.layers.signals.cluster");
  const { current: map } = useMap();
  const { outer, inner } = clusterSize(cluster.count);
  const [longitude, latitude] = cluster.coordinates;

  const onClick = () => {
    map?.flyTo({ center: cluster.coordinates, zoom: Math.min(cluster.expansionZoom, ZOOM_RANGE.max) });
  };

  return (
    <Marker longitude={longitude} latitude={latitude}>
      <button
        type="button"
        className="map-v2-cluster"
        aria-label={t(cluster.stacked ? "stacked" : "zoom", { count: cluster.count })}
        aria-disabled={cluster.stacked || undefined}
        onClick={cluster.stacked ? undefined : onClick}
        style={{ width: outer, height: outer, opacity }}
      >
        <span className="map-v2-cluster-count" style={{ width: inner, height: inner }}>
          {abbreviateCount(cluster.count)}
        </span>
      </button>
    </Marker>
  );
}
