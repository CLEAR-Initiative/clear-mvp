"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTeam } from "~/providers/team-provider";
import { api } from "~/trpc/react";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { teams, isLoading: teamsLoading, isError: teamsError } = useTeam();
  const orgsQuery = api.teams.myOrganisations.useQuery(undefined, {
    retry: false,
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for both queries to settle
    if (teamsLoading || orgsQuery.isLoading) return;
    if (teamsError || orgsQuery.isError) return;

    const hasOrgs = (orgsQuery.data?.length ?? 0) > 0;
    const hasTeams = (teams?.length ?? 0) > 0;

    // User has no org membership — they haven't been invited yet
    if (!hasOrgs && !hasTeams && pathname !== "/no-access") {
      router.replace("/no-access");
    }
  }, [teamsLoading, teamsError, teams, orgsQuery.isLoading, orgsQuery.isError, orgsQuery.data, pathname, router]);

  return <>{children}</>;
}
