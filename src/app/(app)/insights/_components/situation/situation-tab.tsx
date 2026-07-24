"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Center, Group, Loader, Select, Tabs, Text } from "@mantine/core";
import { api } from "~/trpc/react";
import { SituationOverview } from "./situation-overview";
import { SituationSectors } from "./situation-sectors";
import { SituationSources } from "./situation-sources";

/** Fallback default when the user's teams carry no country scope (global
 *  monitoring). Sudan is the first deployment target and the only country the
 *  pipeline generates for today. */
const DEFAULT_COUNTRY = "Sudan";

type SubTab = "overview" | "sectors" | "sources";

export function SituationTab() {
  const t = useTranslations("insights.situation");
  const format = useFormatter();

  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [countryId, setCountryId] = useState<string | null>(null);

  const { data: countries, isLoading: countriesLoading } =
    api.situationAnalysis.countries.useQuery();
  const { data: teams, isLoading: teamsLoading } = api.teams.myTeams.useQuery();

  // Country ids the user's teams are scoped to (level 0 = country). An empty
  // scope across every team means global monitoring - offer all countries.
  const scopedCountryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const team of teams ?? []) {
      for (const loc of team.locations) {
        if (loc.level === 0) ids.add(loc.id);
      }
    }
    return ids;
  }, [teams]);

  // The countries this user may switch between: their scoped set, or every
  // country when they monitor globally.
  const options = useMemo(() => {
    if (!countries?.length) return [];
    if (scopedCountryIds.size === 0) return countries;
    return countries.filter((c) => scopedCountryIds.has(c.id));
  }, [countries, scopedCountryIds]);

  // Resolve the effective country without an effect: the selector is
  // uncontrolled until the user picks, so the default tracks the scoped list.
  const country = useMemo(() => {
    if (!options.length) return null;
    if (countryId) return options.find((c) => c.id === countryId) ?? options[0] ?? null;
    return options.find((c) => c.name === DEFAULT_COUNTRY) ?? options[0] ?? null;
  }, [options, countryId]);

  const { data, isLoading, isError } = api.situationAnalysis.get.useQuery(
    { countryLocationId: country?.id ?? "", countryName: country?.name ?? "" },
    { enabled: Boolean(country) },
  );

  // A switcher only earns its place when there's a real choice. A team scoped
  // to one country sees its name, not a single-option dropdown.
  const selector =
    options.length > 1 ? (
      <Select
        value={country?.id ?? null}
        onChange={setCountryId}
        data={options.map((c) => ({ value: c.id, label: c.name }))}
        placeholder={t("country")}
        searchable
        size="xs"
        w={200}
        aria-label={t("country")}
      />
    ) : country ? (
      <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
        {country.name}
      </Text>
    ) : null;

  if (countriesLoading || teamsLoading || (isLoading && country)) {
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
            <Text c="var(--color-text-secondary)" style={{ fontSize: 11 }}>
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
          <Text c="var(--color-text-primary)" style={{ fontSize: 13 }}>
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
          <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
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

          {subTab === "overview" && (
            <SituationOverview
              data={data}
              countryLocationId={country?.id ?? ""}
              onOpenSources={() => setSubTab("sources")}
            />
          )}
          {subTab === "sectors" && (
            <SituationSectors
              sectors={data.sectors}
              sources={data.sources}
              onOpenSources={() => setSubTab("sources")}
            />
          )}
          {subTab === "sources" && <SituationSources sources={data.sources} />}
        </>
      )}
    </Box>
  );
}
