"use client";

import { use } from "react";
import { api } from "~/trpc/react";
import { EventDetailContent } from "~/components/event-detail/event-detail-content";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const eventQuery = api.events.get.useQuery(
    { id },
    { enabled: !!id },
  );

  const relatedQuery = api.events.list.useQuery(
    undefined,
    { enabled: !!eventQuery.data },
  );

  const relatedEvents = (relatedQuery.data ?? []).filter(
    (e) => e.id !== id,
  );

  return (
    <EventDetailContent
      event={eventQuery.data}
      loading={eventQuery.isLoading}
      mode="page"
      relatedEvents={relatedEvents}
      relatedLoading={relatedQuery.isLoading}
    />
  );
}
