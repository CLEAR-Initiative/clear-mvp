type StyleLayer = { id: string; metadata?: unknown };

const BASE_COMPONENT = "land-and-water";

function featureComponent(layer: StyleLayer): string | undefined {
  const metadata = layer.metadata as Record<string, unknown> | undefined;
  const value = metadata?.["mapbox:featureComponent"];
  return typeof value === "string" ? value : undefined;
}

export function findReliefAnchorId(layers: ReadonlyArray<StyleLayer> | undefined): string | undefined {
  return layers?.find((layer) => {
    const component = featureComponent(layer);
    return component !== undefined && component !== BASE_COMPONENT;
  })?.id;
}
