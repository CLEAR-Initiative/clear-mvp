import { featureComponent, type StyleLayer } from "./feature-component";

const BASE_COMPONENT = "land-and-water";

export function findReliefAnchorId(layers: ReadonlyArray<StyleLayer> | undefined): string | undefined {
  return layers?.find((layer) => {
    const component = featureComponent(layer);
    return component !== undefined && component !== BASE_COMPONENT;
  })?.id;
}
