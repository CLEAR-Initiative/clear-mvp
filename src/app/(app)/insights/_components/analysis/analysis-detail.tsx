"use client";

import { useEffect, useState } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Alert, Badge, Box, Center, Group, Loader, SimpleGrid, Stack, Tabs, Text, Title, UnstyledButton } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { generationOverdue, isStale } from "~/lib/analysis-view";
import type { CreatedAnalysis } from "~/server/api/mappers/analysis";
import { AiSummaryCard } from "../situation/ai-summary-card";
import { SituationSources } from "../situation/situation-sources";
import { AnalysisKpis } from "./analysis-kpis";
import { ScopeMap } from "./scope-map";
import { ContextRisks } from "./context-risks";
import { EventsTimeline } from "./events-timeline";
import { DisplacementSection, ForecastSection, HazardsSection } from "./findings-panel";
import { AnalysisNeeds } from "./analysis-needs";
import { EventsList } from "./events-list";
import { KeyFindings } from "./key-findings";
import { Notice } from "./notice";
import { CreateReportButton } from "./create-report-button";
import { RefreshButton, type RefreshFrame } from "./refresh-button";

type Tab = "overview" | "needs" | "sources";

/** Which analysis is open: the country default, or one the team created. */
export type AnalysisScopeRef =
  | { kind: "country"; countryId: string; countryName: string }
  | { kind: "created"; countryId: string; countryName: string; created: CreatedAnalysis };

export function scopeKey(s: AnalysisScopeRef): string {
  return s.kind === "country" ? `country:${s.countryId}` : `created:${s.created.id}`;
}

/** A created analysis with no generated row yet is re-polled until the pipeline lands it. */
const GENERATING_POLL_MS = 30_000;

/** After "Update now", the open analysis is re-polled until a newer version lands. */
const REFRESH_POLL_MS = 30_000;

/**
 * How long to wait for a requested version before giving up, so a dropped or
 * failed run does not block "Update now" (the pipeline drains within about a minute).
 */
const REFRESH_TIMEOUT_MS = 15 * 60_000;

/** One analysis: header, then Overview / Needs / Sources tabs. */
export function AnalysisDetail({
  scope,
  onBack,
}: {
  scope: AnalysisScopeRef;
  onBack: () => void;
}) {
  const t = useTranslations("analysis");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [tab, setTab] = useState<Tab>("overview");
  const { activeTeamId } = useTeam();
  // The version on screen when an update was requested (none yet for an overdue
  // first version), and when; polling runs until it changes or the wait times out.
  const [requested, setRequested] = useState<{ from: string | undefined; at: number } | null>(null);
  const awaitingNewer = (generatedAt: string | undefined) =>
    !!requested && generatedAt === requested.from && Date.now() - requested.at < REFRESH_TIMEOUT_MS;
  const utils = api.useUtils();

  const isCountry = scope.kind === "country";
  const locationIds = isCountry ? [scope.countryId] : scope.created.locationIds;
  const name = isCountry ? scope.countryName : scope.created.name;

  const country = api.analysis.current.useQuery(
    { countryLocationId: scope.countryId, countryName: scope.countryName },
    {
      enabled: isCountry,
      staleTime: 5 * 60_000,
      refetchInterval: (q) => (awaitingNewer(q.state.data?.crisis.generatedAt) ? REFRESH_POLL_MS : false),
    },
  );
  const created = api.analysis.forFrame.useQuery(
    isCountry
      ? { locationIds: ["-"], windowStart: new Date(0).toISOString(), name: "-" }
      : {
          locationIds: scope.created.locationIds,
          eventTypes: scope.created.eventTypes,
          needSectors: scope.created.needSectors,
          windowStart: scope.created.windowStart,
          name,
        },
    {
      enabled: !isCountry,
      staleTime: 5 * 60_000,
      // An overdue first version stops polling until someone requests it again.
      refetchInterval: (q) =>
        !q.state.data
          ? !isCountry && generationOverdue(scope.created, now) && !awaitingNewer(undefined)
            ? false
            : GENERATING_POLL_MS
          : awaitingNewer(q.state.data.crisis.generatedAt)
            ? REFRESH_POLL_MS
            : false,
    },
  );
  const analysis = isCountry ? country : created;
  const data = analysis.data;
  const waiting = awaitingNewer(data?.crisis.generatedAt);

  // The requested version landed: refresh the landing list so its status matches.
  const landedAt = data?.crisis.generatedAt;
  useEffect(() => {
    if (!requested || !landedAt || landedAt === requested.from) return;
    setRequested(null);
    void utils.analysis.scopes.invalidate();
  }, [requested, landedAt, utils]);

  // A country analysis runs weekly; a created one on its own cadence, or only on request when paused.
  const cadence = isCountry ? "weekly" : scope.created.enabled ? scope.created.cadence : "manual";
  const stale = !!data && isStale(data.crisis.generatedAt, cadence, now);
  // A created analysis is a rolling frame from its start.
  const createdFrame: RefreshFrame | null = isCountry
    ? null
    : {
        locationIds: scope.created.locationIds,
        eventTypes: scope.created.eventTypes,
        needSectors: scope.created.needSectors,
        windowStart: scope.created.windowStart,
        windowEnd: null,
        teamId: activeTeamId,
      };
  const refreshFrame: RefreshFrame | null = !data
    ? null
    : isCountry
      ? {
          locationIds: data.scope.locationIds,
          eventTypes: [],
          needSectors: [],
          windowStart: data.scope.windowStart,
          windowEnd: data.scope.windowEnd,
          teamId: null,
        }
      : createdFrame;
  // No first version long after creation: the run was likely dropped, so offer a retry.
  const overdue = !isCountry && !data && !waiting && generationOverdue(scope.created, now);

  // Stock breakdowns come from one location's aggregation; a multi-district
  // scope falls back to the analysis' own figures.
  const figures = api.analysis.figures.useQuery(
    { locationId: locationIds[0] ?? "" },
    { enabled: locationIds.length === 1, staleTime: 5 * 60_000 },
  );
  const since = data?.scope.windowStart;
  const events = api.analysis.events.useQuery(
    { locationIds, from: since ?? "" },
    { enabled: !!since, staleTime: 5 * 60_000 },
  );

  const openSources = () => setTab("sources");
  const eventCitations = data?.eventSourceIds.length ?? 0;
  const reportCitations = (data?.sources.length ?? 0) - eventCitations;

  let body: React.ReactNode;
  if (analysis.isLoading) {
    body = (
      <Center mih="40vh">
        <Loader size="sm" />
      </Center>
    );
  } else if (analysis.isError) {
    body = <Notice text={t("error")} />;
  } else if (!data) {
    body = isCountry ? (
      <Notice title={t("empty.title")} text={t("empty.description", { scope: name })} />
    ) : overdue && createdFrame ? (
      <Stack gap={12}>
        <Notice title={t("generating.overdueTitle")} text={t("generating.overdueDescription")} testId="analysis-overdue" />
        <Center>
          <RefreshButton
            frame={createdFrame}
            waiting={false}
            onRequested={() => setRequested({ from: undefined, at: Date.now() })}
          />
        </Center>
      </Stack>
    ) : (
      <Notice title={t("generating.title")} text={t("generating.description")} loading testId="analysis-generating" />
    );
  } else {
    body = (
      <>
        <Tabs value={tab} onChange={(v) => setTab((v as Tab) ?? "overview")} mb={24} styles={{ tab: { fontSize: 14 } }}>
          <Tabs.List>
            <Tabs.Tab value="overview">{t("tabs.overview")}</Tabs.Tab>
            <Tabs.Tab value="needs">{t("tabs.needs")}</Tabs.Tab>
            <Tabs.Tab value="sources">{t("tabs.sources")}</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {tab === "overview" && (
          <>
            <Box mb={24}>
              <AiSummaryCard data={data} onOpenSources={openSources} previewSentences={2} />
              <KeyFindings items={data.keyFindings} sources={data.sources} onOpenSources={openSources} />
            </Box>
            <AnalysisKpis data={data} figures={figures.data} scopeName={name} />
            <ScopeMap
              countryId={scope.countryId}
              countryName={scope.countryName}
              scopeName={name}
              areaIds={isCountry ? [] : locationIds}
              since={data.scope.windowStart}
              events={events.data}
            />
            <ContextRisks risks={data.contextRisks} sources={data.sources} onOpenSources={openSources} />
            {/* A country has too many events for the timeline to read. */}
            {!isCountry && (
              <EventsTimeline
                events={events.data?.items ?? []}
                totalCount={events.data?.totalCount ?? 0}
                start={data.scope.windowStart}
              />
            )}
            <HazardsSection data={data} onOpenSources={openSources} />
            <DisplacementSection data={data} onOpenSources={openSources} />
            <ForecastSection data={data} onOpenSources={openSources} />
          </>
        )}
        {tab === "needs" && <AnalysisNeeds sectors={data.sectors} sources={data.sources} scopeName={name} />}
        {tab === "sources" && (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={16}>
            <Box>
              <Text fw={600} c="var(--color-text-primary)" mb={12} style={{ fontSize: 14 }}>
                {t("sources.title")}
              </Text>
              <SituationSources sources={data.sources} />
            </Box>
            <EventsList events={events.data} />
          </SimpleGrid>
        )}
      </>
    );
  }

  return (
    <Box>
      <UnstyledButton onClick={onBack} mb={12} data-testid="analysis-back">
        <Group gap={6}>
          <IconArrowLeft size={14} color="var(--color-text-secondary)" />
          <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
            {t("home.back")}
          </Text>
        </Group>
      </UnstyledButton>

      <Group justify="space-between" align="flex-start" mb={data ? 8 : 24} wrap="nowrap">
        <Box style={{ minWidth: 0 }}>
          <Badge size="sm" radius="sm" mb={8} style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)" }}>
            {isCountry ? t("scope.country") : t("scope.created")}
          </Badge>
          <Title order={2} c="var(--color-text-primary)" style={{ fontSize: 26, lineHeight: 1.15 }}>
            {name}
          </Title>
        </Box>
        {data && refreshFrame && (
          <Group gap={8} wrap="nowrap">
            <RefreshButton
              frame={refreshFrame}
              waiting={waiting}
              onRequested={() => setRequested({ from: data.crisis.generatedAt, at: Date.now() })}
            />
            <CreateReportButton
              data={data}
              figures={figures.data}
              events={events.data}
              scopeName={name}
              countryId={scope.countryId}
              areaIds={isCountry ? [] : locationIds}
              isCountry={isCountry}
            />
          </Group>
        )}
      </Group>

      {data && (
        <Group gap={12} mb={24} data-testid="analysis-meta">
          <Badge
            size="md"
            radius="xl"
            leftSection={<Box style={{ width: 7, height: 7, borderRadius: "50%", background: stale ? "var(--color-warning)" : "var(--color-success)" }} />}
            style={{ background: "var(--color-bg-muted)", color: "var(--color-text-primary)", textTransform: "none", fontWeight: 500 }}
          >
            {t("meta.updated", { relative: format.relativeTime(new Date(data.crisis.generatedAt), now) })}
          </Badge>
          {stale && (
            <Badge
              size="md"
              radius="xl"
              data-testid="analysis-stale"
              style={{ background: "var(--color-warning-light)", color: "var(--color-warning)", textTransform: "none", fontWeight: 500 }}
            >
              {t("meta.stale")}
            </Badge>
          )}
          <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
            {/* A closed frame (e.g. last year's country analysis) states its end date. */}
            {data.scope.windowEnd && Date.parse(data.scope.windowEnd) < now.getTime()
              ? t("meta.period", {
                  start: format.dateTime(new Date(data.scope.windowStart), { day: "numeric", month: "short", year: "numeric" }),
                  end: format.dateTime(new Date(data.scope.windowEnd), { day: "numeric", month: "short", year: "numeric" }),
                })
              : t("meta.covers", {
                  start: format.dateTime(new Date(data.scope.windowStart), { day: "numeric", month: "short", year: "numeric" }),
                })}
          </Text>
          {data.crisis.freshestSourceAt && (
            <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
              {t("meta.asOf", {
                date: format.dateTime(new Date(data.crisis.freshestSourceAt), { day: "numeric", month: "short", year: "numeric" }),
              })}
            </Text>
          )}
          <UnstyledButton onClick={openSources}>
            <Text c="var(--color-text-secondary)" style={{ fontSize: 13, textDecoration: "underline" }}>
              {t("meta.builtFrom", { reports: reportCitations, events: eventCitations })}
            </Text>
          </UnstyledButton>
        </Group>
      )}

      {waiting && (
        <Alert color="blue" variant="light" mb={24} data-testid="analysis-refresh-requested">
          {t("refresh.requested")}
        </Alert>
      )}

      {body}
    </Box>
  );
}
