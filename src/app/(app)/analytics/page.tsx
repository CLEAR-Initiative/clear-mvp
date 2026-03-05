"use client";

import { Box, Text, SimpleGrid } from "@mantine/core";
import { PageHeader } from "~/components/ui/page-header";
import { StatsGrid } from "~/components/ui/stats-grid";
import { heroStats } from "./_components/analytics-data";
import { AlertsOverTimeChart } from "./_components/alerts-over-time-chart";
import { AlertRelevanceChart } from "./_components/alert-relevance-chart";
import { MonthlyUsersChart } from "./_components/monthly-users-chart";
import { ResponseTimeChart } from "./_components/response-time-chart";
import { DataSourcesChart } from "./_components/data-sources-chart";
import { PipelineHealthCards } from "./_components/pipeline-health-cards";
import { GeographicCoverage } from "./_components/geographic-coverage";

export default function AnalyticsPage() {
  return (
    <Box>
      <PageHeader
        title="Platform Analytics"
        breadcrumbs={["CLEAR", "Analytics"]}
      />

      <Box p={24}>
        <Text size="xs" c="#737373" mb={8}>
          Reporting period: October 2025 – March 2026
        </Text>

        <StatsGrid stats={heroStats} cols={5} />

        {/* Row 1: Alert Effectiveness */}
        <SimpleGrid cols={2} spacing={16} mb={24}>
          <AlertsOverTimeChart />
          <AlertRelevanceChart />
        </SimpleGrid>

        {/* Row 2: Engagement & Speed */}
        <SimpleGrid cols={2} spacing={16} mb={24}>
          <MonthlyUsersChart />
          <ResponseTimeChart />
        </SimpleGrid>

        {/* Row 3: Data Infrastructure */}
        <SimpleGrid cols={2} spacing={16} mb={24}>
          <DataSourcesChart />
          <PipelineHealthCards />
        </SimpleGrid>

        {/* Row 4: Geographic Coverage */}
        <GeographicCoverage />
      </Box>
    </Box>
  );
}
