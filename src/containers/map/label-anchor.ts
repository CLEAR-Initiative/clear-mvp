export function findLabelAnchorId(layers: ReadonlyArray<{ id: string; type: string }> | undefined): string | undefined {
  return layers?.find((layer) => layer.type === "symbol")?.id;
}
