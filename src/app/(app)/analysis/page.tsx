"use client";

import { useState, useMemo } from "react";
import { Box, Button, Group, Loader, Tabs } from "@mantine/core";
import { IconDownload, IconSparkles } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { SITUATION_ANALYSIS_SYSTEM_PROMPT } from "~/lib/prompts";
import { mapSeverity } from "~/lib/types/graphql";
import type { GqlAlert } from "~/lib/types/graphql";
import { countries, dateOptions, countryConfig } from "~/lib/constants/country-config";
import { PageHeader, FilterBar } from "~/components/ui";
import { ExecutiveSummary } from "./_components/executive-summary";
import { ReportsTab } from "./_components/reports-tab";
import { ScenariosTab } from "./_components/scenarios-tab";
import { ImpactTab } from "./_components/impact-tab";
import { InsightsTab } from "./_components/insights-tab";

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<string | null>("reports");
  const [generatedAnalysis, setGeneratedAnalysis] = useState<string | null>(
    null,
  );
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedDate, setSelectedDate] = useState("Feb 2026");

  const { activeTeamId } = useTeam();
  const alertsQuery = api.alerts.getAlerts.useQuery({ activeOnly: true, teamId: activeTeamId });
  const statsQuery = api.alerts.getStats.useQuery({ teamId: activeTeamId });
  const llmMutation = api.llm.query.useMutation();

  const allAlerts = alertsQuery.data?.alerts ?? [];
  const overview = statsQuery.data?.stats?.overview;

  // Derive real situation items from alerts
  const realSituationItems = useMemo(() => {
    if (allAlerts.length === 0) return null;
    return allAlerts.slice(0, 5).map((a) => {
      const loc = (a.event.generalLocation ?? a.event.originLocation)?.name ?? "Unknown";
      const sev = mapSeverity(a.event.severity);
      const title = a.event.title ?? a.event.types[0] ?? "Event";
      return `${title} — ${loc} (${sev} severity)${a.event.description ? `: ${a.event.description.slice(0, 120)}` : ""}`;
    });
  }, [allAlerts]);

  // Summary stats from real data
  const summaryStats = useMemo(() => {
    const critical = allAlerts.filter((a) => a.event.rank >= 4).length;
    const total = allAlerts.length;
    const types = [
      ...new Set(allAlerts.flatMap((a) => a.event.types)),
    ];
    return { critical, total, types };
  }, [allAlerts]);

  const handleGenerateAnalysis = () => {
    if (allAlerts.length === 0) return;
    const alertContext = allAlerts
      .map(
        (a) =>
          `- ${a.event.title ?? a.event.types[0] ?? "Event"} (rank ${a.event.rank.toFixed(1)}): ${a.event.description?.slice(0, 150) ?? ""}`,
      )
      .join("\n");
    llmMutation.mutate(
      {
        prompt: `Analyze the following active humanitarian alerts and generate a comprehensive situation analysis:\n\n${alertContext}\n\nProvide:\n1. Executive summary\n2. Key findings\n3. Priority recommendations\n4. Risk assessment`,
        system: SITUATION_ANALYSIS_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 1000,
      },
      {
        onSuccess: (data) => setGeneratedAnalysis(data.response),
      },
    );
  };

  return (
    <Box>
      {/* Header */}
      <PageHeader
        title="AI-Powered Analysis"
        subtitle="Analysis"
        breadcrumbs={["CLEAR", "Analysis"]}
        loading={alertsQuery.isLoading}
      >
        <FilterBar
          country={selectedCountry}
          onCountryChange={(v) => {
            setSelectedCountry(v);
            setSelectedRegion("All Regions");
          }}
          region={selectedRegion}
          onRegionChange={setSelectedRegion}
          countries={countries}
          regions={countryConfig[selectedCountry]?.regions ?? ["All Regions"]}
          date={selectedDate}
          onDateChange={setSelectedDate}
          dateOptions={dateOptions}
        />
        <Group gap={8}>
          <Button
            variant="outline"
            color="gray"
            size="xs"
            leftSection={<IconDownload size={14} />}
            style={{ fontSize: 13 }}
          >
            Export Report
          </Button>
          <Button
            size="xs"
            leftSection={
              llmMutation.isPending ? (
                <Loader size={12} color="white" />
              ) : (
                <IconSparkles size={14} />
              )
            }
            style={{
              background: "#E85D3D",
              borderColor: "#E85D3D",
              fontSize: 13,
            }}
            onClick={handleGenerateAnalysis}
            disabled={llmMutation.isPending}
          >
            {llmMutation.isPending ? "Generating..." : "Generate Analysis"}
          </Button>
        </Group>
      </PageHeader>

      <Box p={24}>
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          mb={24}
          styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
        >
          <Tabs.List>
            <Tabs.Tab value="reports">Situation Reports</Tabs.Tab>
            <Tabs.Tab value="scenarios">Scenario Planning</Tabs.Tab>
            <Tabs.Tab value="impact">Impact Assessment</Tabs.Tab>
            <Tabs.Tab value="insights">AI Insights</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <ExecutiveSummary
          allAlerts={allAlerts}
          summaryStats={summaryStats}
          overview={overview}
          alertsDataUpdatedAt={alertsQuery.dataUpdatedAt}
          generatedAnalysis={generatedAnalysis}
          llmMutation={{
            isPending: llmMutation.isPending,
            isError: llmMutation.isError,
            data: llmMutation.data,
          }}
          selectedCountry={selectedCountry}
        />

        {activeTab === "reports" && (
          <ReportsTab
            selectedCountry={selectedCountry}
            selectedRegion={selectedRegion}
            summaryStats={summaryStats}
            realSituationItems={realSituationItems}
          />
        )}

        {activeTab === "scenarios" && <ScenariosTab />}

        {activeTab === "impact" && <ImpactTab />}

        {activeTab === "insights" && <InsightsTab />}
      </Box>
    </Box>
  );
}
