import { Suspense } from "react";
import { cookies } from "next/headers";
import { Box, Group } from "@mantine/core";
import { NavSidebar } from "~/components/nav-sidebar";
import { NavSidebarFallback } from "~/components/nav-sidebar-fallback";
import { MobileBottomNav } from "~/components/mobile-bottom-nav";
import { FeatureFlagsProvider } from "~/components/feature-flags-provider";
import { TeamProvider } from "~/providers/team-provider";
import { WorkingCountryProvider } from "~/providers/working-country-provider";
import { OnboardingGuard } from "~/components/onboarding-guard";
import { ProductTourHost } from "~/components/onboarding/product-tour-host";
import { ConsoleBufferInit } from "~/components/console-buffer-init";
import {
  PageTransitionProvider,
  PageTransitionVeil,
} from "~/components/page-transition";
import { api, HydrateClient } from "~/trpc/server";
import { WORKING_COUNTRY_COOKIE } from "~/lib/working-country-cookie";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Prefetch auth.me so the client cache is hydrated on first paint
  void api.auth.me.prefetch();

  // Read working country cookie for SSR hydration
  const cookieStore = await cookies();
  const workingCountryCookie = cookieStore.get(WORKING_COUNTRY_COOKIE)?.value;

  return (
    <HydrateClient>
      <TeamProvider>
        <WorkingCountryProvider initialCookieValue={workingCountryCookie}>
          <FeatureFlagsProvider>
          <ConsoleBufferInit />
          <PageTransitionProvider>
            <Suspense fallback={null}>
              <OnboardingGuard>
                <Group
                  gap={0}
                  align="stretch"
                  wrap="nowrap"
                  style={{
                    minHeight: "100vh",
                    background: "var(--color-bg-primary)",
                  }}
                >
                  <Suspense fallback={<NavSidebarFallback />}>
                    <NavSidebar />
                  </Suspense>
                  <Box
                    component="main"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      background: "var(--color-bg-primary)",
                      position: "relative",
                    }}
                    pt={{ base: 56, sm: 0 }}
                    pb={{ base: 72, sm: 0 }}
                  >
                    {children}
                    <PageTransitionVeil />
                  </Box>
                </Group>
                <MobileBottomNav />
                <ProductTourHost />
              </OnboardingGuard>
            </Suspense>
          </PageTransitionProvider>
        </FeatureFlagsProvider>
      </WorkingCountryProvider>
      </TeamProvider>
    </HydrateClient>
  );
}
