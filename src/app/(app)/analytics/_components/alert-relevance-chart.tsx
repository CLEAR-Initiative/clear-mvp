"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Box, Text, Group } from "@mantine/core";
import { CardSection } from "~/components/ui/card-section";
import { alertRelevanceData } from "./analytics-data";

export function AlertRelevanceChart() {
  return (
    <CardSection
      title="Alert Relevance"
      subtitle="Quality of generated alerts"
    >
      <Box style={{ position: "relative" }}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={alertRelevanceData}
              innerRadius={70}
              outerRadius={95}
              dataKey="value"
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
            >
              {alertRelevanceData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <Box
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <Text fw={700} style={{ fontSize: 32, color: "#059669", lineHeight: 1 }}>
            82%
          </Text>
          <Text size="xs" c="#737373" mt={2}>
            Relevant
          </Text>
        </Box>
      </Box>

      {/* Legend */}
      <Group gap={16} justify="center" mt={8}>
        {alertRelevanceData.map((entry) => (
          <Group key={entry.name} gap={6}>
            <Box
              w={8}
              h={8}
              style={{ borderRadius: "50%", background: entry.color, flexShrink: 0 }}
            />
            <Text size="xs" c="#525252">
              {entry.name} ({entry.value}%)
            </Text>
          </Group>
        ))}
      </Group>
    </CardSection>
  );
}
