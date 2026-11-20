"use client";

import { useEffect, useMemo } from "react";
import { Layer, Source } from "react-map-gl/mapbox";
import { api } from "~/trpc/react";
import { useThemeColors } from "../../hooks/use-theme-color";
import type { LayerProps } from "../types";
import { SignalClusterMarker } from "./cluster-marker";
import { SEVERITY_TOKENS, SURFACE_TOKENS } from "./severity-tokens";
import { signalsToFeatures } from "./to-features";
import { SignalTooltip } from "./tooltip";
import { useSignalClusters } from "./use-signal-clusters";
import { useSignalTooltip } from "./use-signal-tooltip";
import { useSignalsWindow } from "./use-signals-window";

export function SignalsLayer({ id, beforeId, opacity, visible, onStatusChange }: LayerProps) {
  const range = useSignalsWindow();
  const query = api.signals.forMap.useQuery(
    { ...range, includeDummy: true },
    { placeholderData: (prev) => prev },
  );
  const severity = useThemeColors(SEVERITY_TOKENS);
  const surface = useThemeColors(SURFACE_TOKENS);
  const data = useMemo(() => signalsToFeatures(query.data ?? []), [query.data]);
  const { clusters, points } = useSignalClusters(data, visible);
  const pointIds = useMemo(() => new Set(points.features.map((feature) => feature.properties.id)), [points]);
  const hovered = useSignalTooltip(id, visible);

  const loading = visible && (query.isPending || query.isPlaceholderData);

  useEffect(() => {
    onStatusChange({ loading, error: query.isError });
  }, [loading, query.isError, onStatusChange]);

  return (
    <>
      <Source id={id} type="geojson" data={points}>
        <Layer
          id={id}
          type="circle"
          beforeId={beforeId}
          layout={{ visibility: visible ? "visible" : "none" }}
          paint={{
            "circle-color": [
              "match",
              ["get", "severity"],
              "critical", severity.critical,
              "high", severity.high,
              "medium", severity.medium,
              "low", severity.low,
              severity.unknown,
            ],
            "circle-radius": 5,
            "circle-stroke-width": 1,
            "circle-stroke-color": surface.stroke,
            "circle-opacity": opacity,
            "circle-stroke-opacity": opacity,
          }}
        />
      </Source>
      {visible &&
        clusters.map((cluster) => <SignalClusterMarker key={cluster.key} cluster={cluster} opacity={opacity} />)}
      {hovered && pointIds.has(hovered.id) && <SignalTooltip signal={hovered} />}
    </>
  );
}
