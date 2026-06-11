"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Box, Group, Tabs, Text } from "@mantine/core";
import { PageHeader } from "~/components/ui";
import { ReportsTab } from "./_components/reports-tab";

export default function InsightsPage() {
  const t = useTranslations("insights");
  const tBadges = useTranslations("common.badges");
  const [activeTab, setActiveTab] = useState<string | null>("crisis");

  return (
    <Box>
      <PageHeader
        title={t("page.title")}
        subtitle={t("page.title")}
        breadcrumbs={["CLEAR", t("page.breadcrumb")]}
      />

      <Box p={24}>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          mb={24}
          styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
        >
          <Tabs.List>
            <Tabs.Tab value="crisis">{t("page.tabs.crisis")}</Tabs.Tab>
            <Tabs.Tab value="situation">
              <Group gap={6} align="center">
                {t("page.tabs.situation")}
                <Badge size="xs" variant="light" color="gray" style={{ fontSize: 10 }}>{tBadges("soon")}</Badge>
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
              {t("page.situationPlaceholder.title")}
            </Text>
            <Text size="sm" c="var(--color-text-muted)">
              {t("page.situationPlaceholder.description")}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
