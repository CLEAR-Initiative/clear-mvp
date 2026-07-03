"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTeam } from "~/providers/team-provider";
import { api } from "~/trpc/react";
import { useOnboardingState } from "~/hooks/use-onboarding-state";
import { resolveOnboardingRedirect } from "~/lib/onboarding/resolve-redirect";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { teams, isLoading: teamsLoading, isError: teamsError } = useTeam();
  const orgsQuery = api.teams.myOrganisations.useQuery(undefined, {
    retry: false,
  });
  const authQuery = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const onboardingState = useOnboardingState(authQuery.data?.user?.id);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (teamsLoading || orgsQuery.isLoading || authQuery.isLoading) return;
    if (teamsError || orgsQuery.isError) return;

    const hasOrgs = (orgsQuery.data?.length ?? 0) > 0;
    const hasTeams = (teams?.length ?? 0) > 0;

    if (!hasOrgs && !hasTeams && pathname !== "/no-access") {
      router.replace("/no-access");
      return;
    }

    if (!onboardingState) return;
    const redirect = resolveOnboardingRedirect(onboardingState, pathname);
    if (redirect) {
      router.replace(redirect);
    }
  }, [
    teamsLoading,
    teamsError,
    teams,
    orgsQuery.isLoading,
    orgsQuery.isError,
    orgsQuery.data,
    authQuery.isLoading,
    authQuery.data?.user?.id,
    onboardingState,
    pathname,
    router,
  ]);

  return <>{children}</>;
}
