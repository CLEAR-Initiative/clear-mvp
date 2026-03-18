"use client";

import {
  Anchor,
  Avatar,
  Badge,
  Box,
  Card,
  Group,
  Loader,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconExternalLink,
  IconLock,
  IconToggleLeft,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/components/feature-flags-provider";
import { TIER_LABELS } from "~/lib/constants/feature-flags";
import { PageHeader, StatsGrid } from "~/components/ui";
import type { StatItem } from "~/components/ui";
import { colors, fontSizesPx } from "~/lib/tokens";

/* ─── Shared token shortcuts ──────────────────────────────────── */
const border = `1px solid ${colors.border}`;

/* ─── Features tab ────────────────────────────────────────────── */

const tierColors: Record<number, string> = {
  1: colors.textSecondary,
  2: colors.success,
  3: colors.warning,
  4: colors.critical,
};

const tierBadgeColors: Record<number, string> = {
  1: "gray",
  2: "green",
  3: "yellow",
  4: "red",
};

function FeaturesPanel() {
  const { data: features, isLoading } = api.featureFlags.getAll.useQuery(undefined, {
    staleTime: 30_000,
  });
  const { toggle } = useFeatureFlags();

  if (isLoading || !features) {
    return (
      <Box p={24} style={{ display: "flex", justifyContent: "center" }}>
        <Loader />
      </Box>
    );
  }

  const enabledCount = features.filter((f) => f.enabled).length;
  const disabledCount = features.filter((f) => !f.enabled).length;

  const stats: StatItem[] = [
    { label: "Total Features", value: String(features.length) },
    { label: "Enabled", value: String(enabledCount), color: colors.success },
    { label: "Disabled", value: String(disabledCount), color: colors.critical },
  ];

  const tiers = [1, 2, 3, 4] as const;
  const grouped = tiers.map((tier) => ({
    tier,
    label: TIER_LABELS[tier] ?? `Tier ${tier}`,
    features: features.filter((f) => f.tier === tier),
  }));

  return (
    <Box p={24}>
      <StatsGrid stats={stats} cols={3} mb={24} />

      <Stack gap={24}>
        {grouped.map((group) => (
          <Card key={group.tier} p={0} style={{ border, overflow: "hidden" }}>
            <Group
              px={20}
              py={12}
              justify="space-between"
              style={{ background: colors.bgPrimary, borderBottom: border }}
            >
              <Group gap={10}>
                <Box
                  w={4}
                  style={{ alignSelf: "stretch", background: tierColors[group.tier], borderRadius: 2 }}
                />
                <Text fw={600} c={colors.textPrimary} style={{ fontSize: fontSizesPx.lg }}>
                  {group.label}
                </Text>
                <Badge size="sm" color={tierBadgeColors[group.tier]} variant="light">
                  {group.features.length} features
                </Badge>
              </Group>
              {group.tier === 1 && (
                <Group gap={4}>
                  <IconLock size={14} style={{ color: colors.textMuted }} />
                  <Text size="xs" c={colors.textMuted}>Always enabled</Text>
                </Group>
              )}
            </Group>

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
                      borderBottom: i < group.features.length - 1 ? border : undefined,
                      opacity: isCore ? 0.7 : 1,
                    }}
                  >
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group gap={8} mb={2}>
                        <Text fw={500} c={colors.textPrimary} style={{ fontSize: fontSizesPx.lg }}>
                          {feature.label}
                        </Text>
                        {isCore && <IconLock size={14} style={{ color: colors.textMuted }} />}
                      </Group>
                      <Group gap={8}>
                        <Text c={colors.textSecondary} style={{ fontSize: fontSizesPx.md }}>
                          {feature.description}
                        </Text>
                        {feature.route && (
                          <Anchor
                            component={Link}
                            href={feature.route}
                            c={colors.textMuted}
                            style={{ fontSize: fontSizesPx.sm, display: "inline-flex", alignItems: "center", gap: 3 }}
                          >
                            {feature.route}
                            <IconExternalLink size={11} />
                          </Anchor>
                        )}
                      </Group>
                    </Box>
                    <Switch
                      checked={feature.enabled}
                      disabled={isCore}
                      onChange={(e) => toggle(feature.key, e.currentTarget.checked)}
                      size="md"
                      color={colors.accent}
                      styles={{ track: { cursor: isCore ? "not-allowed" : "pointer" } }}
                    />
                  </Group>
                );
              })}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

/* ─── Users tab ───────────────────────────────────────────────── */

const roleColor: Record<string, string> = {
  admin: "orange",
  viewer: "blue",
  user: "gray",
};

function UsersPanel() {
  const { data, isLoading } = api.auth.listUsers.useQuery(undefined, { staleTime: 30_000 });

  if (isLoading) {
    return (
      <Box p={24} style={{ display: "flex", justifyContent: "center" }}>
        <Loader />
      </Box>
    );
  }

  if (data?.error) {
    return (
      <Box p={24}>
        <Text c={colors.textMuted} style={{ fontSize: fontSizesPx.base }}>
          {data.error === "Unauthorized"
            ? "You need admin privileges to view user management."
            : data.error}
        </Text>
      </Box>
    );
  }

  const users = data?.users ?? [];
  const adminCount  = users.filter((u) => u.role === "admin").length;
  const activeCount = users.filter((u) => u.isActive).length;

  const stats: StatItem[] = [
    { label: "Total Users",   value: String(users.length) },
    { label: "Admins",        value: String(adminCount),  color: colors.accent },
    { label: "Active",        value: String(activeCount), color: colors.success },
  ];

  return (
    <Box p={24}>
      <StatsGrid stats={stats} cols={3} mb={24} />

      <Card p={0} style={{ border, overflow: "hidden" }}>
        <Group
          px={20}
          py={12}
          style={{ background: colors.bgPrimary, borderBottom: border }}
        >
          <Text fw={600} c={colors.textPrimary} style={{ fontSize: fontSizesPx.lg }}>
            All users
          </Text>
          <Badge size="sm" variant="light" color="gray">
            {users.length}
          </Badge>
        </Group>

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr style={{ background: colors.bgPrimary }}>
              <Table.Th style={{ fontSize: fontSizesPx.sm, color: colors.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>User</Table.Th>
              <Table.Th style={{ fontSize: fontSizesPx.sm, color: colors.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</Table.Th>
              <Table.Th style={{ fontSize: fontSizesPx.sm, color: colors.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</Table.Th>
              <Table.Th style={{ fontSize: fontSizesPx.sm, color: colors.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c={colors.textMuted} ta="center" py={24} style={{ fontSize: fontSizesPx.base }}>
                    No users found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              users.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Group gap={10}>
                      <Avatar
                        src={user.image}
                        size={32}
                        radius="xl"
                        color="accent"
                      >
                        {user.name?.[0]?.toUpperCase() ?? "?"}
                      </Avatar>
                      <Box>
                        <Text fw={500} style={{ fontSize: fontSizesPx.base, color: colors.textPrimary }}>
                          {user.name}
                        </Text>
                        <Text style={{ fontSize: fontSizesPx.sm, color: colors.textMuted }}>
                          {user.emailVerified ? "Verified" : "Unverified"}
                        </Text>
                      </Box>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      variant="light"
                      color={roleColor[user.role] ?? "gray"}
                    >
                      {user.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text style={{ fontSize: fontSizesPx.base, color: colors.textSecondary }}>
                      {user.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      variant="dot"
                      color={user.isActive ? "green" : "gray"}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */

export default function AdminPage() {
  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Admin"
        subtitle="Platform configuration and user management"
      />

      <Tabs
        defaultValue="users"
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <Tabs.List
          px={24}
          style={{
            background: colors.bgWhite,
            borderBottom: border,
            flexShrink: 0,
          }}
        >
          <Tabs.Tab
            value="users"
            leftSection={<IconUsers size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            Users
          </Tabs.Tab>
          <Tabs.Tab
            value="features"
            leftSection={<IconToggleLeft size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            Features
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users" style={{ flex: 1, overflowY: "auto" }}>
          <UsersPanel />
        </Tabs.Panel>

        <Tabs.Panel value="features" style={{ flex: 1, overflowY: "auto" }}>
          <FeaturesPanel />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
