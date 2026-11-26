import { featureComponent, type StyleLayer } from "./feature-component";

export type MapSetting = "roads" | "labels";

const ROAD_COMPONENTS: ReadonlySet<string> = new Set(["road-network", "walking-cycling"]);

export function settingOf(layer: StyleLayer): MapSetting | undefined {
  const component = featureComponent(layer);
  if (component === undefined) return undefined;
  if (ROAD_COMPONENTS.has(component)) return "roads";
  if (layer.type === "symbol") return "labels";
  return undefined;
}

export function isRestyledRoad(layer: StyleLayer): boolean {
  return layer.type === "line" && featureComponent(layer) === "road-network";
}
