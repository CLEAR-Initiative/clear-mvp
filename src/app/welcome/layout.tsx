import { cookies } from "next/headers";
import { TeamProvider } from "~/providers/team-provider";
import { WorkingCountryProvider } from "~/providers/working-country-provider";
import { FeatureFlagsProvider } from "~/components/feature-flags-provider";
import { UsageTracker } from "~/components/analytics/usage-tracker";
import { WORKING_COUNTRY_COOKIE } from "~/lib/working-country-cookie";

// The welcome pages call useTeamCountry, which needs WorkingCountryProvider.
export default async function WelcomeLayout({ children }: { children: React.ReactNode }) {
  const workingCountryCookie = (await cookies()).get(WORKING_COUNTRY_COOKIE)?.value;

  return (
    <TeamProvider>
      <WorkingCountryProvider initialCookieValue={workingCountryCookie}>
        <FeatureFlagsProvider>
          <UsageTracker />
          {children}
        </FeatureFlagsProvider>
      </WorkingCountryProvider>
    </TeamProvider>
  );
}
