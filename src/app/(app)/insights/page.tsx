"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Box, Group, Select, Tabs, Text } from "@mantine/core";
import { PageHeader } from "~/components/ui";
import { ReportsTab } from "./_components/reports-tab";
import { SituationTab } from "./_components/situation/situation-tab";
import { AnalysisTab } from "./_components/analysis/analysis-tab";
import { useTeamCountry, useScopedCountryOptions } from "~/hooks/use-team-country";
import { useLocations } from "~/hooks/use-locations";
import { shortCountryName } from "~/lib/constants/country-config";
import { useFeatureEnabled } from "~/components/feature-flags-provider";

export default function InsightsPage() {
  const t = useTranslations("insights");
  const tFilters = useTranslations("common.filters");
  const [activeTab, setActiveTab] = useState<string | null>("crisis");
  const { countries: allCountries } = useLocations();
  const {
    countries: teamCountries,
    showCountrySelector,
    scopeReady,
  } = useTeamCountry();
  
  // Crisis tab uses local clearable filter state, not Working Country
  const [crisisPickedCountry, setCrisisPickedCountry] = useState<string | null>(null);
  
  const scopedOptions = useScopedCountryOptions(allCountries);
  // Only show picker if team has countries - prevents selecting countries not in team scope
  const countryOptions =
    !scopeReady || teamCountries.length === 0 ? [] : scopedOptions;
  
  const handleCrisisCountryChange = useCallback(
    (value: string | null) => {
      setCrisisPickedCountry(value);
    },
    [],
  );
  
  // Resolve picked country name to its location id for filtering
  const crisisCountryId = useMemo(() => {
    if (!crisisPickedCountry) return null;
    const location = teamCountries.find((c) => c.name === crisisPickedCountry);
    if (!location) {
      console.warn(`Selected country "${crisisPickedCountry}" not found in team bindings`);
      return null;
    }
    return location.id;
  }, [crisisPickedCountry, teamCountries]);
  
  const crisisCountryDisplayName = crisisPickedCountry
    ? shortCountryName(crisisPickedCountry) ?? crisisPickedCountry
    : t("reports.allCountries");

  // Each Insights tab is gated by its own feature flag (admin Features tab):
  // Crisis Overview (`crisis_overview`), Situation Analysis (`situation_analysis`)
  // and Analysis (`analysis_v2`). `enabledTabs` is the display-ordered list of
  // currently-enabled tabs; it drives both the default tab and the fallback when
  // the active tab is turned off (a deep link, or an admin toggling it) so the
  // page never strands on a hidden panel.
  const crisisEnabled = useFeatureEnabled("crisis_overview");
  const situationEnabled = useFeatureEnabled("situation_analysis");
  const analysisEnabled = useFeatureEnabled("analysis_v2");
  const enabledTabs = useMemo(() => {
    const tabs: string[] = [];
    if (crisisEnabled) tabs.push("crisis");
    if (situationEnabled) tabs.push("situation");
    if (analysisEnabled) tabs.push("analysis");
    return tabs;
  }, [crisisEnabled, situationEnabled, analysisEnabled]);
  useEffect(() => {
    if (activeTab && enabledTabs.includes(activeTab)) return;
    setActiveTab(enabledTabs[0] ?? null);
  }, [enabledTabs, activeTab]);

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
            {crisisEnabled && (
              <Tabs.Tab value="crisis">{t("page.tabs.crisis")}</Tabs.Tab>
            )}
            {situationEnabled && (
              <Tabs.Tab value="situation">{t("page.tabs.situation")}</Tabs.Tab>
            )}
            {analysisEnabled && (
              <Tabs.Tab value="analysis">{t("page.tabs.analysis")}</Tabs.Tab>
            )}
          </Tabs.List>
        </Tabs>

        {activeTab === "crisis" && crisisEnabled && (
          <Box data-tour="insights-crises">
            <Group justify="flex-end" mb={16}>
              {showCountrySelector ? (
                <Select
                  value={crisisPickedCountry}
                  onChange={handleCrisisCountryChange}
                  data={countryOptions.map((c) => ({
                    value: c,
                    label: shortCountryName(c) ?? c,
                  }))}
                  placeholder={t("reports.allCountries")}
                  clearable
                  size="xs"
                  w={200}
                  aria-label={tFilters("country")}
                />
              ) : null}
            </Group>
            <ReportsTab
              countryId={crisisCountryId}
              countryDisplayName={crisisCountryDisplayName}
              selectedRegion="All Regions"
              summaryStats={{ critical: 0, total: 0, types: [] }}
              realSituationItems={null}
            />
          </Box>
        )}

        {activeTab === "situation" && situationEnabled && <SituationTab />}
        {activeTab === "analysis" && analysisEnabled && <AnalysisTab />}
      </Box>
    </Box>
  );
}
