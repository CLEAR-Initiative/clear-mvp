"use client";

import Link from "next/link";
import {
  Box,
  Card,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
} from "@mantine/core";
import {
  IconUser,
  IconArrowLeft,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

const inputStyles = {
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "#171717",
    marginBottom: 4,
  },
  input: { borderColor: "#E5E5E5" },
};

export default function ProfileEditPage() {
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
    <Box p={32} style={{ maxWidth: 600 }}>
      <Group justify="space-between" mb={24}>
        <Box>
          <Text size="xl" fw={700} c="#171717">
            Edit Profile
          </Text>
          <Text size="sm" c="#737373">
            Update your personal information
          </Text>
        </Box>
        <Button
          component={Link}
          href="/profile"
          variant="subtle"
          color="gray"
          size="sm"
          leftSection={<IconArrowLeft size={14} />}
        >
          Back to Profile
        </Button>
      </Group>

      <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
        <Group gap={8} mb={16}>
          <IconUser size={18} color="#E85D3D" />
          <Text
            fw={700}
            size="sm"
            tt="uppercase"
            style={{ letterSpacing: "0.05em", fontSize: 11 }}
          >
            Personal Information
          </Text>
        </Group>

        <Stack gap={12}>
          <TextInput
            label="Name"
            value={user.name}
            disabled
            styles={inputStyles}
          />
          <TextInput
            label="Email"
            value={user.email}
            disabled
            styles={inputStyles}
          />
        </Stack>

        <Text size="xs" c="#737373" mt={16}>
          Profile editing will be available once the profile update API is connected.
        </Text>
      </Card>

      <Group justify="flex-end">
        <Button
          component={Link}
          href="/profile"
          variant="outline"
          color="gray"
        >
          Back
        </Button>
      </Group>
    </Box>
  );
}
