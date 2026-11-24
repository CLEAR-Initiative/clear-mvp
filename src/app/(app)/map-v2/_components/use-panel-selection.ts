import { createParser, parseAsString, useQueryStates } from "nuqs";
import { useCallback, useMemo } from "react";
import { parseCenter, serializeCenter } from "~/containers/map/hooks/use-map-view";
import type { LngLatPoint, MapSelection } from "~/containers/map/selection";

const selectionParsers = {
  signal: parseAsString,
  stack: createParser({ parse: parseCenter, serialize: serializeCenter }),
};

/**
 * What the Map panel shows, kept in the URL: `?signal=<id>` opens a signal's detail, `?stack=<lng>,<lat>`
 * lists a stack of signals, and both together are a signal opened from that list. Changes replace the
 * history entry, like the map view.
 */
export function usePanelSelection() {
  const [{ signal, stack }, setQuery] = useQueryStates(selectionParsers, { history: "replace" });

  // nuqs may hand back a new array for the same stack; key on its URL form so the map isn't told twice.
  const stackKey = stack ? serializeCenter(stack) : null;
  const stablePoint = useMemo<LngLatPoint | null>(() => (stackKey ? parseCenter(stackKey) : null), [stackKey]);

  const mapSelection = useMemo<MapSelection | null>(() => {
    if (stablePoint) return { type: "signal-stack", coordinates: stablePoint };
    if (signal) return { type: "signal", id: signal };
    return null;
  }, [stablePoint, signal]);

  const selectSignal = useCallback((id: string) => void setQuery({ signal: id, stack: null }), [setQuery]);
  const selectStack = useCallback((point: LngLatPoint) => void setQuery({ stack: point, signal: null }), [setQuery]);
  const openStackSignal = useCallback((id: string) => void setQuery({ signal: id }), [setQuery]);
  const closeSignal = useCallback(() => void setQuery({ signal: null }), [setQuery]);
  const clear = useCallback(() => void setQuery(null), [setQuery]);

  return {
    signalId: signal,
    stack: stablePoint,
    stackKey,
    mapSelection,
    selectSignal,
    selectStack,
    openStackSignal,
    closeSignal,
    clear,
  };
}
