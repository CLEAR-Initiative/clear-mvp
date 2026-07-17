"use client";

import { useState } from "react";
import { Box, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useTranslations } from "next-intl";
import { useOverviewSituations } from "~/hooks/use-overview-situations";
import { AttentionQueue } from "./_components/attention-queue";
import {
  OverviewContext,
  OverviewSituationChips,
} from "./_components/overview-context";
import { OverviewGlobe } from "./_components/overview-globe";
import { OverviewQuickStats } from "./_components/overview-quick-stats";

/**
 * Overview — left: indicators + queue; right: chips → globe → Selected Context.
 * Mobile: indicators → chips + context → queue (no globe).
 */
export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const {
    situations,
    isLoading,
    escalatingCount,
    draftCount,
    events,
    alerts,
  } = useOverviewSituations(selectedCountry);

  return (
    <Box
      className="flex h-full flex-col overflow-hidden"
      style={{ background: "var(--color-bg-primary)" }}
    >
      <Box
        px={{ base: 12, sm: 32 }}
        py={{ base: 10, sm: 14 }}
        style={{ borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}
      >
        <Text
          fw={700}
          style={{
            fontSize: 18,
            letterSpacing: "-0.02em",
            color: "var(--color-text-primary)",
          }}
        >
          {t("overview.title")}
        </Text>
      </Box>

      <Box
        className="min-h-0 flex-1 overflow-y-auto"
        data-overview-scroll=""
        style={{ containerType: "size" }}
      >
        <Box className="flex min-h-full flex-col items-stretch lg:flex-row lg:items-start">
          {/* Left: indicators + attention queue */}
          <Box
            className="min-w-0 flex-1"
            style={{
              minWidth: 0,
              borderRight: isDesktop ? "1px solid var(--color-border)" : undefined,
            }}
          >
            <Box
              px={{ base: 12, sm: 24 }}
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <OverviewQuickStats
                country={selectedCountry}
                alerts={alerts}
                events={events}
              />
            </Box>

            {!isDesktop ? (
              <Box
                px={12}
                pt={12}
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <Box mb={10}>
                  <OverviewSituationChips
                    escalatingCount={escalatingCount}
                    draftCount={draftCount}
                  />
                </Box>
                <OverviewContext
                  selectedCountry={selectedCountry}
                  onCountryChange={setSelectedCountry}
                />
              </Box>
            ) : null}

            <AttentionQueue
              situations={situations}
              isLoading={isLoading}
              hoveredEventId={hoveredEventId}
              onHover={setHoveredEventId}
              embedScroll
            />
          </Box>

          {/* Right: Escalating/Drafts → Operational Globe → Selected Context */}
          {isDesktop ? (
            <Box
              className="flex flex-col"
              data-overview-globe-sticky=""
              style={{
                flex: "0 0 400px",
                width: 400,
                position: "sticky",
                top: 0,
                maxHeight: "100cqh",
                alignSelf: "flex-start",
                padding: "16px 20px 20px",
                boxSizing: "border-box",
                overflowY: "auto",
                background: "var(--color-bg-primary)",
              }}
            >
              <Box mb={12}>
                <OverviewSituationChips
                  escalatingCount={escalatingCount}
                  draftCount={draftCount}
                />
              </Box>
              <OverviewGlobe
                situations={situations}
                selectedCountry={selectedCountry}
                hoveredEventId={hoveredEventId}
                onHover={setHoveredEventId}
              />
              <Box
                pt={16}
                w="100%"
                style={{ borderTop: "1px solid var(--color-border)" }}
              >
                <OverviewContext
                  selectedCountry={selectedCountry}
                  onCountryChange={setSelectedCountry}
                />
              </Box>
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
