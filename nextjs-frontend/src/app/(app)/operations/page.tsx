"use client";

import { useState } from "react";
import { Box, Button, Tabs } from "@mantine/core";
import { IconUsers, IconCircleCheck } from "@tabler/icons-react";
import { PageHeader, StatsGrid } from "~/components/ui";
import { stats } from "./_components/operations-data";
import { ActiveOpsTab } from "./_components/active-ops-tab";
import { StrategyTab } from "./_components/strategy-tab";
import { ResourcesTab } from "./_components/resources-tab";
import { CoordinationTab } from "./_components/coordination-tab";

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("active");

  return (
    <Box>
      <PageHeader title="Operations Center">
        <Button
          variant="outline"
          color="gray"
          size="xs"
          leftSection={<IconUsers size={14} />}
          style={{ fontSize: 13 }}
        >
          Team Directory
        </Button>
        <Button
          size="xs"
          leftSection={<IconCircleCheck size={14} />}
          style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}
        >
          Activate Response
        </Button>
      </PageHeader>

      <Box p={24}>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          mb={24}
          styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
        >
          <Tabs.List>
            <Tabs.Tab value="active">Active Operations</Tabs.Tab>
            <Tabs.Tab value="strategy">Response Strategy</Tabs.Tab>
            <Tabs.Tab value="resources">Resources & Budget</Tabs.Tab>
            <Tabs.Tab value="coordination">Coordination</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <StatsGrid stats={stats} />

        {activeTab === "active" && <ActiveOpsTab />}
        {activeTab === "strategy" && <StrategyTab />}
        {activeTab === "resources" && <ResourcesTab />}
        {activeTab === "coordination" && <CoordinationTab />}
      </Box>
    </Box>
  );
}
