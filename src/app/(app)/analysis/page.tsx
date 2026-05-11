"use client";

import { useState } from "react";
import { Box, Button, Group, Loader, Select, Tabs } from "@mantine/core";
import { IconDownload, IconSparkles } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { SITUATION_ANALYSIS_SYSTEM_PROMPT } from "~/lib/prompts";
import { PageHeader } from "~/components/ui";
import { OverviewTab } from "./_components/overview-tab";
import { SectorsTab } from "./_components/sectors-tab";
import { SourcesTab } from "./_components/sources-tab";
import { CrisesTab } from "./_components/crises-tab";
import {
  SAF_COUNTRIES,
  ALL_DATA,
  fmtNumber,
  type CountryKey,
} from "./_components/saf-data";

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [safCountry, setSafCountry] = useState<CountryKey>("sudan");
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);

  const llmMutation = api.llm.query.useMutation();
  const countryData = ALL_DATA[safCountry]!;
  const countryMeta = SAF_COUNTRIES.find((c) => c.key === safCountry)!;

  const handleGenerateSummary = () => {
    const final = countryData.FINAL_NUMBERS_DATA;
    const hazards = countryData.CURRENT_HAZARDS_AND_THREATS_DATA;
    const ctx = countryData.OUTPUT_CONTEXT_RISKS_DATA;
    const risks = countryData.SHOWN_RISKS_DATA;

    const crits: string[] = [];
    (["Impact", "Humanitarian Conditions"] as const).forEach((cat) => {
      const catData = risks[cat];
      if (catData) {
        Object.entries(catData).forEach(([sector, v]) => {
          if (v.severity_scale === "CRITICAL" && !crits.includes(sector)) {
            crits.push(sector);
          }
        });
      }
    });

    llmMutation.mutate(
      {
        prompt: `You are a humanitarian analyst for NRC. Write a direct 4–5 sentence situation summary for ${countryMeta.label}. No preamble.

Figures: ${final.map((d) => `${fmtNumber(d.number)} ${d.unit}`).join(", ")}
Critical sectors: ${crits.join(", ")}
Hazards: ${hazards.slice(0, 3).join("; ")}
Context (top): ${Object.entries(ctx)
  .slice(0, 3)
  .map(([k, v]) => `${k}: ${v[0]}`)
  .join(" | ")}

4–5 sentences covering scale, most acute needs, key drivers, primary response constraint.`,
        system: SITUATION_ANALYSIS_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 400,
      },
      {
        onSuccess: (data) => setGeneratedSummary(data.response),
      },
    );
  };

  const handleCountryChange = (key: CountryKey) => {
    setSafCountry(key);
    setGeneratedSummary(null);
  };

  return (
    <Box>
      <PageHeader
        title={countryMeta.crisis}
        subtitle="Analysis"
        breadcrumbs={["CLEAR", "Analysis"]}
      >
        <Group gap={8}>
          <Select
            size="xs"
            value={safCountry}
            onChange={(v) => v && handleCountryChange(v as CountryKey)}
            data={SAF_COUNTRIES.map((c) => ({ value: c.key, label: c.label }))}
            styles={{ input: { fontSize: 12, fontWeight: 500 } }}
            w={130}
          />
          <Button
            variant="outline"
            color="gray"
            size="xs"
            leftSection={<IconDownload size={14} />}
            style={{ fontSize: 12 }}
            onClick={() => window.print()}
          >
            Export
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
              background: "var(--color-accent)",
              borderColor: "var(--color-accent)",
              fontSize: 12,
            }}
            onClick={handleGenerateSummary}
            disabled={llmMutation.isPending}
          >
            {llmMutation.isPending ? "Generating…" : "Generate Summary"}
          </Button>
        </Group>
      </PageHeader>

      <Box px={24} pt={16}>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
        >
          <Tabs.List mb={0}>
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="sectors">Sectors</Tabs.Tab>
            <Tabs.Tab value="crises">Crises</Tabs.Tab>
            <Tabs.Tab value="sources">Sources</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt={20}>
            <OverviewTab
              countryData={countryData}
              generatedSummary={generatedSummary}
              llmIsPending={llmMutation.isPending}
              onGenerateSummary={handleGenerateSummary}
            />
          </Tabs.Panel>

          <Tabs.Panel value="sectors">
            <SectorsTab countryData={countryData} />
          </Tabs.Panel>

          <Tabs.Panel value="crises" pt={20}>
            <CrisesTab countryLabel={countryMeta.label} />
          </Tabs.Panel>

          <Tabs.Panel value="sources" pt={20}>
            <SourcesTab countryKey={safCountry} />
          </Tabs.Panel>
        </Tabs>
      </Box>
    </Box>
  );
}
