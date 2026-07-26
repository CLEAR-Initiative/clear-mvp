"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import { ColorSchemeToggle } from "~/components/ui";
import { WelcomeShell, WelcomeStepper } from "~/components/onboarding/welcome-shell";
import { markOnboardingStarted, markProfileComplete, readOnboardingState } from "~/lib/onboarding/storage";
import { notifyOnboardingChange } from "~/hooks/use-onboarding-state";
import { api } from "~/trpc/react";
import { COUNTRY_SELECT_DATA, getDialCode } from "~/lib/constants/countries";

export default function WelcomeProfilePage() {
  const t = useTranslations("onboarding.welcome.profile");
  const router = useRouter();
  const { data, isLoading } = api.auth.me.useQuery();
  const detailsQuery = api.auth.myUserDetails.useQuery(undefined, {
    enabled: !!data?.user?.id,
  });
  const updateProfile = api.auth.updateProfile.useMutation();

  const [name, setName] = useState("");
  const [selectedIso, setSelectedIso] = useState("SD");
  const [localNumber, setLocalNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!data?.user?.id) return;
    const state = readOnboardingState(data.user.id);
    if (!state.onboardingStartedAt) {
      markOnboardingStarted(data.user.id);
      notifyOnboardingChange();
    }
  }, [data?.user?.id]);

  useEffect(() => {
    if (data?.user?.name) setName(data.user.name);
  }, [data?.user?.name]);

  useEffect(() => {
    const phone = detailsQuery.data?.phoneNumber;
    if (phone?.startsWith("+249")) {
      setSelectedIso("SD");
      setLocalNumber(phone.slice(4));
    }
  }, [detailsQuery.data?.phoneNumber]);

  if (isLoading || !data?.authenticated || !data.user) {
    return (
      <WelcomeShell>
        <Loader size="sm" mx="auto" />
      </WelcomeShell>
    );
  }

  const handleContinue = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const phoneE164 = localNumber.trim()
        ? `${getDialCode(selectedIso)}${localNumber.replace(/\s/g, "")}`
        : undefined;
      await updateProfile.mutateAsync({
        name: name.trim(),
        phoneNumber: phoneE164,
      });
      markProfileComplete(data.user.id);
      notifyOnboardingChange();
      router.push("/welcome/settings");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WelcomeShell>
      <WelcomeStepper activeStep={0} />
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

          <TextInput
            label={t("name")}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />

          <Box>
            <Text size="sm" fw={500} mb={4}>
              {t("phone")}
            </Text>
            <Group gap={8} wrap="nowrap" align="flex-end">
              <Select
                data={COUNTRY_SELECT_DATA}
                value={selectedIso}
                onChange={(v) => v && setSelectedIso(v)}
                w={100}
                searchable
              />
              <TextInput
                placeholder={t("phonePlaceholder")}
                value={localNumber}
                onChange={(e) => setLocalNumber(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
            </Group>
            <Text size="xs" c="var(--color-text-muted)" mt={4}>
              {t("phoneOptional")}
            </Text>
          </Box>

          <Box>
            <Text size="sm" fw={500} mb={8}>
              {t("appearance")}
            </Text>
            <ColorSchemeToggle />
          </Box>

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
