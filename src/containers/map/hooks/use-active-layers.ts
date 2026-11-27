import { createParser, useQueryState } from "nuqs";
import { useCallback } from "react";
import { z } from "zod";
import { isLayerId, type LayerId } from "../layers/registry";

export type LayerSettings = Record<string, unknown>;

export type ActiveLayer = { id: LayerId; visibility: boolean; opacity: number; settings?: LayerSettings };

const activeLayerSchema = z.object({
  id: z.string(),
  visibility: z.boolean(),
  opacity: z.number().min(0).max(1),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const DEFAULT_LAYERS: ActiveLayer[] = [{ id: "alerts", visibility: true, opacity: 1 }];

export function parseLayers(value: string): ActiveLayer[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(raw)) return null;

  const layers: ActiveLayer[] = [];
  for (const item of raw) {
    const parsed = activeLayerSchema.safeParse(item);
    if (parsed.success && isLayerId(parsed.data.id) && !layers.some((layer) => layer.id === parsed.data.id)) {
      layers.push({ ...parsed.data, id: parsed.data.id });
    }
  }
  return layers;
}

const layersParser = createParser({ parse: parseLayers, serialize: (layers: ActiveLayer[]) => JSON.stringify(layers) })
  .withDefault(DEFAULT_LAYERS);

export function useActiveLayers() {
  const [layers, setLayers] = useQueryState("layers", layersParser);

  const updateLayer = useCallback(
    (id: LayerId, patch: Partial<Omit<ActiveLayer, "id">>) =>
      setLayers((current) => current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer))),
    [setLayers],
  );

  return [layers, { setLayers, updateLayer }] as const;
}
