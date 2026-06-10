"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Stack,
  Stepper,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { useTeam } from "~/providers/team-provider";
import type { TeamLocation } from "~/lib/types/teams";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { switchTeam } = useTeam();
  const [active, setActive] = useState(0);

  // Step 1: Organisation
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);

  // Step 2: Team
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);

  // Step 3: Locations
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const createOrg = api.teams.createOrganisation.useMutation();
  const createTeam = api.teams.createTeam.useMutation();
  const setLocations = api.teams.setTeamLocations.useMutation();
  const locationsQuery = api.teams.locations.useQuery({ level: 0 });

  const isSaving = createOrg.isPending || createTeam.isPending || setLocations.isPending;

  async function handleCreateOrg() {
    const org = await createOrg.mutateAsync({ name: orgName, slug: orgSlug });
    setOrgId(org.id);
    setActive(1);
  }

  async function handleCreateTeam() {
    if (!orgId) return;
    const team = await createTeam.mutateAsync({
      organisationId: orgId,
      name: teamName,
      slug: teamSlug,
      description: teamDescription || undefined,
    });
    setTeamId(team.id);
    setActive(2);
  }

  async function handleSetLocations() {
    if (!teamId) return;
    await setLocations.mutateAsync({
      teamId,
      locationIds: selectedLocationIds,
    });
    setActive(3);
  }

  async function handleFinish() {
    if (teamId) {
      switchTeam(teamId);
    }
    // Invalidate myTeams cache so OnboardingGuard sees the new team
    await queryClient.invalidateQueries({ queryKey: [["teams", "myTeams"]] });
    router.push("/dashboard");
  }

  function toggleLocation(id: string) {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <Box p="xl" maw={640} mx="auto" mt="xl">
      <Title order={2} mb="xl">
        {t("title")}
      </Title>
      <Text c="dimmed" mb="xl">
        {t("subtitle")}
      </Text>

      <Stepper active={active} size="sm" mb="xl">
        <Stepper.Step label={t("steps.org.label")} description={t("steps.org.description")}>
          <Stack gap="sm" mt="md">
            <TextInput
              label={t("org.nameLabel")}
              placeholder={t("org.namePlaceholder")}
              value={orgName}
              onChange={(e) => {
                setOrgName(e.currentTarget.value);
                setOrgSlug(slugify(e.currentTarget.value));
              }}
              required
            />
            <TextInput
              label={t("org.slugLabel")}
              placeholder={t("org.slugPlaceholder")}
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.currentTarget.value)}
              required
            />
            {createOrg.error && (
              <Text c="red" size="sm">
                {createOrg.error.message}
              </Text>
            )}
            <Group justify="flex-end">
              <Button onClick={handleCreateOrg} loading={createOrg.isPending} disabled={!orgName || !orgSlug}>
                {t("org.create")}
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={t("steps.team.label")} description={t("steps.team.description")}>
          <Stack gap="sm" mt="md">
            <TextInput
              label={t("team.nameLabel")}
              placeholder={t("team.namePlaceholder")}
              value={teamName}
              onChange={(e) => {
                setTeamName(e.currentTarget.value);
                setTeamSlug(slugify(e.currentTarget.value));
              }}
              required
            />
            <TextInput
              label={t("team.slugLabel")}
              placeholder={t("team.slugPlaceholder")}
              value={teamSlug}
              onChange={(e) => setTeamSlug(e.currentTarget.value)}
              required
            />
            <TextInput
              label={t("team.descriptionLabel")}
              placeholder={t("team.descriptionPlaceholder")}
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.currentTarget.value)}
            />
            {createTeam.error && (
              <Text c="red" size="sm">
                {createTeam.error.message}
              </Text>
            )}
            <Group justify="flex-end">
              <Button onClick={handleCreateTeam} loading={createTeam.isPending} disabled={!teamName || !teamSlug}>
                {t("team.create")}
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label={t("steps.locations.label")} description={t("steps.locations.description")}>
          <Stack gap="sm" mt="md">
            <Text size="sm" c="dimmed">
              {t("locations.intro")}
            </Text>
            {locationsQuery.isLoading ? (
              <Loader size="sm" />
            ) : (
              <LocationTree
                locations={locationsQuery.data ?? []}
                selectedIds={selectedLocationIds}
                onToggle={toggleLocation}
              />
            )}
            {setLocations.error && (
              <Text c="red" size="sm">
                {setLocations.error.message}
              </Text>
            )}
            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => setActive(3)}
              >
                {t("locations.skip")}
              </Button>
              <Button
                onClick={handleSetLocations}
                loading={setLocations.isPending}
                disabled={selectedLocationIds.length === 0}
              >
                {t("locations.save")}
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Completed>
          <Stack gap="md" mt="md" align="center">
            <Title order={3}>{t("done.title")}</Title>
            <Text c="dimmed">
              {t("done.text")}
            </Text>
            <Button onClick={handleFinish} loading={isSaving}>
              {t("done.cta")}
            </Button>
          </Stack>
        </Stepper.Completed>
      </Stepper>
    </Box>
  );
}

function LocationTree({
  locations,
  selectedIds,
  onToggle,
}: {
  locations: TeamLocation[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <Stack gap={4}>
      {locations.map((loc) => (
        <Box key={loc.id}>
          <Checkbox
            label={loc.name}
            checked={selectedIds.includes(loc.id)}
            onChange={() => onToggle(loc.id)}
          />
          {loc.children?.length > 0 && (
            <Box ms="lg" mt={4}>
              <LocationTree
                locations={loc.children}
                selectedIds={selectedIds}
                onToggle={onToggle}
              />
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );
}
