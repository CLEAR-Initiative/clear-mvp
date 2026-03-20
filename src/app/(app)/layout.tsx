import { Box, Group } from "@mantine/core";
import { NavSidebar } from "~/components/nav-sidebar";
import { MobileBottomNav } from "~/components/mobile-bottom-nav";
import { FeatureFlagsProvider } from "~/components/feature-flags-provider";
import { TeamProvider } from "~/providers/team-provider";
import { OnboardingGuard } from "~/components/onboarding-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeamProvider>
      <OnboardingGuard>
        <Group gap={0} align="stretch" wrap="nowrap" style={{ minHeight: "100vh" }}>
          <NavSidebar />
          <Box
            component="main"
            style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#FAFAFA" }}
            pt={{ base: 56, sm: 0 }}
            pb={{ base: 72, sm: 0 }}
          >
            <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
          </Box>
        </Group>
        <MobileBottomNav />
      </OnboardingGuard>
    </TeamProvider>
  );
}
