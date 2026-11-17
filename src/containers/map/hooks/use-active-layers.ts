import { createParser, useQueryState } from "nuqs";
import { z } from "zod";
import { isLayerId, type LayerId } from "../layers/ids";

export type ActiveLayer = { id: LayerId; visibility: boolean; opacity: number };

const activeLayerSchema = z.object({
  id: z.string(),
  visibility: z.boolean(),
  opacity: z.number().min(0).max(1),
});

export const DEFAULT_LAYERS: ActiveLayer[] = [{ id: "signals", visibility: true, opacity: 1 }];

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
  return useQueryState("layers", layersParser);
}
