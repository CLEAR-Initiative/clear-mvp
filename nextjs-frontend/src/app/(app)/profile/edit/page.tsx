"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Card,
  Text,
  TextInput,
  Select,
  Button,
  Alert,
  Stack,
  Group,
} from "@mantine/core";
import {
  IconUser,
  IconAlertCircle,
  IconCircleCheck,
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

  return <ProfileEditForm user={data.user} />;
}

interface ProfileEditFormProps {
  user: {
    first_name: string;
    last_name: string;
    email: string;
    preferred_language?: string;
    timezone?: string;
  };
}

function ProfileEditForm({ user }: ProfileEditFormProps) {
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [language, setLanguage] = useState(
    user.preferred_language ?? "en",
  );
  const [tz, setTz] = useState(user.timezone ?? "Africa/Khartoum");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const utils = api.useUtils();
  const updateProfile = api.subscriptions.updateProfile.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError("");
      void utils.auth.me.invalidate();
    },
    onError: (err) => {
      setError(err.message ?? "An unexpected error occurred");
      setSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    updateProfile.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      preferred_language: language,
      timezone: tz,
    });
  };

  return (
    <Box p={32} style={{ maxWidth: 600 }}>
      <Group justify="space-between" mb={24}>
        <Box>
          <Text size="xl" fw={700} c="#171717">
            Edit Profile
          </Text>
          <Text size="sm" c="#737373">
            Update your personal information and preferences
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

      {success && (
        <Alert
          icon={<IconCircleCheck size={16} />}
          color="green"
          variant="light"
          mb={16}
          styles={{ message: { fontSize: 13 } }}
        >
          Profile updated successfully.
        </Alert>
      )}

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="light"
          mb={16}
          styles={{ message: { fontSize: 13 } }}
        >
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
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
            <Group grow>
              <TextInput
                label="First Name"
                placeholder="Enter first name"
                value={firstName}
                onChange={(e) => setFirstName(e.currentTarget.value)}
                styles={inputStyles}
              />
              <TextInput
                label="Last Name"
                placeholder="Enter last name"
                value={lastName}
                onChange={(e) => setLastName(e.currentTarget.value)}
                styles={inputStyles}
              />
            </Group>

            <TextInput
              label="Email"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              styles={inputStyles}
            />
          </Stack>
        </Card>

        <Card p="lg" mb={16} style={{ border: "1px solid #E5E5E5" }}>
          <Group gap={8} mb={16}>
            <IconUser size={18} color="#E85D3D" />
            <Text
              fw={700}
              size="sm"
              tt="uppercase"
              style={{ letterSpacing: "0.05em", fontSize: 11 }}
            >
              Preferences
            </Text>
          </Group>

          <Stack gap={12}>
            <Select
              label="Language"
              value={language}
              onChange={(v) => setLanguage(v ?? "en")}
              data={[
                { value: "en", label: "English" },
                { value: "ar", label: "Arabic" },
              ]}
              styles={inputStyles}
            />

            <Select
              label="Timezone"
              value={tz}
              onChange={(v) => setTz(v ?? "Africa/Khartoum")}
              data={[
                { value: "Africa/Khartoum", label: "Sudan (Khartoum)" },
                { value: "UTC", label: "UTC" },
              ]}
              styles={inputStyles}
            />
          </Stack>
        </Card>

        <Group justify="flex-end">
          <Button
            component={Link}
            href="/profile"
            variant="outline"
            color="gray"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            color="dark"
            loading={updateProfile.isPending}
            style={{ fontWeight: 600 }}
          >
            Save Changes
          </Button>
        </Group>
      </form>
    </Box>
  );
}
