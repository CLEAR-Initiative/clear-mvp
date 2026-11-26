import { parseAsStringLiteral, useQueryState } from "nuqs";
import { BASEMAP_IDS, DEFAULT_BASEMAP } from "../constants";

const basemapParser = parseAsStringLiteral(BASEMAP_IDS).withDefault(DEFAULT_BASEMAP);

export function useBasemap() {
  return useQueryState("basemap", basemapParser);
}
