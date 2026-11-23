import type { ActiveLayer } from "../hooks/use-active-layers";
import type { LayerId } from "../layers/registry";
import type { LayerStatus } from "../layers/types";

export function loadingLayerIds(
  activeLayers: ActiveLayer[],
  statuses: Readonly<Partial<Record<LayerId, LayerStatus>>>,
): LayerId[] {
  return activeLayers.filter((layer) => statuses[layer.id]?.loading ?? true).map((layer) => layer.id);
}
