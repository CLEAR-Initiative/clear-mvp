"use client";

import { Box, Text, Group, Badge } from "@mantine/core";
import { CardSection } from "~/components/ui/card-section";
import { geographicCoverage } from "./analytics-data";

export function GeographicCoverage() {
  return (
    <CardSection
      title="Geographic Coverage"
      subtitle="Active monitoring across 7 countries"
      noPadding
    >
      {geographicCoverage.map((item, i) => (
        <Box
          key={item.country}
          px={16}
          py={12}
          style={{
            borderBottom:
              i < geographicCoverage.length - 1
                ? "1px solid #F5F5F5"
                : undefined,
            borderLeft: `3px solid ${item.color}`,
          }}
        >
          <Group justify="space-between">
            <Group gap={12}>
              <Box
                w={8}
                h={8}
                style={{
                  borderRadius: "50%",
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <Text fw={600} style={{ fontSize: 14 }} c="#171717">
                {item.country}
              </Text>
            </Group>
            <Group gap={12}>
              <Badge
                size="sm"
                variant="light"
                style={{
                  background:
                    item.severity === "critical"
                      ? "#FEE2E2"
                      : item.severity === "high"
                        ? "#FEF3C7"
                        : item.severity === "medium"
                          ? "#FEF3C7"
                          : "#ECFDF5",
                  color: item.color,
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                {item.alerts} alert{item.alerts !== 1 ? "s" : ""}
              </Badge>
              <Text size="xs" c="#A3A3A3" style={{ minWidth: 80, textAlign: "right" }}>
                Since {item.activeSince}
              </Text>
            </Group>
          </Group>
        </Box>
      ))}
    </CardSection>
  );
}
