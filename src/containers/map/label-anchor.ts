import { isLayerId } from "./layers/ids";

type StyleLayer = { id: string; type: string; source?: unknown };

function isOwnLayer(layer: StyleLayer): boolean {
  return typeof layer.source === "string" && isLayerId(layer.source);
}

export function findLabelAnchorId(layers: ReadonlyArray<StyleLayer> | undefined): string | undefined {
  return layers?.find((layer) => layer.type === "symbol" && !isOwnLayer(layer))?.id;
}
