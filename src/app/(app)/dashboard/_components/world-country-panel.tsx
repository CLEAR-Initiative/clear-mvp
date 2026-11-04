"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { ActionIcon, Box, Button, Group, SimpleGrid, Skeleton, Stack, Text, Tooltip } from "@mantine/core";
import { IconArrowRight, IconInfoCircle, IconX } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useTeamCountry } from "~/hooks/use-team-country";
import { isoForCountryName } from "~/lib/constants/countries";
import type { NrcOperatingCountry } from "~/lib/data/nrc-operating-countries";

/**
 * Right panel of the Overview world map. Every operating country gets the
 * same sections; a source with nothing for the country says so instead of
 * the section disappearing. The only exception is the country analysis,
 * shown only when the country is in the user's team scope.
 */
export function WorldCountryPanel({
  country,
  onClose,
}: {
  country: NrcOperatingCountry;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.worldPanel");
  return (
    <Box
      component="aside"
      aria-label={country.name}
      className="bg-[var(--color-bg-white)] border-l border-[var(--color-border)] overflow-y-auto flex flex-col w-[380px] h-full"
    >
      <Box px={24} py={20} className="border-b border-[var(--color-border)] bg-[var(--color-bg-muted)]">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box>
            <Text fw={700} style={{ fontSize: 24, letterSpacing: "-0.02em" }} c="var(--color-text-primary)">
              {country.name}
            </Text>
            <Text size="sm" c="var(--color-text-muted)">
              {t("office", { city: country.pinCity })}
            </Text>
          </Box>
          <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label={t("close")}>
            <IconX size={18} />
          </ActionIcon>
        </Group>
      </Box>
      <RiskSection iso3={country.iso3} />
      <AnalysisSection iso2={country.iso2} />
      <FiguresSection iso3={country.iso3} />
      <SeveritySection iso3={country.iso3} />
    </Box>
  );
}

function Section({ title, source, children }: { title: string; source?: string; children: ReactNode }) {
  return (
    <Box px={24} py={16} className="border-b border-[var(--color-border)]">
      <Text tt="uppercase" fw={700} mb={10} c="var(--color-text-primary)" style={{ fontSize: 12, letterSpacing: "0.06em" }}>
        {title}
      </Text>
      {children}
      {source && (
        <Text mt={10} c="var(--color-text-muted)" style={{ fontSize: 11 }}>
          {source}
        </Text>
      )}
    </Box>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <Text size="sm" c="var(--color-text-muted)">
      {children}
    </Text>
  );
}

/** INFORM Risk classes (JRC): very high from 6.5, high from 5, medium from 3.5, low from 2. */
export function informRiskClass(score: number): "veryHigh" | "high" | "medium" | "low" | "veryLow" {
  if (score >= 6.5) return "veryHigh";
  if (score >= 5) return "high";
  if (score >= 3.5) return "medium";
  if (score >= 2) return "low";
  return "veryLow";
}

const RISK_COLOR = {
  veryHigh: "var(--color-critical)",
  high: "var(--color-warning)",
  medium: "var(--color-text-primary)",
  low: "var(--color-text-secondary)",
  veryLow: "var(--color-text-secondary)",
} as const;

function RiskSection({ iso3 }: { iso3: string }) {
  const t = useTranslations("dashboard.worldPanel.risk");
  const risk = api.inform.getRisk.useQuery({ iso3 }, { staleTime: 86_400_000, retry: 1 });
  const data = risk.data;
  return (
    <Section title={t("title")} source={data ? t("source", { edition: data.edition }) : t("sourceShort")}>
      {risk.isLoading ? (
        <Skeleton h={72} />
      ) : !data || data.score === null ? (
        <Muted>{risk.isError ? t("unavailable") : t("noData")}</Muted>
      ) : (
        <Stack gap={12}>
          <Group gap={8} align="baseline">
            <Text fw={700} style={{ fontSize: 28, color: RISK_COLOR[informRiskClass(data.score)] }}>
              {data.score.toFixed(1)}
            </Text>
            <Text size="sm" c="var(--color-text-muted)">/10</Text>
            <Text size="sm" fw={600} style={{ color: RISK_COLOR[informRiskClass(data.score)] }}>
              {t(`class.${informRiskClass(data.score)}`)}
            </Text>
          </Group>
          <SimpleGrid cols={3} spacing={8}>
            {(["hazard", "vulnerability", "coping"] as const).map((pillar) => (
              <Box key={pillar}>
                <Text fw={700} c="var(--color-text-primary)">{data.pillars[pillar]?.toFixed(1) ?? "-"}</Text>
                <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>{t(`pillars.${pillar}`)}</Text>
              </Box>
            ))}
          </SimpleGrid>
          {data.indicators.length > 0 && (
            <Box>
              <Text c="var(--color-text-muted)" mb={4} style={{ fontSize: 11 }}>{t("drivers")}</Text>
              {data.indicators.slice(0, 3).map((indicator) => (
                <Group key={indicator.id} justify="space-between" wrap="nowrap">
                  <Text size="sm" c="var(--color-text-secondary)" truncate>{indicator.name}</Text>
                  <Text size="sm" fw={600} c="var(--color-text-primary)">{indicator.score.toFixed(1)}</Text>
                </Group>
              ))}
            </Box>
          )}
        </Stack>
      )}
    </Section>
  );
}

/**
 * The country's location id when the user may open its analysis: one of the
 * active team's countries, or any country for an unscoped team (global
 * monitoring), the same rule as Insights.
 */
function useScopedCountry(iso2: string): { id: string; name: string } | null | undefined {
  const { countries: teamCountries, scopeReady } = useTeamCountry();
  const unscoped = scopeReady && teamCountries.length === 0;
  const all = api.situationAnalysis.countries.useQuery(undefined, { enabled: unscoped, staleTime: Infinity });
  if (!scopeReady || (unscoped && all.isLoading)) return undefined;
  const pool = unscoped ? (all.data ?? []) : teamCountries;
  const match = pool.find((c) => isoForCountryName(c.name)?.toUpperCase() === iso2);
  return match ? { id: match.id, name: match.name } : null;
}

function AnalysisSection({ iso2 }: { iso2: string }) {
  const t = useTranslations("dashboard.worldPanel.analysis");
  const format = useFormatter();
  const { activeTeamId } = useTeam();
  const scoped = useScopedCountry(iso2);
  const scopes = api.analysis.scopes.useQuery(
    { teamId: activeTeamId ?? null, countries: scoped ? [scoped] : [] },
    { enabled: !!scoped, staleTime: 60_000 },
  );
  // Out of scope: nothing to show, and nothing about the analysis leaks.
  if (scoped === null) return null;
  const entry = scopes.data?.countries[0];
  return (
    <Section title={t("title")}>
      {scoped === undefined || scopes.isLoading ? (
        <Skeleton h={56} />
      ) : !entry?.analysisId ? (
        <Muted>{t("none")}</Muted>
      ) : (
        <Stack gap={8}>
          {entry.headline && (
            <Text size="sm" c="var(--color-text-primary)" lineClamp={3}>
              {entry.headline}
            </Text>
          )}
          {entry.generatedAt && (
            <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
              {t("updated", { when: format.relativeTime(new Date(entry.generatedAt)) })}
            </Text>
          )}
          <Button
            component={Link}
            href={`/insights?country=${encodeURIComponent(entry.id)}`}
            variant="light"
            color="orange"
            size="xs"
            rightSection={<IconArrowRight size={14} />}
            style={{ alignSelf: "flex-start" }}
          >
            {t("open")}
          </Button>
        </Stack>
      )}
    </Section>
  );
}

/** Where each HDX HAPI figure comes from. Proper names, not translated. */
const FIGURE_SOURCES = {
  peopleInNeed: "OCHA Humanitarian Needs and Response Plan",
  internallyDisplaced: "IOM Displacement Tracking Matrix (DTM)",
  refugeesHosted: "UNHCR",
  foodInsecurity: "Integrated Food Security Phase Classification (IPC)",
  funding: "OCHA Financial Tracking Service (FTS)",
  politicalViolence: "ACLED",
} as const;

const YEAR_MS = 365 * 86_400_000;

function Figure({
  label,
  value,
  detail,
  source,
  asOf,
}: {
  label: string;
  value: string;
  detail: string;
  source: string;
  /** End of the figure's reference period; over a year before now marks it as old. */
  asOf?: string;
}) {
  const t = useTranslations("dashboard.worldPanel.figures");
  const now = useNow();
  const old = !!asOf && now.getTime() - new Date(asOf).getTime() > YEAR_MS;
  return (
    <Box>
      <Group gap={4} justify="space-between" align="flex-start" wrap="nowrap">
        <Text c="var(--color-text-muted)" style={{ fontSize: 11 }} lineClamp={2}>{label}</Text>
        <Tooltip label={source} multiline w={220} withArrow events={{ hover: true, focus: true, touch: true }}>
          <Box
            component="span"
            tabIndex={0}
            aria-label={source}
            c="var(--color-text-muted)"
            style={{ display: "inline-flex", flexShrink: 0, cursor: "help" }}
          >
            <IconInfoCircle size={13} />
          </Box>
        </Tooltip>
      </Group>
      <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: 18 }}>{value}</Text>
      <Text c="var(--color-text-muted)" style={{ fontSize: 11 }} lineClamp={2}>{detail}</Text>
      {old && (
        <Text c="var(--color-warning)" fw={600} style={{ fontSize: 11 }}>{t("old")}</Text>
      )}
    </Box>
  );
}

function FiguresSection({ iso3 }: { iso3: string }) {
  const t = useTranslations("dashboard.worldPanel.figures");
  const format = useFormatter();
  const figures = api.hapi.countryFigures.useQuery({ iso3 }, { staleTime: 3_600_000, retry: 1 });
  const data = figures.data;
  const compact = (n: number) => format.number(n, { notation: "compact", maximumFractionDigits: 1 });
  const monthYear = (iso: string) => format.dateTime(new Date(iso), { month: "short", year: "numeric" });
  const monthRange = (from: string, to: string) =>
    from.slice(0, 7) === to.slice(0, 7)
      ? monthYear(to)
      : format.dateTimeRange(new Date(from), new Date(to), { month: "short", year: "numeric" });
  const missing = (source: string) => (data?.failed.includes(source) ? t("unavailable") : t("noData"));
  const sourceOf = (figure: keyof typeof FIGURE_SOURCES) => t("sourceOf", { source: FIGURE_SOURCES[figure] });

  return (
    <Section title={t("title")}>
      {figures.isLoading ? (
        <Skeleton h={160} />
      ) : !data ? (
        <Muted>{t("unavailable")}</Muted>
      ) : (
        <SimpleGrid cols={2} spacing={16} verticalSpacing={14}>
          <Figure
            label={t("peopleInNeed")}
            source={sourceOf("peopleInNeed")}
            asOf={data.peopleInNeed?.asOf}
            value={data.peopleInNeed ? compact(data.peopleInNeed.value) : "-"}
            detail={data.peopleInNeed ? t("plan", { year: data.peopleInNeed.asOf.slice(0, 4) }) : missing("needs")}
          />
          <Figure
            label={t("internallyDisplaced")}
            source={sourceOf("internallyDisplaced")}
            asOf={data.internallyDisplaced?.asOf}
            value={data.internallyDisplaced ? compact(data.internallyDisplaced.value) : "-"}
            detail={data.internallyDisplaced ? monthYear(data.internallyDisplaced.asOf) : missing("idps")}
          />
          <Figure
            label={t("refugeesHosted")}
            source={sourceOf("refugeesHosted")}
            asOf={data.refugeesHosted?.asOf}
            value={data.refugeesHosted ? compact(data.refugeesHosted.value) : "-"}
            detail={data.refugeesHosted ? data.refugeesHosted.asOf.slice(0, 4) : missing("refugees")}
          />
          <Figure
            label={t("foodInsecurity")}
            source={sourceOf("foodInsecurity")}
            asOf={data.ipcPhase3Plus?.asOf}
            value={data.ipcPhase3Plus ? compact(data.ipcPhase3Plus.value) : "-"}
            detail={
              data.ipcPhase3Plus
                ? data.ipcPhase3Plus.fraction !== null
                  ? t("shareOfPopulation", {
                      share: format.number(data.ipcPhase3Plus.fraction, { style: "percent" }),
                      date: monthRange(data.ipcPhase3Plus.from, data.ipcPhase3Plus.asOf),
                    })
                  : monthRange(data.ipcPhase3Plus.from, data.ipcPhase3Plus.asOf)
                : missing("ipc")
            }
          />
          <Figure
            label={t("funding")}
            source={sourceOf("funding")}
            asOf={data.appeal ? `${data.appeal.year}-12-31` : undefined}
            value={data.appeal?.fundingPct != null ? t("funded", { pct: data.appeal.fundingPct }) : "-"}
            detail={
              data.appeal
                ? t("appeal", {
                    amount: format.number(data.appeal.requirementsUsd, {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }),
                    year: data.appeal.year,
                  })
                : missing("funding")
            }
          />
          <Figure
            label={t("politicalViolence")}
            source={sourceOf("politicalViolence")}
            value={data.politicalViolence ? format.number(data.politicalViolence.events) : "-"}
            detail={
              data.politicalViolence
                ? t("fatalities", {
                    count: data.politicalViolence.fatalities,
                    month: monthYear(`${data.politicalViolence.month}-15`),
                  })
                : missing("conflict")
            }
          />
        </SimpleGrid>
      )}
    </Section>
  );
}

/** ACAPS severity category 1 (very low) to 5 (very high). The index itself runs 0 to 10. */
function severityLevel(n: number): "1" | "2" | "3" | "4" | "5" {
  return String(Math.min(5, Math.max(1, Math.round(n)))) as "1" | "2" | "3" | "4" | "5";
}

function SeveritySection({ iso3 }: { iso3: string }) {
  const t = useTranslations("dashboard.worldPanel.severity");
  const severity = api.inform.getSeverity.useQuery({ iso3 }, { staleTime: 43_200_000, retry: 1 });
  const data = severity.data;
  return (
    <Section title={t("title")} source={t("source")}>
      {severity.isLoading ? (
        <Skeleton h={48} />
      ) : !data ? (
        <Muted>{severity.isError ? t("unavailable") : t("none")}</Muted>
      ) : (
        <Stack gap={4}>
          <Group gap={8} align="baseline">
            <Text fw={700} style={{ fontSize: 22 }} c={data.categoryNumeric >= 4 ? "var(--color-critical)" : "var(--color-text-primary)"}>
              {data.score.toFixed(1)}
            </Text>
            <Text size="sm" c="var(--color-text-muted)">/10</Text>
            <Text size="sm" fw={600} c="var(--color-text-primary)">
              {t(`category.${severityLevel(data.categoryNumeric)}`)}
            </Text>
          </Group>
          <Text size="sm" c="var(--color-text-secondary)">{data.crisisName}</Text>
        </Stack>
      )}
    </Section>
  );
}
