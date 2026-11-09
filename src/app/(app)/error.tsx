"use client";

import { RouteErrorView } from "~/components/route-error-view";

// Catches errors thrown by any page under (app). The nav stays usable.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorView error={error} reset={reset} />;
}
