"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Loader,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { WelcomeShell, WelcomeStepper } from "~/components/onboarding/welcome-shell";
import { markSettingsComplete } from "~/lib/onboarding/storage";
import { notifyOnboardingChange } from "~/hooks/use-onboarding-state";
import { api } from "~/trpc/react";
import { defaultTimeZone, isLocale, localeLabels, locales } from "~/i18n/config";
import { useTeam } from "~/providers/team-provider";

export default function WelcomeSettingsPage() {
  const t = useTranslations("onboarding.welcome.settings");
  const tProfile = useTranslations("profile");
  const router = useRouter();
  const { data, isLoading } = api.auth.me.useQuery();
  const detailsQuery = api.auth.myUserDetails.useQuery(undefined, {
    enabled: !!data?.user?.id,
  });
  const updateProfile = api.auth.updateProfile.useMutation();
  const { teams, switchTeam, activeTeamId } = useTeam();

  const currentLocale = useLocale();
  const currentTimeZone = useTimeZone();
  const [language, setLanguage] = useState<string>(currentLocale);
  const [timezone, setTimezone] = useState<string>(currentTimeZone ?? defaultTimeZone);
  const [teamId, setTeamId] = useState<string | null>(activeTeamId);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (detailsQuery.data?.language) setLanguage(detailsQuery.data.language);
  }, [detailsQuery.data?.language]);

  useEffect(() => {
    if (activeTeamId) setTeamId(activeTeamId);
  }, [activeTeamId]);

  const applyLocalePrefs = async (locale: string, tz: string) => {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, timezone: tz }),
    });
  };

  if (isLoading || !data?.authenticated || !data.user) {
    return (
      <WelcomeShell>
        <Loader size="sm" mx="auto" />
      </WelcomeShell>
    );
  }

  const showTeamPicker = (teams?.length ?? 0) > 1;

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      if (isLocale(language)) {
        await updateProfile.mutateAsync({ language });
      }
      await applyLocalePrefs(language, timezone ?? defaultTimeZone);
      if (teamId && teamId !== activeTeamId) {
        switchTeam(teamId);
      }
      markSettingsComplete(data.user.id);
      notifyOnboardingChange();
      router.push("/detection?tour=1&tab=alerts");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WelcomeShell>
      <WelcomeStepper activeStep={1} />
      <Card p="xl" withBorder radius="md">
        <Stack gap={16}>
          <Box>
            <Text fw={700} size="lg" c="var(--color-text-primary)">
              {t("title")}
            </Text>
            <Text size="sm" c="var(--color-text-muted)" mt={4}>
              {t("subtitle")}
            </Text>
          </Box>

          <Select
            label={tProfile("preferences.language")}
            value={language}
            onChange={(v) => v && setLanguage(v)}
            data={locales.map((locale) => ({
              value: locale,
              label: localeLabels[locale],
            }))}
            allowDeselect={false}
          />

          <Select
            label={tProfile("preferences.timezone")}
            value={timezone}
            onChange={(v) => setTimezone(v ?? defaultTimeZone)}
            data={[
              { value: "Africa/Khartoum", label: tProfile("edit.timezoneKhartoum") },
              { value: "UTC", label: tProfile("edit.timezoneUtc") },
            ]}
            allowDeselect={false}
          />

          {showTeamPicker && (
            <Select
              label={t("team")}
              value={teamId}
              onChange={setTeamId}
              data={(teams ?? []).map((team) => ({ value: team.id, label: team.name }))}
              allowDeselect={false}
            />
          )}

          <Button
            fullWidth
            color="dark"
            loading={submitting}
            onClick={() => void handleContinue()}
            mt={8}
          >
            {t("continue")}
          </Button>
        </Stack>
      </Card>
    </WelcomeShell>
  );
}
