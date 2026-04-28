"use client";

import { type ChangeEvent, useState } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconTrash, IconUserPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";

type TeamRole = "lead" | "analyst" | "viewer";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const CAN_CREATE_ORG_ROLES = ["admin", "org_admin"];

export default function OrgSettingsPage() {
  const orgsQuery = api.teams.myOrganisations.useQuery();
  const authQuery = api.auth.me.useQuery();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);

  const orgs = orgsQuery.data ?? [];
  const activeOrg = orgs.find((o) => o.id === selectedOrgId) ?? orgs[0] ?? null;
  const userRole = authQuery.data?.user?.role ?? "";
  const canCreateOrg = CAN_CREATE_ORG_ROLES.includes(userRole);

  if (orgsQuery.isLoading || authQuery.isLoading) {
    return (
      <Box p="xl" ta="center">
        <Loader size="sm" />
      </Box>
    );
  }

  if (!activeOrg) {
    return (
      <Box p="xl">
        <Text c="dimmed" mb="md">You don&apos;t belong to any organisations yet.</Text>
        {canCreateOrg && (
          <>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
              Create Organisation
            </Button>
            <CreateOrgModal opened={createModalOpened} onClose={closeCreateModal} />
          </>
        )}
      </Box>
    );
  }

  return (
    <Box p="xl" maw={900} mx="auto">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Organisation Settings</Title>
        {canCreateOrg && (
          <Button variant="light" leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            New Organisation
          </Button>
        )}
      </Group>

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

      <OrgDetail orgId={activeOrg.id} userRole={userRole} />
      <CreateOrgModal opened={createModalOpened} onClose={closeCreateModal} />
    </Box>
  );
}

/* ─── Create Organisation Modal ────────────────────────────── */
function CreateOrgModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const createOrg = api.teams.createOrganisation.useMutation();
  const utils = api.useUtils();

  async function handleCreate() {
    if (!name || !slug) return;
    await createOrg.mutateAsync({ name, slug });
    setName("");
    setSlug("");
    onClose();
    void utils.teams.myOrganisations.invalidate();
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Create Organisation" centered size="sm">
      <Stack gap="sm">
        <TextInput
          label="Name"
          placeholder="e.g. ACME Relief"
          value={name}
          onChange={(e) => {
            setName(e.currentTarget.value);
            setSlug(slugify(e.currentTarget.value));
          }}
          required
        />
        <TextInput
          label="Slug"
          placeholder="acme-relief"
          value={slug}
          onChange={(e) => setSlug(e.currentTarget.value)}
          required
        />
        {createOrg.error && (
          <Text c="red" size="sm">{createOrg.error.message}</Text>
        )}
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} loading={createOrg.isPending} disabled={!name || !slug}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/* ─── Org Detail ───────────────────────────────────────────── */
function OrgDetail({ orgId, userRole }: { orgId: string; userRole: string }) {
  const orgQuery = api.teams.organisation.useQuery({ id: orgId });
  const usersQuery = api.auth.listUsers.useQuery(undefined, { staleTime: 60_000 });
  const updateOrg = api.teams.updateOrganisation.useMutation();
  const addMember = api.teams.addOrgMember.useMutation();
  const removeMember = api.teams.removeOrgMember.useMutation();
  const createTeam = api.teams.createTeam.useMutation();
  const utils = api.useUtils();

  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editing, setEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<string>("member");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSlug, setNewTeamSlug] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");

  // Invite-by-email state
  const [inviteOpened, { open: openInvite, close: closeInvite }] = useDisclosure(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteTeams, setInviteTeams] = useState<Record<string, TeamRole>>({});
  const [inviteError, setInviteError] = useState("");
  const inviteMutation = api.invitations.invite.useMutation({
    onSuccess: () => {
      closeInvite();
      setInviteEmail("");
      setInviteRole("member");
      setInviteTeams({});
      setInviteError("");
      void utils.teams.organisation.invalidate({ id: orgId });
    },
    onError: (err) => setInviteError(err.message),
  });

  const org = orgQuery.data;

  if (orgQuery.isLoading || !org) {
    return <Loader size="sm" />;
  }

  // User can edit if they're a global admin/org_admin, or an org-level owner/admin
  const isGlobalPrivileged = userRole === "admin" || userRole === "org_admin";
  const currentOrgMember = org.members?.find(() => true); // TODO: match by current user ID when available
  const isOrgOwnerOrAdmin = currentOrgMember?.role === "owner" || currentOrgMember?.role === "admin";
  const canEdit = isGlobalPrivileged || isOrgOwnerOrAdmin;

  // Build user options for the member selector, excluding existing members
  const existingMemberIds = new Set(org.members?.map((m) => m.user.id) ?? []);
  const userOptions = (usersQuery.data?.users ?? [])
    .filter((u) => !existingMemberIds.has(u.id) && u.isActive)
    .map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }));

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
    if (!selectedUserId) return;
    await addMember.mutateAsync({
      orgId,
      userId: selectedUserId,
      role: newMemberRole,
    });
    setSelectedUserId(null);
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
        <Group justify="space-between" mb="sm">
          <Title order={4}>Members</Title>
          {canEdit && (
            <Button
              variant="light"
              size="xs"
              leftSection={<IconUserPlus size={14} />}
              onClick={() => {
                setInviteError("");
                openInvite();
              }}
            >
              Invite User
            </Button>
          )}
        </Group>
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
            <Select
              placeholder="Select user to add"
              data={userOptions}
              value={selectedUserId}
              onChange={setSelectedUserId}
              searchable
              size="xs"
              w={280}
              nothingFoundMessage="No users available"
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
              disabled={!selectedUserId}
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

      {/* ── Invite User Modal ──────────────────────── */}
      <Modal
        opened={inviteOpened}
        onClose={() => {
          closeInvite();
          setInviteError("");
        }}
        title="Invite User"
        centered
        size="md"
      >
        <Stack gap="sm">
          {inviteError && (
            <Text c="red" size="sm">
              {inviteError}
            </Text>
          )}
          <TextInput
            label="Email"
            placeholder="user@example.com"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.currentTarget.value)}
            required
          />
          <Select
            label="Organisation Role"
            value={inviteRole}
            onChange={(v) => v && setInviteRole(v)}
            data={[
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
              { value: "owner", label: "Owner" },
            ]}
          />
          <Box>
            <Text fw={500} size="sm" mb={6}>
              Teams <Text component="span" c="red">*</Text>
            </Text>
            {!org.teams || org.teams.length === 0 ? (
              <Text size="sm" c="dimmed">
                This organisation has no teams. Create one before inviting.
              </Text>
            ) : (
              <Stack gap={6}>
                {org.teams.map((t) => {
                  const selectedRole = inviteTeams[t.id];
                  const isSelected = selectedRole !== undefined;
                  return (
                    <Group key={t.id} gap={8} wrap="nowrap" align="center">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const checked = e.currentTarget.checked;
                          setInviteTeams((prev) => {
                            const next = { ...prev };
                            if (checked) next[t.id] = "viewer";
                            else delete next[t.id];
                            return next;
                          });
                        }}
                        label={t.name}
                      />
                      <Box style={{ flex: 1 }} />
                      <Select
                        size="xs"
                        value={selectedRole ?? "viewer"}
                        onChange={(v) => {
                          if (!v || !isSelected) return;
                          setInviteTeams((prev) => ({
                            ...prev,
                            [t.id]: v as TeamRole,
                          }));
                        }}
                        data={[
                          { value: "viewer", label: "Viewer" },
                          { value: "analyst", label: "Analyst" },
                          { value: "lead", label: "Lead" },
                        ]}
                        disabled={!isSelected}
                        w={110}
                      />
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Box>
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={closeInvite}>
              Cancel
            </Button>
            <Button
              leftSection={<IconUserPlus size={14} />}
              loading={inviteMutation.isPending}
              onClick={() => {
                setInviteError("");
                const teams = Object.entries(inviteTeams).map(
                  ([teamId, teamRole]) => ({ teamId, teamRole }),
                );
                if (teams.length === 0) {
                  setInviteError("Select at least one team");
                  return;
                }
                inviteMutation.mutate({
                  email: inviteEmail.trim(),
                  organisationId: orgId,
                  role: inviteRole,
                  teams,
                });
              }}
              disabled={
                !inviteEmail.trim() || Object.keys(inviteTeams).length === 0
              }
            >
              Send Invitation
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
