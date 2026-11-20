import { parseAsBoolean, useQueryStates } from "nuqs";

const mapSettingsParsers = {
  roads: parseAsBoolean.withDefault(true),
  labels: parseAsBoolean.withDefault(true),
};

export function useMapSettings() {
  return useQueryStates(mapSettingsParsers);
}
