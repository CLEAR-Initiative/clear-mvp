export type StyleLayer = { id: string; type?: string; metadata?: unknown };

export function featureComponent(layer: StyleLayer): string | undefined {
  const metadata = layer.metadata as Record<string, unknown> | undefined;
  const value = metadata?.["mapbox:featureComponent"];
  return typeof value === "string" ? value : undefined;
}
