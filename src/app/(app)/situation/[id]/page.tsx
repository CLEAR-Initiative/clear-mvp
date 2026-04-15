"use client";

import { use } from "react";
import { api } from "~/trpc/react";
import { SituationDetailContent } from "~/components/situation-detail/situation-detail-content";

export default function SituationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const situationQuery = api.situations.get.useQuery(
    { id },
    { enabled: !!id },
  );

  const relatedQuery = api.situations.list.useQuery(undefined, {
    enabled: !!situationQuery.data,
  });

  const related = (relatedQuery.data ?? []).filter((s) => s.id !== id);

  return (
    <SituationDetailContent
      situation={situationQuery.data ?? null}
      loading={situationQuery.isLoading}
      mode="page"
      relatedSituations={related}
    />
  );
}
