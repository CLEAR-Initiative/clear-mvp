import { TeamProvider } from "~/providers/team-provider";
import { FeatureFlagsProvider } from "~/components/feature-flags-provider";
import { UsageTracker } from "~/components/analytics/usage-tracker";

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeamProvider>
      <FeatureFlagsProvider>
        <UsageTracker />
        {children}
      </FeatureFlagsProvider>
    </TeamProvider>
  );
}
