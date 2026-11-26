import { api } from "~/trpc/react";
import { useTimeframeQuery } from "./use-timeframe";

export function useSignalsForMap() {
  const range = useTimeframeQuery();
  return api.signals.forMap.useQuery({ ...range, includeDummy: true }, { placeholderData: (prev) => prev });
}
