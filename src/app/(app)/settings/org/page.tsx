"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { api } from "~/trpc/react";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OrgSettingsPage() {
  const orgsQuery = api.teams.myOrganisations.useQuery();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const orgs = orgsQuery.data ?? [];
  const activeOrg = orgs.find((o) => o.id === selectedOrgId) ?? orgs[0] ?? null;

  if (orgsQuery.isLoading) {
    return (
      <Box p="xl" ta="center">
        <Loader size="sm" />
      </Box>
    );
  }

  if (!activeOrg) {
    return (
      <Box p="xl">
        <Text c="dimmed">You don&apos;t belong to any organisations yet.</Text>
      </Box>
    );
  }

  return (
    <Box p="xl" maw={900} mx="auto">
      <Title order={2} mb="lg">
        Organisation Settings
      </Title>

      {orgs.length > 1 && (
        <Select
          label="Organisation"
          data={orgs.map((o) => ({ value: o.id, label: o.name }))}
          value={activeOrg.id}
          onChange={(v) => setSelectedOrgId(v)}
          mb="lg"
          maw={300}
        />
      )}

      <OrgDetail orgId={activeOrg.id} />
    </Box>
  );
}

function OrgDetail({ orgId }: { orgId: string }) {
  const orgQuery = api.teams.organisation.useQuery({ id: orgId });
  const updateOrg = api.teams.updateOrganisation.useMutation();
  const addMember = api.teams.addOrgMember.useMutation();
  const removeMember = api.teams.removeOrgMember.useMutation();
  const createTeam = api.teams.createTeam.useMutation();
  const utils = api.useUtils();

  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editing, setEditing] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<string>("member");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSlug, setNewTeamSlug] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");

  const org = orgQuery.data;

  if (orgQuery.isLoading || !org) {
    return <Loader size="sm" />;
  }

  const currentUserMember = org.members?.find(() => true); // TODO: match by current user ID
  const canEdit = true; // TODO: check role from currentUserMember

  function startEditing() {
    if (!org) return;
    setEditName(org.name);
    setEditSlug(org.slug);
    setEditing(true);
  }

  async function saveDetails() {
    await updateOrg.mutateAsync({ id: orgId, name: editName, slug: editSlug });
    setEditing(false);
    void utils.teams.organisation.invalidate({ id: orgId });
    void utils.teams.myOrganisations.invalidate();
  }

  async function handleAddMember() {
    if (!newMemberEmail) return;
    // The API expects userId; in a real implementation you'd resolve email → userId
    await addMember.mutateAsync({
      orgId,
      userId: newMemberEmail,
      role: newMemberRole,
    });
    setNewMemberEmail("");
    void utils.teams.organisation.invalidate({ id: orgId });
  }

  async function handleRemoveMember(userId: string) {
    await removeMember.mutateAsync({ orgId, userId });
    void utils.teams.organisation.invalidate({ id: orgId });
  }

  async function handleCreateTeam() {
    if (!newTeamName || !newTeamSlug) return;
    await createTeam.mutateAsync({
      organisationId: orgId,
      name: newTeamName,
      slug: newTeamSlug,
      description: newTeamDescription || undefined,
    });
    setNewTeamName("");
    setNewTeamSlug("");
    setNewTeamDescription("");
    setCreatingTeam(false);
    void utils.teams.organisation.invalidate({ id: orgId });
    void utils.teams.myTeams.invalidate();
  }

  return (
    <Stack gap="xl">
      {/* ── Details ──────────────────────────────────── */}
      <Box>
        <Group justify="space-between" mb="sm">
          <Title order={4}>Details</Title>
          {canEdit && !editing && (
            <Button variant="subtle" size="xs" onClick={startEditing}>
              Edit
            </Button>
          )}
        </Group>
        {editing ? (
          <Stack gap="sm">
            <TextInput label="Name" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} />
            <TextInput label="Slug" value={editSlug} onChange={(e) => setEditSlug(e.currentTarget.value)} />
            <Group>
              <Button size="xs" onClick={saveDetails} loading={updateOrg.isPending}>
                Save
              </Button>
              <Button size="xs" variant="subtle" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        ) : (
          <Stack gap={4}>
            <Text>
              <Text span fw={600}>Name:</Text> {org.name}
            </Text>
            <Text>
              <Text span fw={600}>Slug:</Text> {org.slug}
            </Text>
            <Text>
              <Text span fw={600}>Status:</Text>{" "}
              <Badge size="sm" color={org.isActive ? "green" : "gray"}>
                {org.isActive ? "Active" : "Inactive"}
              </Badge>
            </Text>
          </Stack>
        )}
      </Box>

      {/* ── Members ─────────────────────────────────── */}
      <Box>
        <Title order={4} mb="sm">
          Members
        </Title>
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
            {org.members?.map((m) => (
              <Table.Tr key={m.id}>
                <Table.Td>{m.user.name}</Table.Td>
                <Table.Td>{m.user.email}</Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light">
                    {m.role}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {canEdit && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleRemoveMember(m.user.id)}
                      loading={removeMember.isPending}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {canEdit && (
          <Group mt="sm" gap="sm">
            <TextInput
              placeholder="User ID or email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.currentTarget.value)}
              size="xs"
            />
            <Select
              data={["owner", "admin", "member"]}
              value={newMemberRole}
              onChange={(v) => setNewMemberRole(v ?? "member")}
              size="xs"
              w={120}
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
        )}
      </Box>

      {/* ── Teams ───────────────────────────────────── */}
      <Box>
        <Group justify="space-between" mb="sm">
          <Title order={4}>Teams</Title>
          {canEdit && !creatingTeam && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => setCreatingTeam(true)}
            >
              Add Team
            </Button>
          )}
        </Group>
        <Stack gap="xs">
          {org.teams?.map((t) => (
            <Group key={t.id} justify="space-between" p="xs" style={{ border: "1px solid #E5E5E5", borderRadius: 6 }}>
              <Box>
                <Text fw={500}>{t.name}</Text>
                {t.description && (
                  <Text size="xs" c="dimmed">
                    {t.description}
                  </Text>
                )}
              </Box>
              <Button
                component={Link}
                href={`/settings/team/${t.id}`}
                variant="subtle"
                size="xs"
              >
                Manage
              </Button>
            </Group>
          ))}
          {creatingTeam && (
            <Box p="xs" style={{ border: "1px solid #E5E5E5", borderRadius: 6 }}>
              <Stack gap="sm">
                <TextInput
                  label="Team name"
                  placeholder="e.g. Sudan Response"
                  value={newTeamName}
                  onChange={(e) => {
                    setNewTeamName(e.currentTarget.value);
                    setNewTeamSlug(slugify(e.currentTarget.value));
                  }}
                  required
                />
                <TextInput
                  label="Slug"
                  placeholder="sudan-response"
                  value={newTeamSlug}
                  onChange={(e) => setNewTeamSlug(e.currentTarget.value)}
                  required
                />
                <TextInput
                  label="Description (optional)"
                  placeholder="What does this team monitor?"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.currentTarget.value)}
                />
                {createTeam.error && (
                  <Text c="red" size="sm">
                    {createTeam.error.message}
                  </Text>
                )}
                <Group justify="flex-end">
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => {
                      setCreatingTeam(false);
                      setNewTeamName("");
                      setNewTeamSlug("");
                      setNewTeamDescription("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleCreateTeam}
                    loading={createTeam.isPending}
                    disabled={!newTeamName || !newTeamSlug}
                  >
                    Create Team
                  </Button>
                </Group>
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
