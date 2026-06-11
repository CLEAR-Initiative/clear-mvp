"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
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
import { defaultLocale, defaultTimeZone, isLocale, localeLabels, locales } from "~/i18n/config";

const inputStyles = {
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--color-text-primary)",
    marginBottom: 4,
  },
  input: { borderColor: "var(--color-border)" },
};

export default function ProfileEditPage() {
  const t = useTranslations("profile.edit");
  const { data, isLoading } = api.auth.me.useQuery();

  if (isLoading) {
    return (
      <Box p={32}>
        <Text c="var(--color-text-muted)">{t("loading")}</Text>
      </Box>
    );
  }

  if (!data?.authenticated || !data.user) {
    return (
      <Box p={32}>
        <Text c="var(--color-text-muted)">{t("notAuthenticated")}</Text>
      </Box>
    );
  }

  return <ProfileEditForm user={data.user} />;
}

interface ProfileEditFormProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

function ProfileEditForm({ user }: ProfileEditFormProps) {
  const t = useTranslations("profile.edit");
  const tActions = useTranslations("common.actions");
  const router = useRouter();
  // Language persists to the user profile (clear-api user.language) plus the
  // locale cookie; timezone is cookie-only until the backend has a field for
  // it. Initial values come from the active request config (cookie-seeded
  // from the profile by LocaleSync at login).
  const currentLocale = useLocale();
  const currentTimeZone = useTimeZone();

  const [firstName, setFirstName] = useState(user.name?.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(
    user.name?.split(" ").slice(1).join(" ") ?? "",
  );
  const [email, setEmail] = useState(user.email ?? "");
  const [language, setLanguage] = useState(
    isLocale(currentLocale) ? currentLocale : defaultLocale,
  );
  const [tz, setTz] = useState(currentTimeZone ?? defaultTimeZone);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const utils = api.useUtils();
  const updateProfile = api.auth.updateProfile.useMutation({
    onSuccess: async () => {
      try {
        await fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: language, timezone: tz }),
        });
      } catch {
        // Cookie update is best-effort; the profile save itself succeeded.
      }
      setSuccess(true);
      setError("");
      void utils.auth.me.invalidate();
      void utils.auth.myUserDetails.invalidate();
      // Re-render server components with the new request config so the
      // whole UI picks up the locale without a full reload.
      router.refresh();
    },
    onError: (err: { message?: string }) => {
      setError(err.message ?? t("unexpectedError"));
      setSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const fullName = [firstName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");
    if (!fullName) {
      setError(t("nameRequired"));
      return;
    }

    updateProfile.mutate({ name: fullName, language });
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
          leftSection={<IconArrowLeft size={14} />}
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
          {t("updateSuccess")}
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
        <Card p="lg" mb={16} style={{ border: "1px solid var(--color-border)" }}>
          <Group gap={8} mb={16}>
            <IconUser size={18} color="#E85D3D" />
            <Text
              fw={700}
              size="sm"
              tt="uppercase"
              style={{ letterSpacing: "0.05em", fontSize: 11 }}
            >
              {t("personalInformation")}
            </Text>
          </Group>

          <Stack gap={12}>
            <Group grow>
              <TextInput
                label={t("firstName")}
                placeholder={t("firstNamePlaceholder")}
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.currentTarget.value);
                  setSuccess(false);
                }}
                styles={inputStyles}
              />
              <TextInput
                label={t("lastName")}
                placeholder={t("lastNamePlaceholder")}
                value={lastName}
                onChange={(e) => {
                  setLastName(e.currentTarget.value);
                  setSuccess(false);
                }}
                styles={inputStyles}
              />
            </Group>

            <TextInput
              label={t("email")}
              placeholder={t("emailPlaceholder")}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.currentTarget.value);
                setSuccess(false);
              }}
              required
              styles={inputStyles}
            />
          </Stack>
        </Card>

        <Card p="lg" mb={16} style={{ border: "1px solid var(--color-border)" }}>
          <Group gap={8} mb={16}>
            <IconUser size={18} color="#E85D3D" />
            <Text
              fw={700}
              size="sm"
              tt="uppercase"
              style={{ letterSpacing: "0.05em", fontSize: 11 }}
            >
              {t("preferences")}
            </Text>
          </Group>

          <Stack gap={12}>
            <Select
              label={t("language")}
              value={language}
              onChange={(v) => {
                setLanguage(isLocale(v) ? v : defaultLocale);
                setSuccess(false);
              }}
              data={locales.map((locale) => ({
                value: locale,
                label: localeLabels[locale],
              }))}
              styles={inputStyles}
            />

            <Select
              label={t("timezone")}
              value={tz}
              onChange={(v) => {
                setTz(v ?? defaultTimeZone);
                setSuccess(false);
              }}
              data={[
                { value: "Africa/Khartoum", label: t("timezoneKhartoum") },
                { value: "UTC", label: t("timezoneUtc") },
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
            {tActions("cancel")}
          </Button>
          <Button
            type="submit"
            color="dark"
            loading={updateProfile.isPending}
            style={{ fontWeight: 600 }}
          >
            {tActions("saveChanges")}
          </Button>
        </Group>
      </form>
    </Box>
  );
}
