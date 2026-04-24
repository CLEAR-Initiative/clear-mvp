"use client";

import { use } from "react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { EventDetailContent } from "~/components/event-detail/event-detail-content";

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { activeTeamId } = useTeam();

  const eventQuery = api.events.get.useQuery(
    { id },
    { enabled: !!id },
  );

  const relatedQuery = api.events.related.useQuery(
    { id, teamId: activeTeamId },
    { enabled: !!eventQuery.data },
  );

  return (
    <EventDetailContent
      event={eventQuery.data}
      loading={eventQuery.isLoading}
      mode="page"
      relatedEvents={relatedQuery.data ?? []}
      relatedLoading={relatedQuery.isLoading}
    />
  );
}
