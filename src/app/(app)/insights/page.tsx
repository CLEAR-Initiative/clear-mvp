"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Tabs } from "@mantine/core";
import { PageHeader } from "~/components/ui";
import { ReportsTab } from "./_components/reports-tab";
import { SituationTab } from "./_components/situation/situation-tab";
import { useTeamCountry } from "~/hooks/use-team-country";
import { useFeatureEnabled } from "~/components/feature-flags-provider";

export default function InsightsPage() {
  const t = useTranslations("insights");
  const [activeTab, setActiveTab] = useState<string | null>("crisis");
  const { countryName: teamCountryName } = useTeamCountry();

  // Situation Analysis tab is gated behind the `situation_analysis` feature flag
  // (admin Features tab). When it's off, hide the tab + panel; if it was the
  // active tab (e.g. a deep link or the admin just toggled it off), fall back to
  // the always-present Crisis tab so the page never strands on an empty panel.
  const situationEnabled = useFeatureEnabled("situation_analysis");
  useEffect(() => {
    if (!situationEnabled && activeTab === "situation") setActiveTab("crisis");
  }, [situationEnabled, activeTab]);

  return (
    <Box>
      <PageHeader
        title={t("page.title")}
        subtitle={t("page.title")}
        breadcrumbs={["CLEAR", t("page.breadcrumb")]}
      />

      <Box p={24}>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          mb={24}
          styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
        >
          <Tabs.List data-tour="insights-tabs">
            <Tabs.Tab value="crisis">{t("page.tabs.crisis")}</Tabs.Tab>
            {situationEnabled && (
              <Tabs.Tab value="situation">{t("page.tabs.situation")}</Tabs.Tab>
            )}
          </Tabs.List>
        </Tabs>

        {activeTab === "crisis" && (
          <Box data-tour="insights-crises">
            <ReportsTab
              selectedCountry={teamCountryName ?? ""}
              selectedRegion="All Regions"
              summaryStats={{ critical: 0, total: 0, types: [] }}
              realSituationItems={null}
            />
          </Box>
        )}

        {activeTab === "situation" && situationEnabled && <SituationTab />}
      </Box>
    </Box>
  );
}
