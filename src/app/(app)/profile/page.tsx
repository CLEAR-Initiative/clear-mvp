"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Box,
  Card,
  Text,
  Group,
  Badge,
  Button,
  SimpleGrid,
  Divider,
  Tabs,
  Select,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconUser,
  IconSettings,
  IconShield,
  IconPencil,
  IconKey,
  IconBell,
  IconBuilding,
  IconCheck,
  IconMailForward,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { NotificationPreferencesSection } from "./_components/NotificationPreferencesSection";
import { AlertSubscriptionsSection } from "./_components/AlertSubscriptionsSection";

const roleBadgeColor: Record<string, string> = {
  admin: "blue",
  analyst: "teal",
  viewer: "gray",
};

export default function ProfilePage() {
  const { data, isLoading } = api.auth.me.useQuery();

  if (isLoading) {
    return (
      <Box p={32}>
        <Text c="var(--color-text-muted)">Loading profile...</Text>
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

  return <ProfileContent user={data.user} />;
}

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  isActive: boolean;
  email_notifications_enabled?: boolean;
  sms_notifications_enabled?: boolean;
  mobile_number?: string;
  preferred_language?: string;
  timezone?: string;
}

function OrganizationSection() {
  const { activeTeamId, activeTeam, isLoading: teamLoading, switchTeam } = useTeam();
  const orgsQuery = api.teams.myOrganisations.useQuery();
  const orgs = orgsQuery.data ?? [];

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Derive which org the active team belongs to
  const activeOrgId = useMemo(() => {
    if (!activeTeamId) return null;
    return orgs.find((o) => o.teams.some((t) => t.id === activeTeamId))?.id ?? null;
  }, [activeTeamId, orgs]);

  const effectiveOrgId = selectedOrgId ?? activeOrgId;
  const selectedOrg = orgs.find((o) => o.id === effectiveOrgId);
  const orgOptions = orgs.map((o) => ({ value: o.id, label: o.name }));
  const teamOptions = (selectedOrg?.teams ?? []).map((t) => ({ value: t.id, label: t.name }));
  const effectiveTeamId = selectedTeamId ?? (selectedOrgId ? null : activeTeamId);
  const isChanged = selectedTeamId !== null && selectedTeamId !== activeTeamId;

  function handleOrgChange(orgId: string | null) {
    setSelectedOrgId(orgId);
    setSelectedTeamId(null);
    setSaved(false);
  }

  function handleSetActive() {
    if (!effectiveTeamId) return;
    switchTeam(effectiveTeamId);
    setSaved(true);
    notifications.show({
      title: "Active team updated",
      message: `Now viewing data for ${selectedOrg?.name ?? "selected organisation"} - ${selectedOrg?.teams.find((t) => t.id === effectiveTeamId)?.name ?? ""}.`,
      color: "green",
    });
    setTimeout(() => setSaved(false), 3000);
  }

  if (orgsQuery.isLoading || teamLoading) {
    return (
      <Card p="lg" mb={16} style={{ border: "1px solid var(--color-border)" }}>
        <Group gap={8} mb={16}>
          <IconBuilding size={18} color="var(--color-accent)" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            Organisation
          </Text>
        </Group>
        <Loader size="sm" />
      </Card>
    );
  }

  // Derive display names from orgsQuery data (more reliable than activeTeam.organisation)
  const activeOrgName = orgs.find((o) => o.id === activeOrgId)?.name ?? activeTeam?.organisation?.name ?? null;
  const activeTeamName = activeTeam?.name ?? null;

  return (
    <Card p="lg" mb={16} style={{ border: "1px solid var(--color-border)" }}>
      <Group gap={8} mb={16}>
        <IconBuilding size={18} color="var(--color-accent)" />
        <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
          Organisation
        </Text>
      </Group>

      <Text size="sm" c="var(--color-text-muted)" mb={12}>
        Currently in{" "}
        <Text span fw={600} c="var(--color-text-primary)">
          {activeOrgName ?? "-"}
        </Text>
        {activeTeamName && (
          <>
            {" - "}
            <Text span fw={600} c="var(--color-text-primary)">
              {activeTeamName}
            </Text>
          </>
        )}
      </Text>

      <SimpleGrid cols={2} spacing={12} mb={12}>
        <Select
          label="Organisation"
          placeholder="Select organisation"
          data={orgOptions}
          value={effectiveOrgId}
          onChange={handleOrgChange}
          size="sm"
          styles={{ label: { fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 } }}
        />
        <Select
          label="Team"
          placeholder={effectiveOrgId ? "Select team" : "Select an organisation first"}
          data={teamOptions}
          value={effectiveTeamId}
          onChange={(v) => { setSelectedTeamId(v); setSaved(false); }}
          disabled={!effectiveOrgId || teamOptions.length === 0}
          size="sm"
          styles={{ label: { fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 } }}
        />
      </SimpleGrid>

      <Group justify="flex-end">
        <Button
          size="xs"
          disabled={!isChanged}
          leftSection={saved ? <IconCheck size={13} /> : undefined}
          onClick={handleSetActive}
          style={{
            background: isChanged ? "var(--color-accent)" : undefined,
            borderColor: isChanged ? "var(--color-accent)" : undefined,
          }}
        >
          {saved ? "Active team set" : "Set Active"}
        </Button>
      </Group>
    </Card>
  );
}

function ProfileContent({ user }: { user: ProfileUser }) {
  const [activeTab, setActiveTab] = useState<string | null>("account");
  const normalizedRole = user.role?.toLowerCase() ?? "viewer";
  const verifyEmail = api.auth.requestEmailVerification.useMutation();

  return (
    <Box p={32} style={{ maxWidth: 800 }}>
      <Group justify="space-between" mb={24}>
        <Box>
          <Text size="xl" fw={700} c="var(--color-text-primary)">User Profile</Text>
          <Text size="sm" c="var(--color-text-muted)">Manage your account settings and preferences</Text>
        </Box>
        <Button
          component={Link}
          href="/profile/edit"
          variant="outline"
          color="gray"
          leftSection={<IconPencil size={16} />}
          style={{ fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          Edit Profile
        </Button>
      </Group>

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
            <SimpleGrid cols={2} spacing={16}>
              <Box>
                <Text size="xs" c="var(--color-text-muted)" mb={2}>Name</Text>
                <Text size="sm" fw={500}>{user.name || "Not set"}</Text>
              </Box>
              <Box>
                <Text size="xs" c="var(--color-text-muted)" mb={2}>Email</Text>
                <Group gap={8}>
                  <Text size="sm" fw={500}>{user.email ?? "Not set"}</Text>
                  {user.emailVerified ? (
                    <Badge size="xs" color="green" variant="light">Verified</Badge>
                  ) : (
                    <Badge size="xs" color="red" variant="light">Unverified</Badge>
                  )}
                </Group>
                {!user.emailVerified && user.email && (
                  <>
                    {verifyEmail.isSuccess && (
                      <Text size="xs" c="green" mt={8} fw={500}>
                        Verification email sent to {user.email}. Check your inbox.
                      </Text>
                    )}
                    {verifyEmail.isError && (
                      <Text size="xs" c="red" mt={4}>{verifyEmail.error.message}</Text>
                    )}
                    <Button
                      size="xs"
                      variant="light"
                      color={verifyEmail.isSuccess ? "gray" : "red"}
                      mt={8}
                      leftSection={<IconMailForward size={14} />}
                      loading={verifyEmail.isPending}
                      onClick={() => verifyEmail.mutate()}
                    >
                      {verifyEmail.isSuccess ? "Resend" : "Verify Email"}
                    </Button>
                  </>
                )}
              </Box>
              <Box>
                <Text size="xs" c="var(--color-text-muted)" mb={2}>Role</Text>
                <Badge size="sm" color={roleBadgeColor[normalizedRole] ?? "gray"} variant="light" tt="capitalize">
                  {normalizedRole}
                </Badge>
              </Box>
              <Box>
                <Text size="xs" c="var(--color-text-muted)" mb={2}>Status</Text>
                <Badge size="sm" color={user.isActive ? "green" : "red"} variant="light">
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </Box>
            </SimpleGrid>
          </Card>

          {/* Organisation */}
          <OrganizationSection />

          {/* Preferences */}
          <Card p="lg" mb={16} style={{ border: "1px solid var(--color-border)" }}>
            <Group gap={8} mb={16}>
              <IconSettings size={18} color="var(--color-accent)" />
              <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
                Preferences
              </Text>
            </Group>
            <SimpleGrid cols={2} spacing={16}>
              <Box>
                <Text size="xs" c="var(--color-text-muted)" mb={2}>Language</Text>
                <Text size="sm" fw={500}>{user.preferred_language === "ar" ? "Arabic" : "English"}</Text>
              </Box>
              <Box>
                <Text size="xs" c="var(--color-text-muted)" mb={2}>Timezone</Text>
                <Text size="sm" fw={500}>{user.timezone ?? "UTC"}</Text>
              </Box>
            </SimpleGrid>
          </Card>

          <Divider my={24} color="var(--color-border)" />

          <Text fw={700} size="sm" tt="uppercase" mb={12} style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            Quick Actions
          </Text>
          <Group gap={8}>
            <Button
              component={Link}
              href="/change-password"
              variant="outline"
              color="gray"
              leftSection={<IconKey size={14} />}
              size="sm"
            >
              Change Password
            </Button>
            {normalizedRole === "admin" && (
              <Button
                component={Link}
                href="/admin"
                variant="outline"
                color="blue"
                leftSection={<IconShield size={14} />}
                size="sm"
              >
                Admin Dashboard
              </Button>
            )}
          </Group>
        </>
      )}

      {activeTab === "notifications" && (
        <>
          <NotificationPreferencesSection user={user} />
          <AlertSubscriptionsSection />
        </>
      )}
    </Box>
  );
}
