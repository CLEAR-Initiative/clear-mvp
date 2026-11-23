import { isSamePoint, type LngLatPoint, type MapSelection } from "../../selection";
import { clusterLeafIds, type ClusterMarker, type SignalIndex } from "./clusters";
import type { SignalFeatureCollection } from "./to-features";

export type SelectionHighlight = {
  /** The selected signal when it is drawn as its own point. */
  pointId: string | null;
  /** The cluster that holds the selection at the current zoom. */
  clusterKey: string | null;
  /** Where the selection is, for the off-screen indicator. */
  coordinates: LngLatPoint | null;
};

const NONE: SelectionHighlight = { pointId: null, clusterKey: null, coordinates: null };

type Input = {
  selection: MapSelection | null;
  data: SignalFeatureCollection;
  pointIds: ReadonlySet<string>;
  clusters: ClusterMarker[];
  index: SignalIndex;
};

function clusterHolding(ids: ReadonlySet<string>, clusters: ClusterMarker[], index: SignalIndex): string | null {
  for (const cluster of clusters) {
    if (clusterLeafIds(index, cluster.clusterId).some((id) => ids.has(id))) return cluster.key;
  }
  return null;
}

/** Where to draw the selection ring: on the signal's own point, or on the cluster that holds it. */
export function selectionHighlight({ selection, data, pointIds, clusters, index }: Input): SelectionHighlight {
  if (!selection) return NONE;

  if (selection.type === "signal") {
    const feature = data.features.find((f) => f.properties.id === selection.id);
    if (!feature) return NONE;
    const coordinates = feature.geometry.coordinates;
    if (pointIds.has(selection.id)) return { pointId: selection.id, clusterKey: null, coordinates };
    return { pointId: null, clusterKey: clusterHolding(new Set([selection.id]), clusters, index), coordinates };
  }

  const ids = data.features
    .filter((f) => isSamePoint(f.geometry.coordinates, selection.coordinates))
    .map((f) => f.properties.id);
  if (ids.length === 0) return NONE;
  const coordinates = selection.coordinates;
  const stacked = clusters.find((c) => c.stacked && isSamePoint(c.coordinates, coordinates));
  if (stacked) return { pointId: null, clusterKey: stacked.key, coordinates };
  const visible = ids.find((id) => pointIds.has(id));
  if (visible) return { pointId: visible, clusterKey: null, coordinates };
  return { pointId: null, clusterKey: clusterHolding(new Set(ids), clusters, index), coordinates };
}
