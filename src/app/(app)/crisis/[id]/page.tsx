"use client";

import { use } from "react";
import { api } from "~/trpc/react";
import { CrisisDetailContent } from "~/components/crisis-detail/crisis-detail-content";

export default function CrisisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const crisisQuery = api.crises.get.useQuery(
    { id },
    { enabled: !!id },
  );

  const relatedQuery = api.crises.list.useQuery(undefined, {
    enabled: !!crisisQuery.data,
  });

  const related = (relatedQuery.data ?? []).filter((c) => c.id !== id);

  return (
    <CrisisDetailContent
      crisis={crisisQuery.data ?? null}
      loading={crisisQuery.isLoading}
      mode="page"
      relatedCrises={related}
    />
  );
}
