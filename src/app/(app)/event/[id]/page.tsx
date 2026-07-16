"use client";

import { use, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { EventDetailContent } from "~/components/event-detail/event-detail-content";
import { useEventNavigation, getEventMapCenter } from "~/hooks/use-event-navigation";
import { deriveEntityPending, useEntityNavigation } from "~/hooks/use-entity-navigation";

export default function EventDetailPage({
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
    },
    [utils],
  );

  const { activeId, navigateTo } = useEntityNavigation({
    paramsId,
    routePrefix: "/event",
    searchParams,
  });

  const navigation = useEventNavigation(activeId);

  useEffect(() => {
    for (const id of [navigation.prevId, navigation.nextId]) {
      if (!id || prefetchedRef.current.has(id)) continue;
      prefetchedRef.current.add(id);
      prefetchDetail(id);
    }
  }, [navigation.prevId, navigation.nextId, prefetchDetail]);

  const eventQuery = api.events.get.useQuery(
    { id: activeId },
    {
      enabled: !!activeId,
      placeholderData: keepPreviousData,
    },
  );

  const isPending = deriveEntityPending(activeId, eventQuery.data);

  const relatedQuery = api.events.related.useQuery(
    { id: activeId, teamId: activeTeamId },
    { enabled: !!activeId && !!activeTeamId && !isPending },
  );

  const navigationMapCenter = useMemo(() => {
    const item = navigation.listItems.find((e) => e.id === activeId);
    return item ? getEventMapCenter(item) ?? undefined : undefined;
  }, [activeId, navigation.listItems]);

  const navigatePrev = () => {
    if (navigation.prevId) navigateTo(navigation.prevId);
  };

  const navigateNext = () => {
    if (navigation.nextId) navigateTo(navigation.nextId);
  };

  return (
    <EventDetailContent
      event={eventQuery.data}
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
