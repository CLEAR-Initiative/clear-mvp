"use client";

import { use } from "react";
import { api } from "~/trpc/react";
import { SignalDetailContent } from "~/components/signal-detail/signal-detail-content";

export default function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const signalQuery = api.signals.get.useQuery(
    { id },
    { enabled: !!id },
  );

  return (
    <SignalDetailContent
      signal={signalQuery.data}
      loading={signalQuery.isLoading}
      mode="page"
    />
  );
}
