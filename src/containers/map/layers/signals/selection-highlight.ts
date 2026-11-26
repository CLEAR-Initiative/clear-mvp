import type { MapSelection } from "../../selection";
import { clusterLeafIds, isSamePoint, type ClusterMarker, type SignalIndex } from "./clusters";
import type { SignalFeatureCollection } from "./to-features";

export type SelectionHighlight = {
  /** The selected signal when it is drawn as its own point. */
  pointId: string | null;
  /** The cluster that holds the selection at the current zoom. */
  clusterKey: string | null;
};

const NONE: SelectionHighlight = { pointId: null, clusterKey: null };

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
    if (!data.features.some((f) => f.properties.id === selection.id)) return NONE;
    if (pointIds.has(selection.id)) return { pointId: selection.id, clusterKey: null };
    return { pointId: null, clusterKey: clusterHolding(new Set([selection.id]), clusters, index) };
  }

  const ids = data.features
    .filter((f) => isSamePoint(f.geometry.coordinates, selection.coordinates))
    .map((f) => f.properties.id);
  if (ids.length === 0) return NONE;
  const stacked = clusters.find((c) => c.stacked && isSamePoint(c.coordinates, selection.coordinates));
  if (stacked) return { pointId: null, clusterKey: stacked.key };
  const visible = ids.find((id) => pointIds.has(id));
  if (visible) return { pointId: visible, clusterKey: null };
  return { pointId: null, clusterKey: clusterHolding(new Set(ids), clusters, index) };
}
