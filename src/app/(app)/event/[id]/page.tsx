"use client";

import { normaliseEventFrom } from "~/lib/analytics/event-source";
import { useTrackEventOpened } from "~/lib/analytics/use-once-per-view";
import { Suspense, use, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { EventDetailContent } from "~/components/event-detail/event-detail-content";
import { useEventNavigation, getEventMapCenter } from "~/hooks/use-event-navigation";
import { deriveEntityPending, useEntityNavigation } from "~/hooks/use-entity-navigation";
import { useDetailKeyboardScrub } from "~/hooks/use-detail-keyboard-scrub";
import { getListNavigation } from "~/lib/detail-list-nav";

function EventDetailPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const paramsId = use(params).id;
  const searchParams = useSearchParams();
  const { activeTeamId } = useTeam();
  const utils = api.useUtils();
  const prefetchedRef = useRef(new Set<string>());

  // Track where user came from (map or detection)
  const referrer = searchParams.get("from") ?? "detection";

  const prefetchDetail = useCallback(
    (id: string) => {
      void utils.events.get.prefetch({ id });
      void utils.comments.list.prefetch({ entityId: id, entityType: "event" });
    },
    [utils],
  );

  const { activeId, navigateTo } = useEntityNavigation({
    paramsId,
    routePrefix: "/event",
    searchParams,
  });
  useTrackEventOpened(activeId, normaliseEventFrom(searchParams.get("from")));

  // List from committed id; chrome follows scrubId (GH #148 settle-to-commit).
  const listSource = referrer === "map" ? "map" : "detection";
  const listNav = useEventNavigation(activeId, { listSource });
  const orderedIds = listNav.orderedIds;
  const { scrubId } = useDetailKeyboardScrub({
    ids: orderedIds,
    committedId: activeId,
    onCommit: navigateTo,
  });
  const navigation = useMemo(() => {
    const step = getListNavigation(orderedIds, scrubId);
    return {
      ...step,
      isLoading: listNav.isLoading,
      listItems: listNav.listItems,
    };
  }, [orderedIds, scrubId, listNav.isLoading, listNav.listItems]);

  // Race comments.list with events.get so empty threads resolve without a second waterfall.
  useEffect(() => {
    if (!activeId) return;
    void utils.comments.list.prefetch({ entityId: activeId, entityType: "event" });
  }, [activeId, utils]);

  // Own request rather than the shared batch: a batch resolves only when its
  // slowest procedure does, and the first one also carries the nav list,
  // locations tree and team lookups.
  const eventQuery = api.events.get.useQuery(
    { id: activeId },
    {
      enabled: !!activeId,
      placeholderData: keepPreviousData,
      trpc: { context: { skipBatch: true } },
    },
  );
  const eventLoaded = eventQuery.data?.id === activeId;

  // Prefetch ±1 around the *committed* id only — never the scrub cursor.
  // Scrubbing 4→60 would otherwise fire a trail of get/comments prefetches
  // and starve the settled destination (GH #148). Waits for the current event
  // so the prefetches never compete with it.
  const committedNeighbors = useMemo(
    () => getListNavigation(orderedIds, activeId),
    [orderedIds, activeId],
  );
  useEffect(() => {
    if (!eventLoaded) return;
    for (const id of [committedNeighbors.prevId, committedNeighbors.nextId]) {
      if (!id || prefetchedRef.current.has(id)) continue;
      prefetchedRef.current.add(id);
      prefetchDetail(id);
    }
  }, [eventLoaded, committedNeighbors.prevId, committedNeighbors.nextId, prefetchDetail]);

  const isPending = deriveEntityPending(activeId, eventQuery.data);

  const relatedQuery = api.events.related.useQuery(
    { id: activeId, teamId: activeTeamId },
    { enabled: !!activeId && !!activeTeamId && !isPending },
  );

  // Fly the minimap as soon as the id changes. The nav list is usually not
  // fetched (stored Detection ids win), so fall back to the prefetched event.
  const navigationMapCenter = useMemo(() => {
    const item =
      navigation.listItems.find((e) => e.id === activeId) ??
      utils.events.get.getData({ id: activeId });
    return item ? getEventMapCenter(item) ?? undefined : undefined;
  }, [activeId, navigation.listItems, utils]);

  const navigatePrev = useCallback(() => {
    if (navigation.prevId) navigateTo(navigation.prevId);
  }, [navigation.prevId, navigateTo]);

  const navigateNext = useCallback(() => {
    if (navigation.nextId) navigateTo(navigation.nextId);
  }, [navigation.nextId, navigateTo]);

  return (
    <EventDetailContent
      event={eventQuery.data}
      entityId={activeId}
      loading={eventQuery.isLoading}
      isPending={isPending}
      mode="page"
      relatedEvents={isPending ? [] : (relatedQuery.data ?? [])}
      relatedLoading={isPending || relatedQuery.isLoading}
      navigation={navigation}
      onNavigatePrev={navigatePrev}
      onNavigateNext={navigateNext}
      navigationMapCenter={navigationMapCenter}
      referrer={referrer}
    />
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <EventDetailPageContent params={params} />
    </Suspense>
  );
}
