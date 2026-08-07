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
import { COUNTRIES_BY_DIAL_LENGTH, COUNTRY_SELECT_DATA, getDialCode } from "~/lib/constants/countries";
import { useTeamCountry } from "~/hooks/use-team-country";

export default function WelcomeProfilePage() {
  const t = useTranslations("onboarding.welcome.profile");
  const router = useRouter();
  const { data, isLoading } = api.auth.me.useQuery();
  const detailsQuery = api.auth.myUserDetails.useQuery(undefined, {
    enabled: !!data?.user?.id,
  });
  const updateProfile = api.auth.updateProfile.useMutation();

  // Dial-code default follows the team the invitee was added to, rather than a
  // fixed country. Multi-country teams use the alphabetically first, which is
  // what useTeamCountry treats as primary.
  const { countryIso: teamCountryIso } = useTeamCountry();

  const [name, setName] = useState("");
  // null until either the team country resolves or a stored number is parsed,
  // so neither can be clobbered by a late-arriving default.
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [isoTouched, setIsoTouched] = useState(false);
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

  // Adopt the team's country once teams load, unless the user already picked
  // one or an existing number established it.
  useEffect(() => {
    if (isoTouched || !teamCountryIso) return;
    setSelectedIso((prev) => prev ?? teamCountryIso);
  }, [teamCountryIso, isoTouched]);

  // Prefill from an already-stored number. Longest dial code wins so +1268
  // is not read as +1.
  useEffect(() => {
    const phone = detailsQuery.data?.phoneNumber;
    if (!phone) return;
    const match = COUNTRIES_BY_DIAL_LENGTH.find((c) => phone.startsWith(c.dialCode));
    if (!match) return;
    setSelectedIso(match.iso);
    setIsoTouched(true);
    setLocalNumber(phone.slice(match.dialCode.length));
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
      // Without a resolved country there is no dial code to prefix, so an
      // entered number would be stored unqualified. Skip it instead.
      const phoneE164 = localNumber.trim() && selectedIso
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
                onChange={(v) => {
                  if (!v) return;
                  setSelectedIso(v);
                  setIsoTouched(true);
                }}
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
