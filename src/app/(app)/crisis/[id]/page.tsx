"use client";

import { Suspense, use, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { CrisisDetailContent } from "~/components/crisis-detail/crisis-detail-content";

function CrisisDetailPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const referrer = searchParams.get("from") ?? "insights";
  const utils = api.useUtils();

  const crisisQuery = api.crises.get.useQuery({ id }, { enabled: !!id });

  // Race comments with crisis detail so empty discussions don't wait on a waterfall.
  useEffect(() => {
    if (!id) return;
    void utils.comments.list.prefetch({ entityId: id, entityType: "crisis" });
  }, [id, utils]);

  const relatedQuery = api.crises.list.useQuery(undefined, {
    enabled: !!crisisQuery.data,
  });
  const related = (relatedQuery.data ?? []).filter((c) => c.id !== id);

  if (crisisQuery.isLoading && !crisisQuery.data) {
    return (
      <CrisisDetailContent
        crisis={null}
        loading={true}
        mode="page"
        relatedCrises={[]}
        referrer={referrer}
      />
    );
  }

  return (
    <CrisisDetailContent
      crisis={crisisQuery.data ?? null}
      loading={false}
      mode="page"
      relatedCrises={related}
      referrer={referrer}
    />
  );
}

export default function CrisisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <CrisisDetailPageContent params={params} />
    </Suspense>
  );
}
