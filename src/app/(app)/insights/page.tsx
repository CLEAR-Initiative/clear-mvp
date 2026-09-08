"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Box, Group, Select, Tabs, Text } from "@mantine/core";
import { PageHeader } from "~/components/ui";
import { ReportsTab } from "./_components/reports-tab";
import { SituationTab } from "./_components/situation/situation-tab";
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
      </Box>
    </Box>
  );
}
