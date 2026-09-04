"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Group, Select, Tabs, Text } from "@mantine/core";
import { PageHeader } from "~/components/ui";
import { ReportsTab } from "./_components/reports-tab";
import { SituationTab } from "./_components/situation/situation-tab";
import {
  useTeamCountry,
  useScopedCountryOptions,
  resolveSelectedCountry,
} from "~/hooks/use-team-country";
import { useLocations } from "~/hooks/use-locations";
import { useReportStaleCountryPick } from "~/lib/report-stale-country-pick";
import { shortCountryName } from "~/lib/constants/country-config";
import { useFeatureEnabled } from "~/components/feature-flags-provider";

export default function InsightsPage() {
  const t = useTranslations("insights");
  const tFilters = useTranslations("common.filters");
  const [activeTab, setActiveTab] = useState<string | null>("crisis");
  const { countries: allCountries } = useLocations();
  const { countries: teamCountries } = useTeamCountry();
  const teamCountryNames = useMemo(
    () => teamCountries.map((c) => c.name),
    [teamCountries],
  );
  const [pickedCountry, setPickedCountry] = useState("");
  const countryOptions = useScopedCountryOptions(allCountries);
  const effectivePick = pickedCountry || countryOptions[0] || "";
  const selectedCountry = resolveSelectedCountry(teamCountryNames, effectivePick);
  useReportStaleCountryPick(countryOptions, effectivePick, selectedCountry);

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
              {countryOptions.length > 1 ? (
                <Select
                  value={selectedCountry || null}
                  onChange={(v) => setPickedCountry(v ?? pickedCountry)}
                  data={countryOptions.map((c) => ({
                    value: c,
                    label: shortCountryName(c),
                  }))}
                  placeholder={tFilters("country")}
                  searchable
                  size="xs"
                  w={200}
                  aria-label={tFilters("country")}
                />
              ) : selectedCountry ? (
                <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                  {shortCountryName(selectedCountry)}
                </Text>
              ) : null}
            </Group>
            <ReportsTab
              selectedCountry={selectedCountry}
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
