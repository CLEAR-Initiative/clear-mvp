import { Box, Group } from "@mantine/core";
import { NavSidebar } from "~/components/nav-sidebar";
import { FeatureFlagsProvider } from "~/components/feature-flags-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureFlagsProvider>
      <Group gap={0} align="stretch" wrap="nowrap" style={{ minHeight: "100vh" }}>
        <NavSidebar />
        <Box component="main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#FAFAFA" }}>
          {children}
        </Box>
      </Group>
    </FeatureFlagsProvider>
  );
}
