"use client";

import { useState } from "react";
import { Badge, Box, Group, Tabs, Text } from "@mantine/core";
import { PageHeader } from "~/components/ui";
import { ReportsTab } from "./_components/reports-tab";

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("crisis");

  return (
    <Box>
      <PageHeader
        title="Insights"
        subtitle="Insights"
        breadcrumbs={["CLEAR", "Insights"]}
      />

      <Box p={24}>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          mb={24}
          styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
        >
          <Tabs.List>
            <Tabs.Tab value="crisis">Crisis Overview</Tabs.Tab>
            <Tabs.Tab value="situation">
              <Group gap={6} align="center">
                Situation Analysis
                <Badge size="xs" variant="light" color="gray" style={{ fontSize: 10 }}>Soon</Badge>
              </Group>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {activeTab === "crisis" && (
          <ReportsTab
            selectedCountry="Sudan"
            selectedRegion="All Regions"
            summaryStats={{ critical: 0, total: 0, types: [] }}
            realSituationItems={null}
          />
        )}

        {activeTab === "situation" && (
          <Box
            p={32}
            style={{
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-white)",
              textAlign: "center",
            }}
          >
            <Text fw={600} c="var(--color-text-primary)" mb={8}>
              Situation Analysis
            </Text>
            <Text size="sm" c="var(--color-text-muted)">
              AI-generated situation reports coming soon.
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
