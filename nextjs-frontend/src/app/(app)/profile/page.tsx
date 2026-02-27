"use client";

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
} from "@mantine/core";
import {
  IconUser,
  IconSettings,
  IconPencil,
  IconKey,
  IconShield,
  IconMailForward,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { NotificationPreferencesSection } from "./_components/NotificationPreferencesSection";
import { SubscriptionSection } from "./_components/SubscriptionSection";

export default function ProfilePage() {
  const { data, isLoading } = api.auth.me.useQuery();

  if (isLoading) {
    return (
      <Box p={32}>
        <Text c="#737373">Loading profile...</Text>
      </Box>
    );
  }

  if (!data?.authenticated || !data.user) {
    return (
      <Box p={32}>
        <Text c="#737373">Not authenticated. Please sign in.</Text>
      </Box>
    );
  }

  const user = data.user;

  return <ProfileContent user={user} />;
}

function ProfileContent({ user }: { user: NonNullable<NonNullable<ReturnType<typeof api.auth.me.useQuery>["data"]>["user"]> }) {
  const utils = api.useUtils();
  const verifyEmail = api.auth.requestEmailVerification.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
    },
  });

  return (
    <Box p={32} style={{ maxWidth: 800 }}>
      <Group justify="space-between" mb={24}>
        <Box>
          <Text size="xl" fw={700} c="#171717">
            User Profile
          </Text>
          <Text size="sm" c="#737373">
            Manage your account settings and preferences
          </Text>
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

      {/* User Info Card */}
      <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
        <Group gap={8} mb={16}>
          <IconUser size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            Account Information
          </Text>
        </Group>
        <SimpleGrid cols={2} spacing={16}>
          <Box>
            <Text size="xs" c="#737373" mb={2}>Username</Text>
            <Text size="sm" fw={500}>{user.username}</Text>
          </Box>
          <Box>
            <Text size="xs" c="#737373" mb={2}>Full Name</Text>
            <Text size="sm" fw={500}>
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : "Not set"}
            </Text>
          </Box>
          <Box>
            <Text size="xs" c="#737373" mb={2}>Email</Text>
            <Group gap={8}>
              <Text size="sm" fw={500}>{user.email ?? "Not set"}</Text>
              {user.email_verified ? (
                <Badge size="xs" color="green" variant="light">Verified</Badge>
              ) : (
                <Badge size="xs" color="red" variant="light">Unverified</Badge>
              )}
            </Group>
            {!user.email_verified && user.email && (
              <>
                {verifyEmail.isSuccess && (
                  <Text size="xs" c="green" mt={8} fw={500}>
                    Verification email sent to {user.email}. Check your inbox.
                  </Text>
                )}
                {verifyEmail.isError && (
                  <Text size="xs" c="red" mt={4}>
                    {verifyEmail.error.message}
                  </Text>
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
            <Text size="xs" c="#737373" mb={2}>Role</Text>
            <Badge size="sm" color={user.is_staff ? "blue" : "gray"} variant="light">
              {user.is_staff ? "Staff" : "User"}
            </Badge>
          </Box>
        </SimpleGrid>
      </Card>

      {/* Preferences Card */}
      <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
        <Group gap={8} mb={16}>
          <IconSettings size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            Preferences
          </Text>
        </Group>
        <SimpleGrid cols={2} spacing={16}>
          <Box>
            <Text size="xs" c="#737373" mb={2}>Language</Text>
            <Text size="sm" fw={500}>
              {user.preferred_language === "ar" ? "Arabic" : "English"}
            </Text>
          </Box>
          <Box>
            <Text size="xs" c="#737373" mb={2}>Timezone</Text>
            <Text size="sm" fw={500}>{user.timezone ?? "UTC"}</Text>
          </Box>
        </SimpleGrid>
      </Card>

      {/* Notification Preferences (connected to backend) */}
      <NotificationPreferencesSection user={user} />

      {/* Alert Subscriptions */}
      <SubscriptionSection
        hasMobileNumber={!!user.mobile_number}
        smsEnabled={user.sms_notifications_enabled ?? false}
      />

      <Divider my={24} />

      {/* Quick Actions */}
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
        {user.is_staff && (
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
    </Box>
  );
}
