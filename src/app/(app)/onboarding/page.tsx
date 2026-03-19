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
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import type { TeamLocation } from "~/lib/types/teams";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
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

  function handleFinish() {
    if (teamId) {
      switchTeam(teamId);
    }
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
        Welcome to CLEAR
      </Title>
      <Text c="dimmed" mb="xl">
        Let&apos;s set up your organisation, team, and monitoring locations.
      </Text>

      <Stepper active={active} size="sm" mb="xl">
        <Stepper.Step label="Organisation" description="Create or join">
          <Stack gap="sm" mt="md">
            <TextInput
              label="Organisation name"
              placeholder="e.g. NRC East Africa"
              value={orgName}
              onChange={(e) => {
                setOrgName(e.currentTarget.value);
                setOrgSlug(slugify(e.currentTarget.value));
              }}
              required
            />
            <TextInput
              label="Slug"
              placeholder="nrc-east-africa"
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
                Create Organisation
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Team" description="Create a team">
          <Stack gap="sm" mt="md">
            <TextInput
              label="Team name"
              placeholder="e.g. Sudan Response"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.currentTarget.value);
                setTeamSlug(slugify(e.currentTarget.value));
              }}
              required
            />
            <TextInput
              label="Slug"
              placeholder="sudan-response"
              value={teamSlug}
              onChange={(e) => setTeamSlug(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Description (optional)"
              placeholder="What does this team monitor?"
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
                Create Team
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Locations" description="Choose monitoring scope">
          <Stack gap="sm" mt="md">
            <Text size="sm" c="dimmed">
              Select the countries and regions your team will monitor.
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
                Skip
              </Button>
              <Button
                onClick={handleSetLocations}
                loading={setLocations.isPending}
                disabled={selectedLocationIds.length === 0}
              >
                Save Locations
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Completed>
          <Stack gap="md" mt="md" align="center">
            <Title order={3}>You&apos;re all set!</Title>
            <Text c="dimmed">
              Your organisation and team are ready. Head to the dashboard to start monitoring.
            </Text>
            <Button onClick={handleFinish} loading={isSaving}>
              Go to Dashboard
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
            <Box ml="lg" mt={4}>
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
