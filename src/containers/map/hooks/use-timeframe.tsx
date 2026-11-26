import { createParser, useQueryState } from "nuqs";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_TIMEFRAME,
  type Timeframe,
  clampTimeframe,
  parseTimeframe,
  serializeTimeframe,
  timeframeQuery,
  timelineExtent,
} from "../timeframe/model";

const timeframeParser = createParser({
  parse: parseTimeframe,
  serialize: serializeTimeframe,
  eq: (a, b) => serializeTimeframe(a) === serializeTimeframe(b),
}).withDefault(DEFAULT_TIMEFRAME);

export function useTimeframe(): readonly [Timeframe, (tf: Timeframe) => void] {
  const [extent] = useState(() => timelineExtent(new Date()));
  const [stored, setStored] = useQueryState("time", timeframeParser);
  const timeframe = useMemo(() => clampTimeframe(stored, extent), [stored, extent]);
  const setTimeframe = useCallback((tf: Timeframe) => void setStored(tf), [setStored]);
  return [timeframe, setTimeframe] as const;
}

type TimeframeQuery = { from: string; to?: string };

const TimeframeQueryContext = createContext<TimeframeQuery | null>(null);

export function TimeframeQueryProvider({ children }: { children: ReactNode }) {
  const outer = useContext(TimeframeQueryContext);
  const [timeframe] = useTimeframe();
  const key = serializeTimeframe(timeframe);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute the rolling start only when ?time changes
  const query = useMemo(() => timeframeQuery(timeframe, new Date()), [key]);
  if (outer) return children;
  return <TimeframeQueryContext.Provider value={query}>{children}</TimeframeQueryContext.Provider>;
}

export function useTimeframeQuery(): TimeframeQuery {
  const query = useContext(TimeframeQueryContext);
  if (!query) throw new Error("useTimeframeQuery must be used inside TimeframeQueryProvider");
  return query;
}
