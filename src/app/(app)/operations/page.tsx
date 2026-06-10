"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Button, Tabs } from "@mantine/core";
import { IconUsers, IconCircleCheck } from "@tabler/icons-react";
import { PageHeader, StatsGrid, type StatItem } from "~/components/ui";
import { stats } from "./_components/operations-data";
import { ActiveOpsTab } from "./_components/active-ops-tab";
import { StrategyTab } from "./_components/strategy-tab";
import { ResourcesTab } from "./_components/resources-tab";
import { CoordinationTab } from "./_components/coordination-tab";

export default function OperationsPage() {
  const t = useTranslations("operations");
  const [activeTab, setActiveTab] = useState<string | null>("active");

  const statItems: StatItem[] = stats.map((s) => ({ ...s, label: t(`stats.${s.labelKey}`) }));

  return (
    <Box>
      <PageHeader title={t("header.title")}>
        <Button
          variant="outline"
          color="gray"
          size="xs"
          leftSection={<IconUsers size={14} />}
          style={{ fontSize: 13 }}
        >
          {t("header.teamDirectory")}
        </Button>
        <Button
          size="xs"
          leftSection={<IconCircleCheck size={14} />}
          style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}
        >
          {t("header.activateResponse")}
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
            <Tabs.Tab value="active">{t("tabs.active")}</Tabs.Tab>
            <Tabs.Tab value="strategy">{t("tabs.strategy")}</Tabs.Tab>
            <Tabs.Tab value="resources">{t("tabs.resources")}</Tabs.Tab>
            <Tabs.Tab value="coordination">{t("tabs.coordination")}</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <StatsGrid stats={statItems} />

        {activeTab === "active" && <ActiveOpsTab />}
        {activeTab === "strategy" && <StrategyTab />}
        {activeTab === "resources" && <ResourcesTab />}
        {activeTab === "coordination" && <CoordinationTab />}
      </Box>
    </Box>
  );
}
