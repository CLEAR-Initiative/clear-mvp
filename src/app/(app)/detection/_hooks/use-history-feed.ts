"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "~/trpc/react";
import type { GqlAlert, GqlEvent, GqlSignal } from "~/lib/types/graphql";
import type { HistorySortOrder, HistoryTabProps } from "../_components/history-tab";
import {
  ALERT_ORDER_MAP,
  DETECTION_PAGE_SIZE,
  EVENT_ORDER_MAP,
  SIGNAL_ORDER_MAP,
} from "../_lib/feed-order";

// History fires alerts, events and signals pages in parallel and waits on all
// three, so each page stays the same size as the single-feed tabs.
const HISTORY_PAGE_SIZE = DETECTION_PAGE_SIZE;

/** The scope every Detection feed queries: what `useDetectionFilters` returns as `filter`. */
export interface DetectionFeedFilter {
  teamId?: string | null;
  locationId?: string;
  from: string;
  to: string;
  severityMin?: number;
  severityMax?: number;
  eventTypes?: string[];
}

export interface HistoryFeedOptions {
  /** Fire the queries. Detection passes "the History tab is open and locations are ready". */
  enabled: boolean;
  /**
   * Resets paging when it changes, on top of the filter's own fields. `to` is
   * deliberately not one of those: on Detection it follows the snapshot time,
   * which moves after every filter change and on another feed's refresh.
   * Pass `useDetectionFilters().filterKey` so a new date choice resets paging.
   */
  resetKey?: string;
}

/**
 * The History list's data: alerts, events and signals paged in parallel under
 * one filter, accumulated page by page, with the list's own sort and source
 * filter. Returns exactly the props `HistoryTab` takes.
 */
export function useHistoryFeed(filter: DetectionFeedFilter, { enabled, resetKey }: HistoryFeedOptions): HistoryTabProps {
  const [sortOrder, setSortOrder] = useState<HistorySortOrder>("newest");
  // History's source filter lives here (not in HistoryTab) so it can narrow
  // the paginated signals query server-side — otherwise a source with no
  // rows on the first page could never be filtered to. null = all sources.
  const [sources, setSources] = useState<Set<string> | null>(null);

  // Accumulation - same pattern as the single feeds, HISTORY_PAGE_SIZE per source.
  const [alertsItems, setAlertsItems] = useState<GqlAlert[]>([]);
  const [eventsItems, setEventsItems] = useState<GqlEvent[]>([]);
  const [signalsItems, setSignalsItems] = useState<GqlSignal[]>([]);
  const [offset, setOffset] = useState(0);
  const [alertsTotalCount, setAlertsTotalCount] = useState(0);
  const [eventsTotalCount, setEventsTotalCount] = useState(0);
  const [signalsTotalCount, setSignalsTotalCount] = useState(0);
  const [alertsHasMore, setAlertsHasMore] = useState(false);
  const [eventsHasMore, setEventsHasMore] = useState(false);
  const [signalsHasMore, setSignalsHasMore] = useState(false);
  const appending = useRef(false);
  // Incremented on every reset so the React Query cache key always changes,
  // guaranteeing the accumulation effects fire even when offset stays 0.
  const [version, setVersion] = useState(0);

  const { teamId, locationId, from, to, severityMin, severityMax, eventTypes } = filter;
  const sharedFilter = { teamId, locationId, from, to, severityMin, severityMax, eventTypes };

  // ── Paginated per source, all three sources accumulated ────────────────────
  const alertsQuery = api.alerts.alertsPage.useQuery(
    { ...sharedFilter, orderBy: ALERT_ORDER_MAP[sortOrder], limit: HISTORY_PAGE_SIZE, offset, _v: version },
    { enabled, staleTime: Infinity },
  );
  const eventsQuery = api.alerts.eventsPage.useQuery(
    { ...sharedFilter, orderBy: EVENT_ORDER_MAP[sortOrder], limit: HISTORY_PAGE_SIZE, offset, _v: version },
    { enabled, staleTime: Infinity },
  );
  const signalsQuery = api.signals.signalsPage.useQuery(
    { teamId, locationId, from, to, severityMin, severityMax, sourceNames: sources ? [...sources] : undefined, orderBy: SIGNAL_ORDER_MAP[sortOrder], limit: HISTORY_PAGE_SIZE, offset, _v: version },
    { enabled, staleTime: Infinity },
  );
  const sourceNamesQuery = api.signals.pushFeedSourceNames.useQuery(undefined, {
    enabled,
    staleTime: Infinity,
  });

  // ── Accumulation effects ───────────────────────────────────────────────────
  useEffect(() => {
    if (!alertsQuery.data) return;
    const { items, totalCount, hasMore } = alertsQuery.data;
    setAlertsTotalCount(totalCount);
    setAlertsHasMore(hasMore);
    if (appending.current) {
      setAlertsItems((prev) => [...prev, ...items]);
    } else {
      setAlertsItems(items);
    }
  }, [alertsQuery.data]);

  useEffect(() => {
    if (!eventsQuery.data) return;
    const { items, totalCount, hasMore } = eventsQuery.data;
    setEventsTotalCount(totalCount);
    setEventsHasMore(hasMore);
    if (appending.current) {
      setEventsItems((prev) => [...prev, ...items]);
    } else {
      setEventsItems(items);
    }
  }, [eventsQuery.data]);

  useEffect(() => {
    if (!signalsQuery.data) return;
    const { items, totalCount, hasMore } = signalsQuery.data;
    setSignalsTotalCount(totalCount);
    setSignalsHasMore(hasMore);
    if (appending.current) {
      setSignalsItems((prev) => [...prev, ...items]);
      appending.current = false;
    } else {
      setSignalsItems(items);
    }
  }, [signalsQuery.data]);

  // Reset on filter change
  const filterResetKey = JSON.stringify([teamId, locationId, from, severityMin, severityMax, eventTypes?.join(","), resetKey]);
  useEffect(() => {
    appending.current = false;
    setOffset(0);
    setAlertsItems([]);
    setEventsItems([]);
    setSignalsItems([]);
    setVersion((v) => v + 1);
  }, [filterResetKey]);

  // Reset on sort or source-filter change
  useEffect(() => {
    appending.current = false;
    setOffset(0);
    setAlertsItems([]);
    setEventsItems([]);
    setSignalsItems([]);
    setVersion((v) => v + 1);
  }, [sortOrder, sources]);

  const hasMore = alertsHasMore || eventsHasMore || signalsHasMore;
  const totalCount = alertsTotalCount + eventsTotalCount + signalsTotalCount;
  const isFetching = alertsQuery.isFetching || eventsQuery.isFetching || signalsQuery.isFetching;

  // Every page is its own React Query cache key (offset is part of it), so
  // `isLoading` flips to true again for each lazy-loaded page. Only the first
  // page should drive the list skeleton; otherwise a client-side search that
  // keeps the sentinel in view makes the whole list blink on every page.
  const initialLoading =
    (alertsQuery.isLoading || eventsQuery.isLoading || signalsQuery.isLoading) && offset === 0;

  const onLoadMore = useCallback(() => {
    if (!hasMore || isFetching) return;
    appending.current = true;
    setOffset((prev) => prev + HISTORY_PAGE_SIZE);
  }, [hasMore, isFetching]);

  return {
    alerts: alertsItems,
    events: eventsItems,
    signals: signalsItems,
    loading: initialLoading,
    hasMore,
    isFetchingMore: isFetching && appending.current,
    totalCount,
    onLoadMore,
    sortOrder,
    onSortChange: setSortOrder,
    activeSources: sources,
    onActiveSourcesChange: setSources,
    sourceOptions: sourceNamesQuery.data,
  };
}
