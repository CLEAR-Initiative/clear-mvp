"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Card,
  Text,
  Group,
  Badge,
  Button,
  Tabs,
  Loader,
  Table,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconUser,
  IconBell,
  IconBuilding,
  IconKey,
  IconCheck,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { NotificationPreferencesSection } from "./_components/NotificationPreferencesSection";
import { AlertSubscriptionsSection } from "./_components/AlertSubscriptionsSection";

export default function ProfilePage() {
  const { data, isLoading } = api.auth.me.useQuery();

  if (isLoading) {
    return (
      <Box p={32}>
        <Loader size="sm" />
      </Box>
    );
  }

  if (!data?.authenticated || !data.user) {
    return (
      <Box p={32}>
        <Text c="var(--color-text-muted)">Not authenticated. Please sign in.</Text>
      </Box>
    );
  }

  return <SettingsContent user={data.user} />;
}

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  isActive: boolean;
}

function OrganisationRolesSection({ currentUserId }: { currentUserId: string }) {
  const { activeTeamId, switchTeam } = useTeam();
  const teamsQuery = api.teams.myTeams.useQuery();
  const [activating, setActivating] = useState<string | null>(null);

  if (teamsQuery.isLoading) return <Loader size="xs" />;

  const teams = teamsQuery.data ?? [];

  const rows = teams.map((team) => {
    const membership = team.members.find((m) => m.user.id === currentUserId);
    return {
      teamId: team.id,
      orgName: team.organisation.name,
      teamName: team.name,
      role: membership?.role ?? "-",
      isActive: team.id === activeTeamId,
    };
  });

  async function handleSetActive(teamId: string, teamName: string) {
    setActivating(teamId);
    switchTeam(teamId);
    notifications.show({
      title: "Active team updated",
      message: `Now viewing ${teamName}.`,
      color: "green",
      autoClose: 2000,
    });
    setActivating(null);
  }

  return (
    <Card p="lg" mb={16} style={{ border: "1px solid var(--color-border)" }}>
      <Group gap={8} mb={16}>
        <IconBuilding size={18} color="var(--color-accent)" />
        <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
          Organisation & Roles
        </Text>
      </Group>

      {rows.length === 0 ? (
        <Text size="sm" c="var(--color-text-muted)">No team memberships found.</Text>
      ) : (
        <Table horizontalSpacing="md" verticalSpacing="sm" style={{ fontSize: 13 }}>
          <Table.Thead>
            <Table.Tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>Organisation</Table.Th>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>Team</Table.Th>
              <Table.Th style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>Role</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.teamId} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <Table.Td c="var(--color-text-primary)" fw={500}>{row.orgName}</Table.Td>
                <Table.Td c="var(--color-text-secondary)">{row.teamName}</Table.Td>
                <Table.Td>
                  <Badge size="xs" variant="light" color="gray" tt="capitalize">{row.role}</Badge>
                </Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  {row.isActive ? (
                    <Group gap={4} justify="flex-end">
                      <IconCheck size={13} color="var(--color-success)" />
                      <Text size="xs" c="var(--color-success)" fw={600}>Active</Text>
                    </Group>
                  ) : (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      loading={activating === row.teamId}
                      onClick={() => handleSetActive(row.teamId, row.teamName)}
                    >
                      Set Active
                    </Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}

function SettingsContent({ user }: { user: ProfileUser }) {
  const [activeTab, setActiveTab] = useState<string | null>("account");

  return (
    <Box p={32} style={{ maxWidth: 800 }}>
      <Text size="xl" fw={700} c="var(--color-text-primary)" mb={24}>Settings</Text>

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        mb={24}
        styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
      >
        <Tabs.List>
          <Tabs.Tab value="account" leftSection={<IconUser size={14} />}>Account</Tabs.Tab>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={14} />}>Notifications</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {activeTab === "account" && (
        <>
          {/* Information */}
          <Card p="lg" mb={16} style={{ border: "1px solid var(--color-border)" }}>
            <Group gap={8} mb={16}>
              <IconUser size={18} color="var(--color-accent)" />
              <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
                Information
              </Text>
            </Group>

            <Box mb={16}>
              <Text size="xs" c="var(--color-text-muted)" mb={2}>Name</Text>
              <Text size="sm" fw={500}>{user.name || "Not set"}</Text>
            </Box>

            <Group justify="space-between" align="flex-start">
              <Box>
                <Text size="xs" c="var(--color-text-muted)" mb={2}>Email</Text>
                <Text size="sm" fw={500}>{user.email}</Text>
              </Box>
              <Button
                component={Link}
                href="/change-password"
                variant="outline"
                color="gray"
                leftSection={<IconKey size={14} />}
                size="xs"
              >
                Change Password
              </Button>
            </Group>
          </Card>

          {/* Organisation & Roles */}
          <OrganisationRolesSection currentUserId={user.id} />
        </>
      )}

      {activeTab === "notifications" && (
        <>
          <NotificationPreferencesSection />
          <AlertSubscriptionsSection />
        </>
      )}
    </Box>
  );
}
