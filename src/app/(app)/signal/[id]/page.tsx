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

  // staleTime: Infinity prevents the query from refetching on window
  // focus / remount — for a heavy procedure at non-English locales the
  // refetch cycle can leave the React Query state stuck in
  // isLoading=true while subsequent fetches replace the previous one.
  // retry: false stops auto-retries from chaining a second 10s fetch
  // when the first eventually completes — historically these chains
  // looked like "spinner forever" even though the data was on the wire.
  const signalQuery = api.signals.get.useQuery(
    { id },
    { enabled: !!id, staleTime: Infinity, retry: false },
  );

  return (
    <SignalDetailContent
      signal={signalQuery.data}
      loading={signalQuery.isLoading}
      mode="page"
    />
  );
}
