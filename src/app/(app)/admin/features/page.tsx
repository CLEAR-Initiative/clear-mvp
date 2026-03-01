"use client";

import { Box, Text, Switch, Badge, Stack, Group, Card, Loader } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/components/feature-flags-provider";
import { TIER_LABELS } from "~/lib/constants/feature-flags";
import { PageHeader, StatsGrid } from "~/components/ui";
import type { StatItem } from "~/components/ui";

const tierColors: Record<number, string> = {
  1: "#525252",
  2: "#059669",
  3: "#D97706",
  4: "#DC2626",
};

const tierBadgeColors: Record<number, string> = {
  1: "gray",
  2: "green",
  3: "yellow",
  4: "red",
};

export default function AdminFeaturesPage() {
  const { data: features, isLoading } = api.featureFlags.getAll.useQuery(undefined, {
    staleTime: 30_000,
  });
  const { toggle } = useFeatureFlags();

  if (isLoading || !features) {
    return (
      <Box>
        <PageHeader title="Feature Management" subtitle="Control which features are visible in the platform" />
        <Box p={24} style={{ display: "flex", justifyContent: "center" }}>
          <Loader />
        </Box>
      </Box>
    );
  }

  const enabledCount = features.filter((f) => f.enabled).length;
  const disabledCount = features.filter((f) => !f.enabled).length;

  const stats: StatItem[] = [
    { label: "Total Features", value: String(features.length) },
    { label: "Enabled", value: String(enabledCount), color: "#059669" },
    { label: "Disabled", value: String(disabledCount), color: "#DC2626" },
  ];

  // Group features by tier
  const tiers = [1, 2, 3, 4] as const;
  const grouped = tiers.map((tier) => ({
    tier,
    label: TIER_LABELS[tier] ?? `Tier ${tier}`,
    features: features.filter((f) => f.tier === tier),
  }));

  return (
    <Box>
      <PageHeader
        title="Feature Management"
        subtitle="Control which features are visible in the platform"
      />

      <Box p={24}>
        <StatsGrid stats={stats} cols={3} mb={24} />

        <Stack gap={24}>
          {grouped.map((group) => (
            <Card
              key={group.tier}
              p={0}
              style={{ border: "1px solid #E5E5E5", overflow: "hidden" }}
            >
              {/* Section header */}
              <Group
                px={20}
                py={12}
                justify="space-between"
                style={{
                  background: "#FAFAFA",
                  borderBottom: "1px solid #E5E5E5",
                }}
              >
                <Group gap={10}>
                  <Box
                    w={4}
                    style={{
                      alignSelf: "stretch",
                      background: tierColors[group.tier],
                      borderRadius: 2,
                    }}
                  />
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                    {group.label}
                  </Text>
                  <Badge
                    size="sm"
                    color={tierBadgeColors[group.tier]}
                    variant="light"
                  >
                    {group.features.length} features
                  </Badge>
                </Group>
                {group.tier === 1 && (
                  <Group gap={4}>
                    <IconLock size={14} style={{ color: "#A3A3A3" }} />
                    <Text size="xs" c="#A3A3A3">
                      Always enabled
                    </Text>
                  </Group>
                )}
              </Group>

              {/* Feature rows */}
              <Stack gap={0}>
                {group.features.map((feature, i) => {
                  const isCore = feature.tier === 1;
                  return (
                    <Group
                      key={feature.key}
                      px={20}
                      py={14}
                      justify="space-between"
                      wrap="nowrap"
                      style={{
                        borderBottom:
                          i < group.features.length - 1
                            ? "1px solid #F0F0F0"
                            : undefined,
                        opacity: isCore ? 0.7 : 1,
                      }}
                    >
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap={8} mb={2}>
                          <Text fw={500} c="#171717" style={{ fontSize: 14 }}>
                            {feature.label}
                          </Text>
                          {isCore && (
                            <IconLock
                              size={14}
                              style={{ color: "#A3A3A3" }}
                            />
                          )}
                        </Group>
                        <Text c="#737373" style={{ fontSize: 12 }}>
                          {feature.description}
                        </Text>
                      </Box>
                      <Switch
                        checked={feature.enabled}
                        disabled={isCore}
                        onChange={(e) =>
                          toggle(feature.key, e.currentTarget.checked)
                        }
                        size="md"
                        color="#E85D3D"
                        styles={{
                          track: {
                            cursor: isCore ? "not-allowed" : "pointer",
                          },
                        }}
                      />
                    </Group>
                  );
                })}
              </Stack>
            </Card>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
