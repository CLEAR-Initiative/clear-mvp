"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { TeamLocation } from "~/lib/types/teams";

export default function TeamSettingsPage() {
  const t = useTranslations("settings.team");
  const tCommon = useTranslations("common.actions");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const teamQuery = api.teams.team.useQuery({ id });
  // Fetch the parent org so we can offer its members as a dropdown for "Add
  // member" - only fires once we know the org id from the team query.
  const orgId = teamQuery.data?.organisation.id;
  const orgQuery = api.teams.organisation.useQuery(
    { id: orgId ?? "" },
    { enabled: !!orgId },
  );
  const updateTeam = api.teams.updateTeam.useMutation();
  const deleteTeam = api.teams.deleteTeam.useMutation();
  const addMember = api.teams.addTeamMember.useMutation();
  const removeMember = api.teams.removeTeamMember.useMutation();
  const updateRole = api.teams.updateTeamMemberRole.useMutation();
  const setLocations = api.teams.setTeamLocations.useMutation();
  const locationsQuery = api.teams.locations.useQuery({ level: 0 });
  const utils = api.useUtils();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const [editingLocations, setEditingLocations] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("analyst");

  const team = teamQuery.data;

  // Org members not yet in the team - Mantine Select shape.
  const addableMembers = useMemo(() => {
    const orgMembers = orgQuery.data?.members ?? [];
    const inTeam = new Set(team?.members?.map((m) => m.user.id) ?? []);
    return orgMembers
      .filter((m) => !inTeam.has(m.user.id))
      .map((m) => ({
        value: m.user.id,
        label: m.user.name ? `${m.user.name} (${m.user.email})` : m.user.email,
      }));
  }, [orgQuery.data, team?.members]);

  if (teamQuery.isLoading) {
    return (
      <Box p="xl" ta="center">
        <Loader size="sm" />
      </Box>
    );
  }

  if (!team) {
    return (
      <Box p="xl">
        <Text c="dimmed">{t("notFound")}</Text>
      </Box>
    );
  }

  function startEditing() {
    if (!team) return;
    setEditName(team.name);
    setEditSlug(team.slug);
    setEditDesc(team.description ?? "");
    setEditing(true);
  }

  async function saveDetails() {
    await updateTeam.mutateAsync({
      id,
      name: editName,
      slug: editSlug,
      description: editDesc || undefined,
    });
    setEditing(false);
    void utils.teams.team.invalidate({ id });
  }

  function startEditingLocations() {
    if (!team) return;
    setSelectedLocationIds(team.locations?.map((l) => l.id) ?? []);
    setEditingLocations(true);
  }

  async function saveLocations() {
    await setLocations.mutateAsync({ teamId: id, locationIds: selectedLocationIds });
    setEditingLocations(false);
    void utils.teams.team.invalidate({ id });
  }

  function toggleLocation(locId: string) {
    setSelectedLocationIds((prev) =>
      prev.includes(locId) ? prev.filter((x) => x !== locId) : [...prev, locId],
    );
  }

  async function handleAddMember() {
    if (!newMemberId) return;
    await addMember.mutateAsync({ teamId: id, userId: newMemberId, role: newMemberRole });
    setNewMemberId("");
    void utils.teams.team.invalidate({ id });
  }

  async function handleRemoveMember(userId: string) {
    await removeMember.mutateAsync({ teamId: id, userId });
    void utils.teams.team.invalidate({ id });
  }

  async function handleRoleChange(userId: string, role: string) {
    await updateRole.mutateAsync({ teamId: id, userId, role });
    void utils.teams.team.invalidate({ id });
  }

  async function handleDelete() {
    if (!confirm(t("danger.confirm"))) return;
    await deleteTeam.mutateAsync({ id });
    router.push("/settings/org");
  }

  return (
    <Box p="xl" maw={900} mx="auto">
      <Group justify="space-between" mb="lg">
        <Box>
          <Title order={2}>{team.name}</Title>
          <Text size="sm" c="dimmed">
            {team.organisation.name}
          </Text>
        </Box>
        <Button variant="subtle" size="xs" component="a" href="/settings/org">
          {t("backToOrg")}
        </Button>
      </Group>

      <Stack gap="xl">
        {/* ── Details ──────────────────────────── */}
        <Box>
          <Group justify="space-between" mb="sm">
            <Title order={4}>{t("details.title")}</Title>
            {!editing && (
              <Button variant="subtle" size="xs" onClick={startEditing}>
                {tCommon("edit")}
              </Button>
            )}
          </Group>
          {editing ? (
            <Stack gap="sm">
              <TextInput label={t("details.nameLabel")} value={editName} onChange={(e) => setEditName(e.currentTarget.value)} />
              <TextInput label={t("details.slugLabel")} value={editSlug} onChange={(e) => setEditSlug(e.currentTarget.value)} />
              <Textarea label={t("details.descriptionLabel")} value={editDesc} onChange={(e) => setEditDesc(e.currentTarget.value)} />
              <Group>
                <Button size="xs" onClick={saveDetails} loading={updateTeam.isPending}>
                  {tCommon("save")}
                </Button>
                <Button size="xs" variant="subtle" onClick={() => setEditing(false)}>
                  {tCommon("cancel")}
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap={4}>
              <Text><Text span fw={600}>{t("details.name")}</Text> {team.name}</Text>
              <Text><Text span fw={600}>{t("details.slug")}</Text> {team.slug}</Text>
              <Text><Text span fw={600}>{t("details.description")}</Text> {team.description ?? "-"}</Text>
            </Stack>
          )}
        </Box>

        {/* ── Members ─────────────────────────── */}
        <Box>
          <Title order={4} mb="sm">{t("members.title")}</Title>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("members.columns.name")}</Table.Th>
                <Table.Th>{t("members.columns.email")}</Table.Th>
                <Table.Th>{t("members.columns.role")}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {team.members?.map((m) => (
                <Table.Tr key={m.id}>
                  <Table.Td>{m.user.name}</Table.Td>
                  <Table.Td>{m.user.email}</Table.Td>
                  <Table.Td>
                    <Select
                      data={["lead", "analyst", "viewer"]}
                      value={m.role}
                      onChange={(v) => v && handleRoleChange(m.user.id, v)}
                      size="xs"
                      w={110}
                    />
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleRemoveMember(m.user.id)}
                      loading={removeMember.isPending}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Group mt="sm" gap="sm" align="flex-end">
            <Select
              label={t("members.addMemberLabel")}
              placeholder={
                orgQuery.isLoading
                  ? t("members.loadingPlaceholder")
                  : addableMembers.length === 0
                    ? t("members.allInTeam")
                    : t("members.selectUserPlaceholder")
              }
              data={addableMembers}
              value={newMemberId || null}
              onChange={(v) => setNewMemberId(v ?? "")}
              disabled={orgQuery.isLoading || addableMembers.length === 0}
              size="xs"
              searchable
              nothingFoundMessage={t("members.noMatchingUsers")}
              w={280}
            />
            <Select
              label={t("members.roleLabel")}
              data={["lead", "analyst", "viewer"]}
              value={newMemberRole}
              onChange={(v) => setNewMemberRole(v ?? "analyst")}
              size="xs"
              w={110}
            />
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={handleAddMember}
              loading={addMember.isPending}
              disabled={!newMemberId}
            >
              {t("members.add")}
            </Button>
          </Group>
        </Box>

        {/* ── Location Scope ──────────────────── */}
        <Box>
          <Group justify="space-between" mb="sm">
            <Title order={4}>{t("locations.title")}</Title>
            {!editingLocations && (
              <Button variant="subtle" size="xs" onClick={startEditingLocations}>
                {tCommon("edit")}
              </Button>
            )}
          </Group>
          {editingLocations ? (
            <Stack gap="sm">
              {locationsQuery.isLoading ? (
                <Loader size="sm" />
              ) : (
                <LocationTree
                  locations={locationsQuery.data ?? []}
                  selectedIds={selectedLocationIds}
                  onToggle={toggleLocation}
                />
              )}
              <Group>
                <Button size="xs" onClick={saveLocations} loading={setLocations.isPending}>
                  {t("locations.save")}
                </Button>
                <Button size="xs" variant="subtle" onClick={() => setEditingLocations(false)}>
                  {tCommon("cancel")}
                </Button>
              </Group>
            </Stack>
          ) : (
            <Group gap="xs">
              {team.locations?.length ? (
                team.locations.map((loc) => (
                  <Badge key={loc.id} variant="light" size="sm">
                    {loc.name} (L{loc.level})
                  </Badge>
                ))
              ) : (
                <Text size="sm" c="dimmed">
                  {t("locations.none")}
                </Text>
              )}
            </Group>
          )}
        </Box>

        {/* ── Danger Zone ─────────────────────── */}
        <Box
          p="md"
          style={{
            border: "1px solid #FCA5A5",
            borderRadius: 8,
            background: "#FEF2F2",
          }}
        >
          <Title order={4} c="red" mb="xs">
            {t("danger.title")}
          </Title>
          <Text size="sm" mb="sm">
            {t("danger.warning")}
          </Text>
          <Button color="red" variant="outline" size="xs" onClick={handleDelete} loading={deleteTeam.isPending}>
            {t("danger.delete")}
          </Button>
        </Box>
      </Stack>
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
