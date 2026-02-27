"use client";

import { Box, Text, Badge, Button, Group, Switch, Loader } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { CardSection } from "~/components/ui";
import type { DjangoDetector, DjangoFrameworkStats } from "~/lib/types/django";

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface AlertRulesTabProps {
  detectors: DjangoDetector[];
  frameworkStats: DjangoFrameworkStats | undefined;
  loading: boolean;
  ruleStates: Record<string, boolean>;
  onToggleRule: (name: string) => void;
}

export function AlertRulesTab({
  detectors,
  frameworkStats,
  loading,
  ruleStates,
  onToggleRule,
}: AlertRulesTabProps) {
  const subtitle = frameworkStats?.detectors
    ? `${frameworkStats.detectors.active} active of ${frameworkStats.detectors.total} total`
    : "Configure automatic alert triggers";

  return (
    <CardSection
      title="Automated Alert Rules (Detectors)"
      subtitle={subtitle}
      action={
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          style={{
            background: "#E85D3D",
            borderColor: "#E85D3D",
            fontSize: 13,
          }}
        >
          New Rule
        </Button>
      }
      noPadding
    >
      {loading ? (
        <Box p={32} style={{ textAlign: "center" }}>
          <Loader size="sm" />
        </Box>
      ) : (
        detectors.map((detector, i) => (
          <Box
            key={detector.id}
            px={16}
            py={14}
            className={
              i < detectors.length - 1 ? "border-b border-[#E5E5E5]" : ""
            }
          >
            <Group justify="space-between">
              <Box style={{ flex: 1 }}>
                <Group gap={8} mb={4}>
                  <Text fw={600} size="sm" c="#171717">
                    {detector.name}
                  </Text>
                  <Badge
                    size="xs"
                    style={{ background: "#EFF6FF", color: "#2563EB" }}
                  >
                    {detector.detection_count} detections
                  </Badge>
                  <Badge size="xs" variant="light" c="#737373">
                    {detector.run_count} runs
                  </Badge>
                </Group>
                <Text size="xs" c="#737373">
                  {detector.description ?? detector.class_name}
                </Text>
                {detector.last_run && (
                  <Text size="xs" c="#A3A3A3" mt={2}>
                    Last run: {formatTimeAgo(detector.last_run)}
                  </Text>
                )}
              </Box>
              <Switch
                checked={ruleStates[detector.name] ?? detector.active}
                onChange={() => onToggleRule(detector.name)}
                color="#E85D3D"
                size="sm"
              />
            </Group>
          </Box>
        ))
      )}
    </CardSection>
  );
}
