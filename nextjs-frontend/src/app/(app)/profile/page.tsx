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
  IconShield,
  IconPencil,
  IconKey,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

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
            <Text size="xs" c="#737373" mb={2}>Name</Text>
            <Text size="sm" fw={500}>{user.name || "Not set"}</Text>
          </Box>
          <Box>
            <Text size="xs" c="#737373" mb={2}>Email</Text>
            <Group gap={8}>
              <Text size="sm" fw={500}>{user.email}</Text>
              {user.emailVerified ? (
                <Badge size="xs" color="green" variant="light">Verified</Badge>
              ) : (
                <Badge size="xs" color="red" variant="light">Unverified</Badge>
              )}
            </Group>
          </Box>
          <Box>
            <Text size="xs" c="#737373" mb={2}>Role</Text>
            <Badge size="sm" color={roleBadgeColor[user.role] ?? "gray"} variant="light" tt="capitalize">
              {user.role}
            </Badge>
          </Box>
          <Box>
            <Text size="xs" c="#737373" mb={2}>Status</Text>
            <Badge size="sm" color={user.isActive ? "green" : "red"} variant="light">
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
          </Box>
        </SimpleGrid>
      </Card>

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
        {user.role === "admin" && (
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
