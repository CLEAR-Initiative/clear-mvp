"use client";

import { use } from "react";
import { getMockSituation, MOCK_SITUATIONS } from "~/lib/mocks/situations";
import { SituationDetailContent } from "~/components/situation-detail/situation-detail-content";

export default function SituationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // TODO: replace with api.situations.get.useQuery({ id }) once backend ships.
  const situation = getMockSituation(id);

  return (
    <SituationDetailContent
      situation={situation}
      loading={false}
      mode="page"
      relatedSituations={MOCK_SITUATIONS.filter((s) => s.id !== id)}
    />
  );
}
