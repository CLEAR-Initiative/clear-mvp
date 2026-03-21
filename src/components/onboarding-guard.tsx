"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTeam } from "~/providers/team-provider";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { teams, isLoading, isError } = useTeam();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only redirect to onboarding when we've confirmed the user has no teams.
    // Don't redirect on query errors — that could be a transient API failure.
    if (!isLoading && !isError && teams?.length === 0 && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [isLoading, isError, teams, pathname, router]);

  return <>{children}</>;
}
