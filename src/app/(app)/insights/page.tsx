"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Tabs } from "@mantine/core";
import { PageHeader } from "~/components/ui";
import { ReportsTab } from "./_components/reports-tab";
import { SituationTab } from "./_components/situation/situation-tab";
import { useTeamCountry } from "~/hooks/use-team-country";

export default function InsightsPage() {
  const t = useTranslations("insights");
  const [activeTab, setActiveTab] = useState<string | null>("crisis");
  const { countryName: teamCountryName } = useTeamCountry();

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
            <Tabs.Tab value="situation">{t("page.tabs.situation")}</Tabs.Tab>
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

        {activeTab === "situation" && <SituationTab />}
      </Box>
    </Box>
  );
}
