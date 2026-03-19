"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTeam } from "~/providers/team-provider";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { teams, isLoading } = useTeam();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && teams && teams.length === 0 && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [isLoading, teams, pathname, router]);

  return <>{children}</>;
}
