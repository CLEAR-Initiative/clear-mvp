"use client";

import { useState, useEffect } from "react";
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
  TextInput,
  ActionIcon,
  Divider,
  Stack,
  Select,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconUser,
  IconBell,
  IconBuilding,
  IconKey,
  IconCheck,
  IconSettings,
  IconPencil,
  IconX,
  IconLanguage,
  IconClock,
  IconPalette,
} from "@tabler/icons-react";
import { ColorSchemeToggle } from "~/components/ui";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { COUNTRIES_BY_DIAL_LENGTH, COUNTRY_SELECT_DATA, getDialCode } from "~/lib/constants/countries";
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
  role: string;
}

function parseE164(e164: string): { iso: string; local: string } {
  const match = COUNTRIES_BY_DIAL_LENGTH.find((c) => e164.startsWith(c.dialCode));
  if (match) return { iso: match.iso, local: e164.slice(match.dialCode.length) };
  return { iso: "SD", local: "" };
}

function MobileNumberField() {
  const utils = api.useUtils();
  const phoneQuery = api.auth.myUserDetails.useQuery();
  const [editing, setEditing] = useState(false);
  const [selectedIso, setSelectedIso] = useState("SD");
  const [localNumber, setLocalNumber] = useState("");

  const savedE164 = phoneQuery.data?.phoneNumber ?? "";

  // Sync from server on initial load
  useEffect(() => {
    if (phoneQuery.data !== undefined && !editing) {
      if (savedE164) {
        const parsed = parseE164(savedE164);
        setSelectedIso(parsed.iso);
        setLocalNumber(parsed.local);
      }
    }
  }, [phoneQuery.data, editing, savedE164]);

  const currentE164 = localNumber ? `${getDialCode(selectedIso)}${localNumber.replace(/\s/g, "")}` : "";
  const isDirty = currentE164 !== savedE164;

  const updateProfile = api.auth.updateProfile.useMutation({
    onSuccess: () => {
      setEditing(false);
      void utils.auth.myUserDetails.invalidate();
      notifications.show({ title: "Saved", message: "Mobile number updated.", color: "green", autoClose: 2000 });
    },
    onError: (err) => {
      notifications.show({ title: "Error", message: err.message, color: "red" });
    },
  });

  function handleCancel() {
    if (savedE164) {
      const parsed = parseE164(savedE164);
      setSelectedIso(parsed.iso);
      setLocalNumber(parsed.local);
    } else {
      setLocalNumber("");
    }
    setEditing(false);
  }

  function handleSave() {
    updateProfile.mutate({ phoneNumber: currentE164 || undefined });
  }

  const readOnly = !editing;
  const inputStyles = {
    input: {
      fontSize: 13,
      background: readOnly ? "transparent" : undefined,
      border: readOnly ? "1px solid transparent" : undefined,
      cursor: readOnly ? "default" : undefined,
      paddingLeft: readOnly ? 0 : undefined,
    },
  };

  return (
    <Box>
      <Text size="xs" c="var(--color-text-muted)" mb={4}>Mobile</Text>
      <Group gap={8} align="center" wrap="nowrap">
        <Select
          data={COUNTRY_SELECT_DATA}
          value={selectedIso}
          onChange={(v: string | null) => { setSelectedIso(v ?? "SD"); }}
          searchable
          size="xs"
          readOnly={readOnly}
          style={{ width: readOnly ? "auto" : 220, flexShrink: 0 }}
          styles={{
            input: {
              fontSize: 13,
              background: readOnly ? "transparent" : undefined,
              border: readOnly ? "1px solid transparent" : undefined,
              cursor: readOnly ? "default" : undefined,
              paddingLeft: readOnly ? 0 : undefined,
            },
          }}
          rightSection={readOnly ? null : undefined}
          comboboxProps={{ withinPortal: true }}
        />
        <TextInput
          value={localNumber}
          onChange={(e) => setLocalNumber(e.currentTarget.value)}
          placeholder={readOnly ? (savedE164 ? undefined : "Not set") : "912 345 678"}
          size="xs"
          readOnly={readOnly}
          style={{ flex: 1 }}
          styles={inputStyles}
          rightSection={
            readOnly ? (
              <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setEditing(true)}>
                <IconPencil size={13} />
              </ActionIcon>
            ) : null
          }
        />
        {editing && (
          <>
            <Button size="xs" variant="subtle" color="gray" onClick={handleCancel} leftSection={<IconX size={12} />}>
              Cancel
            </Button>
            <Button
              size="xs"
              color="dark"
              loading={updateProfile.isPending}
              disabled={!isDirty}
              onClick={handleSave}
            >
              Save
            </Button>
          </>
        )}
      </Group>
    </Box>
  );
}

function OrganisationRolesSection({ currentUserId }: { currentUserId: string }) {
  const { activeTeamId, switchTeam } = useTeam();
  const teamsQuery = api.teams.myTeams.useQuery();

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

  function handleSetActive(teamId: string, teamName: string) {
    switchTeam(teamId);
    notifications.show({
      title: "Active team updated",
      message: `Now viewing ${teamName}.`,
      color: "green",
      autoClose: 2000,
    });
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
            <Group gap={8} mb={20}>
              <IconUser size={18} color="var(--color-accent)" />
              <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
                Information
              </Text>
            </Group>

            <Stack gap={20}>
              {/* Name */}
              <Box>
                <Text size="xs" c="var(--color-text-muted)" mb={4}>Name</Text>
                <Text size="sm" fw={500}>{user.name || "Not set"}</Text>
              </Box>

              <Divider color="var(--color-border)" />

              {/* Email + Change Password */}
              <Group justify="space-between" align="center">
                <Box>
                  <Text size="xs" c="var(--color-text-muted)" mb={4}>Email</Text>
                  <Text size="sm" fw={500}>{user.email}</Text>
                </Box>
                <Button
                  component={Link}
                  href="/change-password"
                  variant="outline"
                  color="gray"
                  leftSection={<IconKey size={13} />}
                  size="xs"
                  style={{ fontSize: 12 }}
                >
                  Change Password
                </Button>
              </Group>

              <Divider color="var(--color-border)" />

              {/* Mobile */}
              <MobileNumberField />
            </Stack>
          </Card>

          {/* Organisation & Roles */}
          <OrganisationRolesSection currentUserId={user.id} />

          {/* Preferences */}
          <Card p="lg" mb={16} style={{ border: "1px solid var(--color-border)" }}>
            <Group gap={8} mb={20}>
              <IconSettings size={18} color="var(--color-accent)" />
              <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
                Preferences
              </Text>
            </Group>
            <Box px={4} mb={16}>
              <Group gap={6} mb={8}>
                <IconPalette size={14} color="var(--color-text-muted)" />
                <Text size="xs" c="var(--color-text-muted)" fw={600} tt="uppercase" style={{ letterSpacing: "0.04em", fontSize: 10 }}>Appearance</Text>
              </Group>
              <ColorSchemeToggle />
            </Box>
            <Divider color="var(--color-border)" mb={16} />
            <Group gap={0} grow>
              <Box px={4}>
                <Group gap={6} mb={6}>
                  <IconLanguage size={14} color="var(--color-text-muted)" />
                  <Text size="xs" c="var(--color-text-muted)" fw={600} tt="uppercase" style={{ letterSpacing: "0.04em", fontSize: 10 }}>Language</Text>
                </Group>
                <Text size="sm" fw={500}>English</Text>
              </Box>
              <Divider orientation="vertical" color="var(--color-border)" />
              <Box px={24}>
                <Group gap={6} mb={6}>
                  <IconClock size={14} color="var(--color-text-muted)" />
                  <Text size="xs" c="var(--color-text-muted)" fw={600} tt="uppercase" style={{ letterSpacing: "0.04em", fontSize: 10 }}>Timezone</Text>
                </Group>
                <Text size="sm" fw={500}>UTC</Text>
              </Box>
            </Group>
          </Card>
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
