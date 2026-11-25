import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { isPaintableBoundaryGeometry } from "~/lib/geo/country-mask";

type BoundaryFeature = Feature<Polygon | MultiPolygon>;

export function toBoundaryFeatures(
  locations: ReadonlyArray<{ id: string; geometry: unknown }>,
): FeatureCollection<Polygon | MultiPolygon> {
  const features: BoundaryFeature[] = [];
  for (const location of locations) {
    const geometry = location.geometry as Polygon | MultiPolygon | null;
    if (!geometry || !isPaintableBoundaryGeometry(geometry)) continue;
    features.push({ type: "Feature", id: location.id, geometry, properties: {} });
  }
  return { type: "FeatureCollection", features };
}
