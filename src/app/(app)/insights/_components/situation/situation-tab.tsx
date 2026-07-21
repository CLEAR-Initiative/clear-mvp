"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Center, Group, Loader, Select, Tabs, Text } from "@mantine/core";
import { api } from "~/trpc/react";
import { SituationOverview } from "./situation-overview";
import { SituationSectors } from "./situation-sectors";
import { SituationSources } from "./situation-sources";

/** Initial country when the user has not chosen one. Sudan is the first
 *  deployment target, and is the only country the pipeline generates for
 *  today. Falls back to the first available country if absent. */
const DEFAULT_COUNTRY = "Sudan";

type SubTab = "overview" | "sectors" | "sources";

export function SituationTab() {
  const t = useTranslations("insights.situation");
  const format = useFormatter();

  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [countryId, setCountryId] = useState<string | null>(null);

  const { data: countries, isLoading: countriesLoading } =
    api.situationAnalysis.countries.useQuery();

  // Resolve the effective country without an effect: the selector is
  // uncontrolled until the user picks, so the default tracks the loaded list.
  const country = useMemo(() => {
    if (!countries?.length) return null;
    if (countryId) return countries.find((c) => c.id === countryId) ?? null;
    return countries.find((c) => c.name === DEFAULT_COUNTRY) ?? countries[0] ?? null;
  }, [countries, countryId]);

  const { data, isLoading, isError } = api.situationAnalysis.get.useQuery(
    { countryLocationId: country?.id ?? "", countryName: country?.name ?? "" },
    { enabled: Boolean(country) },
  );

  const selector = (
    <Select
      value={country?.id ?? null}
      onChange={setCountryId}
      data={(countries ?? []).map((c) => ({ value: c.id, label: c.name }))}
      disabled={countriesLoading}
      placeholder={t("country")}
      searchable
      size="xs"
      w={200}
      aria-label={t("country")}
    />
  );

  if (countriesLoading || (isLoading && country)) {
    return (
      <Box>
        <Group justify="flex-end" mb={16}>
          {selector}
        </Group>
        <Center mih="30vh">
          <Loader size="sm" />
        </Center>
      </Box>
    );
  }

  return (
    <Box>
      <Group justify="space-between" align="center" mb={16} wrap="nowrap">
        <Box>
          {data && (
            <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
              {t("meta.generated", {
                date: format.dateTime(new Date(data.crisis.generatedAt), {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }),
                model: data.crisis.generatedByModel,
                reports: data.crisis.reportCount ?? 0,
              })}
            </Text>
          )}
        </Box>
        {selector}
      </Group>

      {isError && (
        <Center mih="30vh">
          <Text c="var(--color-text-muted)" style={{ fontSize: 13 }}>
            {t("error")}
          </Text>
        </Center>
      )}

      {!isError && !data && (
        <Box
          p={32}
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-white)",
            textAlign: "center",
          }}
        >
          <Text fw={600} c="var(--color-text-primary)" mb={8}>
            {t("empty.title")}
          </Text>
          <Text c="var(--color-text-muted)" style={{ fontSize: 13 }}>
            {t("empty.description", { country: country?.name ?? "" })}
          </Text>
        </Box>
      )}

      {!isError && data && (
        <>
          <Tabs
            value={subTab}
            onChange={(v) => setSubTab((v as SubTab) ?? "overview")}
            mb={20}
            styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
          >
            <Tabs.List>
              <Tabs.Tab value="overview">{t("tabs.overview")}</Tabs.Tab>
              <Tabs.Tab value="sectors">{t("tabs.sectors")}</Tabs.Tab>
              <Tabs.Tab value="sources">{t("tabs.sources")}</Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {subTab === "overview" && <SituationOverview data={data} />}
          {subTab === "sectors" && <SituationSectors sectors={data.sectors} />}
          {subTab === "sources" && <SituationSources sources={data.sources} />}
        </>
      )}
    </Box>
  );
}
