"use client";

import { use, useCallback, useEffect, useMemo, useRef } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { SignalDetailContent } from "~/components/signal-detail/signal-detail-content";
import { useSignalNavigation, getSignalMapCenter } from "~/hooks/use-event-navigation";
import { deriveEntityPending, useEntityNavigation } from "~/hooks/use-entity-navigation";

export default function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const paramsId = use(params).id;
  const utils = api.useUtils();
  const prefetchedRef = useRef(new Set<string>());

  const prefetchDetail = useCallback(
    (id: string) => {
      void utils.signals.get.prefetch({ id });
    },
    [utils],
  );

  const { activeId, navigateTo } = useEntityNavigation({
    paramsId,
    routePrefix: "/signal",
  });

  const navigation = useSignalNavigation(activeId);

  useEffect(() => {
    for (const id of [navigation.prevId, navigation.nextId]) {
      if (!id || prefetchedRef.current.has(id)) continue;
      prefetchedRef.current.add(id);
      prefetchDetail(id);
    }
  }, [navigation.prevId, navigation.nextId, prefetchDetail]);

  const signalQuery = api.signals.get.useQuery(
    { id: activeId },
    {
      enabled: !!activeId,
      staleTime: Infinity,
      retry: false,
      placeholderData: keepPreviousData,
    },
  );

  const isPending = deriveEntityPending(activeId, signalQuery.data);

  const navigationMapCenter = useMemo(() => {
    const item = navigation.listItems.find((s) => s.id === activeId);
    return item ? getSignalMapCenter(item) ?? undefined : undefined;
  }, [activeId, navigation.listItems]);

  const navigatePrev = () => {
    if (navigation.prevId) navigateTo(navigation.prevId);
  };

  const navigateNext = () => {
    if (navigation.nextId) navigateTo(navigation.nextId);
  };

  return (
    <SignalDetailContent
      signal={signalQuery.data}
      loading={signalQuery.isLoading}
      isPending={isPending}
      mode="page"
      navigation={navigation}
      onNavigatePrev={navigatePrev}
      onNavigateNext={navigateNext}
      navigationMapCenter={navigationMapCenter}
    />
  );
}
