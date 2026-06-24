"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Card,
  Text,
  PasswordInput,
  Button,
  Alert,
  Stack,
  Group,
  List,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import {
  IconKey,
  IconAlertCircle,
  IconCircleCheck,
  IconInfoCircle,
} from "@tabler/icons-react";
import { authClient } from "~/lib/auth-client";

export default function ChangePasswordPage() {
  const t = useTranslations("changePassword");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword1 !== newPassword2) {
      setError(t("errors.mismatch"));
      return;
    }

    if (newPassword1.length < 8) {
      setError(t("errors.tooShort"));
      return;
    }

    setLoading(true);

    try {
      const { error: changeError } = await authClient.changePassword({
        currentPassword,
        newPassword: newPassword1,
        revokeOtherSessions: true,
      });

      if (changeError) {
        setError(changeError.message ?? t("errors.failed"));
      } else {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword1("");
        setNewPassword2("");
      }
    } catch {
      setError(t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={32} style={{ maxWidth: 600 }}>
      <Group justify="space-between" mb={24}>
        <Box>
          <Text size="xl" fw={700} c="var(--color-text-primary)">
            {t("title")}
          </Text>
          <Text size="sm" c="var(--color-text-muted)">
            {t("subtitle")}
          </Text>
        </Box>
        <Button
          component={Link}
          href="/profile"
          variant="subtle"
          color="gray"
          size="sm"
        >
          {t("backToProfile")}
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
          {t("success")}
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

      <Card p="lg" mb={16} style={{ border: "1px solid var(--color-border)" }}>
        <Group gap={8} mb={16}>
          <IconKey size={18} color="#E85D3D" />
          <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            {t("security")}
          </Text>
        </Group>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <Stack gap={12}>
            <PasswordInput
              label={t("current.label")}
              placeholder={t("current.placeholder")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.currentTarget.value)}
              required
              styles={{
                label: { fontSize: 13, fontWeight: 500, color: "#171717", marginBottom: 4 },
                input: { borderColor: "var(--color-border)" },
              }}
            />

            <PasswordInput
              label={t("new.label")}
              placeholder={t("new.placeholder")}
              value={newPassword1}
              onChange={(e) => setNewPassword1(e.currentTarget.value)}
              required
              styles={{
                label: { fontSize: 13, fontWeight: 500, color: "#171717", marginBottom: 4 },
                input: { borderColor: "var(--color-border)" },
              }}
            />

            <PasswordInput
              label={t("confirm.label")}
              placeholder={t("confirm.placeholder")}
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.currentTarget.value)}
              required
              styles={{
                label: { fontSize: 13, fontWeight: 500, color: "#171717", marginBottom: 4 },
                input: { borderColor: "var(--color-border)" },
              }}
            />

            <Button
              type="submit"
              color="dark"
              loading={loading}
              leftSection={<IconKey size={16} />}
              mt={8}
              style={{ fontWeight: 600 }}
            >
              {t("submit")}
            </Button>
          </Stack>
        </form>
      </Card>

      {/* Password Requirements */}
      <Card p="lg" style={{ border: "1px solid var(--color-border)", backgroundColor: "#F5F5F5" }}>
        <Group gap={8} mb={12}>
          <IconInfoCircle size={16} color="#737373" />
          <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
            {t("requirements.title")}
          </Text>
        </Group>
        <List size="xs" spacing={4} c="var(--color-text-secondary)">
          <List.Item>{t("requirements.minLength")}</List.Item>
        </List>
      </Card>
    </Box>
  );
}
