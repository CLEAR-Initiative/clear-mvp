"use client";

import { useMemo, useRef } from "react";
import { api } from "~/trpc/react";
import type { FeedTab } from "../_lib/detection-model";

/** The scope a count query runs with (the feed filter, minus paging). */
export interface CountScope {
  teamId?: string | null;
  locationId?: string;
  locationIds?: string[];
  from?: string;
  to?: string;
  severityMin?: number;
  severityMax?: number;
  eventTypes?: string[];
  sourceNames?: string[];
}

export interface CountVariant {
  key: string;
  scope: CountScope;
}

/** Severity range per level, as the feeds send it (low covers 1 and 2). */
export const SEV_RANGE: Record<string, { severityMin: number; severityMax: number }> = {
  critical: { severityMin: 5, severityMax: 5 },
  high: { severityMin: 4, severityMax: 4 },
  medium: { severityMin: 3, severityMax: 3 },
  low: { severityMin: 1, severityMax: 2 },
};

/**
 * `totalCount` for each variant, from `limit: 1` page queries on the tab's
 * feed (batched into one request by the tRPC link). A key is missing while
 * its query loads. Signals have no event types; events and alerts have no
 * server-side source filter.
 */
export function useFacetCounts(tab: FeedTab, variants: CountVariant[], enabled: boolean): Map<string, number> {
  const opts = (on: boolean) => ({ enabled: enabled && on, staleTime: 60_000, refetchOnWindowFocus: false });
  const events = api.useQueries((t) =>
    variants.map((v) => {
      const { sourceNames: _s, ...scope } = v.scope;
      return t.alerts.eventsPage({ ...scope, limit: 1 }, opts(tab === "events"));
    }),
  );
  const alerts = api.useQueries((t) =>
    variants.map((v) => {
      const { sourceNames: _s, ...scope } = v.scope;
      return t.alerts.alertsPage({ ...scope, status: "published", limit: 1 }, opts(tab === "alerts"));
    }),
  );
  const signals = api.useQueries((t) =>
    variants.map((v) => {
      const { eventTypes: _e, ...scope } = v.scope;
      return t.signals.signalsPage({ ...scope, limit: 1 }, opts(tab === "signals"));
    }),
  );
  const results = tab === "signals" ? signals : tab === "alerts" ? alerts : events;
  const totals = results.map((r) => r.data?.totalCount);
  const key = totals.join(",");
  // While a key's count reloads for a new scope (every filter change moves the
  // window), keep its last count, so lists sorted by count don't reshuffle.
  const last = useRef({ tab, counts: new Map<string, number>() });
  if (last.current.tab !== tab) last.current = { tab, counts: new Map() };
  return useMemo(() => {
    const out = new Map<string, number>();
    variants.forEach((v, i) => {
      const n = totals[i] ?? last.current.counts.get(v.key);
      if (n == null) return;
      out.set(v.key, n);
      last.current.counts.set(v.key, n);
    });
    return out;
    // `key` captures every total; variants change with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, variants, tab]);
}
