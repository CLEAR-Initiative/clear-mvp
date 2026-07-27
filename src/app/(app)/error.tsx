"use client";

import { ErrorRecoveryCard } from "~/components/ui/error-recovery-card";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorRecoveryCard reset={reset} />;
}
