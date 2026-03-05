"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Box, Text, Group } from "@mantine/core";
import { IconTrendingDown } from "@tabler/icons-react";
import { CardSection } from "~/components/ui/card-section";
import { responseTimeData } from "./analytics-data";

export function ResponseTimeChart() {
  return (
    <CardSection
      title="Response Time"
      subtitle="Average hours from alert to action"
    >
      <Group gap={16} mb={16}>
        <Box>
          <Text fw={700} style={{ fontSize: 32, lineHeight: 1 }} c="#171717">
            12h
          </Text>
          <Text size="xs" c="#737373" mt={4}>
            Current avg response time
          </Text>
        </Box>
        <Group gap={4}>
          <IconTrendingDown size={16} color="#059669" />
          <Text size="xs" c="#059669" fw={600}>
            75% faster than Oct
          </Text>
        </Group>
      </Group>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={responseTimeData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#737373" }}
            axisLine={{ stroke: "#E5E5E5" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#737373" }}
            axisLine={false}
            tickLine={false}
            unit="h"
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: "1px solid #E5E5E5",
              borderRadius: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            formatter={(value) => [`${value}h`, "Response Time"]}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#059669"
            fill="#ECFDF5"
            strokeWidth={2}
            name="Hours"
          />
        </AreaChart>
      </ResponsiveContainer>
    </CardSection>
  );
}
