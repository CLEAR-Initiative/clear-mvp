"use client";

import { RouteErrorView } from "~/components/route-error-view";

// Catches errors from pages outside (app) (auth, welcome, invite) and from
// the (app) layout itself, which (app)/error.tsx can't catch.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorView error={error} reset={reset} fullScreen />;
}
