"use client";

import { useState } from "react";
import { Box, Button, Group, Select, Tabs } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui";
import { OverviewTab } from "./_components/overview-tab";
import { SectorsTab } from "./_components/sectors-tab";
import { SourcesTab } from "./_components/sources-tab";
import { CrisesTab } from "./_components/crises-tab";
import {
  SAF_COUNTRIES,
  ALL_DATA,
  type CountryKey,
} from "./_components/saf-data";

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [safCountry, setSafCountry] = useState<CountryKey>("sudan");

  const countryData = ALL_DATA[safCountry]!;
  const countryMeta = SAF_COUNTRIES.find((c) => c.key === safCountry)!;

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
            onChange={(v) => v && setSafCountry(v as CountryKey)}
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
              generatedSummary={null}
              llmIsPending={false}
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
