import { useCallback, useState } from "react";
import type { LayerId } from "../layers/registry";

function sameIds(a: LayerId[], b: LayerId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function useLoadingLayerIds(): [LayerId[] | null, (layerIds: LayerId[]) => void] {
  const [layerIds, setLayerIds] = useState<LayerId[] | null>(null);
  const onLoadingChange = useCallback(
    (next: LayerId[]) => setLayerIds((prev) => (prev && sameIds(prev, next) ? prev : next)),
    [],
  );
  return [layerIds, onLoadingChange];
}
