"use client";

import { useState } from "react";
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
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { TeamLocation } from "~/lib/types/teams";

export default function TeamSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const teamQuery = api.teams.team.useQuery({ id });
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
        <Text c="dimmed">Team not found.</Text>
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
    if (!confirm("Are you sure you want to delete this team? This cannot be undone.")) return;
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
          Back to Organisation
        </Button>
      </Group>

      <Stack gap="xl">
        {/* ── Details ──────────────────────────── */}
        <Box>
          <Group justify="space-between" mb="sm">
            <Title order={4}>Details</Title>
            {!editing && (
              <Button variant="subtle" size="xs" onClick={startEditing}>
                Edit
              </Button>
            )}
          </Group>
          {editing ? (
            <Stack gap="sm">
              <TextInput label="Name" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} />
              <TextInput label="Slug" value={editSlug} onChange={(e) => setEditSlug(e.currentTarget.value)} />
              <Textarea label="Description" value={editDesc} onChange={(e) => setEditDesc(e.currentTarget.value)} />
              <Group>
                <Button size="xs" onClick={saveDetails} loading={updateTeam.isPending}>
                  Save
                </Button>
                <Button size="xs" variant="subtle" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap={4}>
              <Text><Text span fw={600}>Name:</Text> {team.name}</Text>
              <Text><Text span fw={600}>Slug:</Text> {team.slug}</Text>
              <Text><Text span fw={600}>Description:</Text> {team.description ?? "—"}</Text>
            </Stack>
          )}
        </Box>

        {/* ── Members ─────────────────────────── */}
        <Box>
          <Title order={4} mb="sm">Members</Title>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
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
          <Group mt="sm" gap="sm">
            <TextInput
              placeholder="User ID or email"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.currentTarget.value)}
              size="xs"
            />
            <Select
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
            >
              Add
            </Button>
          </Group>
        </Box>

        {/* ── Location Scope ──────────────────── */}
        <Box>
          <Group justify="space-between" mb="sm">
            <Title order={4}>Location Scope</Title>
            {!editingLocations && (
              <Button variant="subtle" size="xs" onClick={startEditingLocations}>
                Edit
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
                  Save Locations
                </Button>
                <Button size="xs" variant="subtle" onClick={() => setEditingLocations(false)}>
                  Cancel
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
                  No locations selected
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
            Danger Zone
          </Title>
          <Text size="sm" mb="sm">
            Deleting this team is permanent and cannot be undone.
          </Text>
          <Button color="red" variant="outline" size="xs" onClick={handleDelete} loading={deleteTeam.isPending}>
            Delete Team
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
