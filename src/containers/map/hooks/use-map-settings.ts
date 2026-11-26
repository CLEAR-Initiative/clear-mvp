import { parseAsBoolean, parseAsStringLiteral, useQueryStates } from "nuqs";

import { BOUNDARY_LEVELS, DEFAULT_BOUNDARY_LEVEL } from "../boundaries/model";

const mapSettingsParsers = {
  roads: parseAsBoolean.withDefault(true),
  labels: parseAsBoolean.withDefault(true),
  boundaries: parseAsStringLiteral(BOUNDARY_LEVELS).withDefault(DEFAULT_BOUNDARY_LEVEL),
};

export function useMapSettings() {
  return useQueryStates(mapSettingsParsers);
}
