import { createParser, useQueryStates } from "nuqs";
import { useCallback, useMemo } from "react";
import { parseCenter, serializeCenter } from "~/containers/map/hooks/use-map-view";
import { isDetectionKind, type DetectionKind, type LngLatPoint, type MapSelection } from "~/containers/map/selection";

type Kinded<T> = { kind: DetectionKind; value: T };

/** `<kind>:<rest>`, with `rest` read by `parseRest`; null when the kind is unknown or the rest is invalid. */
function parseKinded<T>(raw: string, parseRest: (rest: string) => T | null): Kinded<T> | null {
  const colon = raw.indexOf(":");
  if (colon < 0) return null;
  const kind = raw.slice(0, colon);
  const value = parseRest(raw.slice(colon + 1));
  return isDetectionKind(kind) && value !== null ? { kind, value } : null;
}

export function parseDetail(raw: string): Kinded<string> | null {
  return parseKinded(raw, (id) => (id ? id : null));
}

export function parseStack(raw: string): Kinded<LngLatPoint> | null {
  return parseKinded(raw, parseCenter);
}

const selectionParsers = {
  detail: createParser({ parse: parseDetail, serialize: ({ kind, value }) => `${kind}:${value}` }),
  stack: createParser({ parse: parseStack, serialize: ({ kind, value }) => `${kind}:${serializeCenter(value)}` }),
};

/**
 * What the Map panel shows, kept in the URL with its kind: `?detail=<kind>:<id>` opens a detection's detail,
 * `?stack=<kind>:<lng>,<lat>` lists a stack of them, and both together are a detection opened from that list
 * (a stack of another kind than the detail is ignored). The selection stays when its layer is hidden.
 * Changes replace the history entry, like the map view.
 */
export function usePanelSelection() {
  const [{ detail, stack }, setQuery] = useQueryStates(selectionParsers, { history: "replace" });

  const kind = detail?.kind ?? stack?.kind ?? null;
  const stackOfKind = stack && stack.kind === kind ? stack : null;
  // nuqs may hand back a new array for the same stack; key on its URL form so the map isn't told twice.
  const stackKey = stackOfKind ? serializeCenter(stackOfKind.value) : null;
  const stablePoint = useMemo<LngLatPoint | null>(() => (stackKey ? parseCenter(stackKey) : null), [stackKey]);
  const detailId = detail?.value ?? null;

  const mapSelection = useMemo<MapSelection | null>(() => {
    if (!kind) return null;
    if (stablePoint) return { type: "stack", kind, coordinates: stablePoint };
    if (detailId) return { type: "detection", kind, id: detailId };
    return null;
  }, [kind, stablePoint, detailId]);

  const selectDetail = useCallback(
    (detailKind: DetectionKind, id: string) => void setQuery({ detail: { kind: detailKind, value: id }, stack: null }),
    [setQuery],
  );
  const selectStack = useCallback(
    (stackKind: DetectionKind, point: LngLatPoint) =>
      void setQuery({ stack: { kind: stackKind, value: point }, detail: null }),
    [setQuery],
  );
  const stackKind = stackOfKind?.kind ?? null;
  const openStackDetail = useCallback(
    (id: string) => {
      if (stackKind) void setQuery({ detail: { kind: stackKind, value: id } });
    },
    [setQuery, stackKind],
  );
  const closeDetail = useCallback(() => void setQuery({ detail: null }), [setQuery]);
  const clear = useCallback(() => void setQuery(null), [setQuery]);

  return {
    kind,
    detailId,
    stack: stablePoint,
    stackKey,
    mapSelection,
    selectDetail,
    selectStack,
    openStackDetail,
    closeDetail,
    clear,
  };
}
