"use client";

import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBuilding,
  IconDatabase,
  IconExternalLink,
  IconLock,
  IconMail,
  IconMailForward,
  IconPlus,
  IconRefresh,
  IconToggleLeft,
  IconTrash,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/components/feature-flags-provider";
import { TIER_LABELS } from "~/lib/constants/feature-flags";
import { PageHeader, StatsGrid } from "~/components/ui";
import type { StatItem } from "~/components/ui";
import { colors, fontSizesPx, spacingPx } from "~/lib/tokens";

/* ─── Shared ──────────────────────────────────────────────── */
const border = `1px solid ${colors.border}`;

/* ─── Features tab helpers ────────────────────────────────── */
const tierColors: Record<number, string> = {
  1: colors.textSecondary,
  2: colors.success,
  3: colors.warning,
  4: colors.critical,
};
const tierBadgeColors: Record<number, string> = {
  1: "gray",
  2: "green",
  3: "yellow",
  4: "red",
};

/* ─── Users tab types & constants ─────────────────────────── */
type GqlUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  isActive: boolean;
};

type FilterMode = "all" | "pending";

type PendingAction =
  | { type: "role"; user: GqlUser; newRole: string }
  | { type: "delete"; user: GqlUser };

const ROLES = [
  { value: "field", label: "Field" },
  { value: "analyst", label: "Analyst" },
  { value: "org_admin", label: "Org Admin" },
  { value: "admin", label: "Admin" },
];

const roleColor: Record<string, string> = {
  admin: "orange",
  org_admin: "grape",
  analyst: "blue",
  field: "green",
  viewer: "gray",
  user: "gray",
};

/* ─── Hold-to-confirm button ──────────────────────────────── */
function HoldToConfirmButton({
  onConfirm,
  label = "Hold to confirm",
  duration = 2000,
  danger = true,
}: {
  onConfirm: () => void;
  label?: string;
  duration?: number;
  danger?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const fillColor = danger ? colors.critical : colors.accent;

  const startHold = useCallback(() => {
    startTimeRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - (startTimeRef.current ?? now);
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);
      if (p < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onConfirm();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [duration, onConfirm]);

  const stopHold = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startTimeRef.current = null;
    setProgress(0);
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={(e) => {
        e.preventDefault();
        startHold();
      }}
      onTouchEnd={stopHold}
      onTouchCancel={stopHold}
      style={{
        position: "relative",
        overflow: "hidden",
        background: fillColor,
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: `0 ${spacingPx[5]}px`,
        height: 36,
        minWidth: 160,
        fontSize: fontSizesPx.base,
        fontWeight: 600,
        cursor: "pointer",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Progress fill */}
      <Box
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${progress}%`,
          background: "rgba(255,255,255,0.22)",
          pointerEvents: "none",
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>
        {progress > 0 ? "Hold…" : label}
      </span>
    </button>
  );
}

/* ─── Confirm modal ───────────────────────────────────────── */
function ConfirmModal({
  action,
  onClose,
  onConfirm,
}: {
  action: PendingAction | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isDelete = action?.type === "delete";

  const title = isDelete ? "Remove from team" : "Confirm role change";

  const body = action ? (
    isDelete ? (
      <>
        Are you sure you want to remove{" "}
        <Text component="span" fw={600} c={colors.textPrimary}>
          {action.user.name}
        </Text>{" "}
        from your team? This action cannot be undone.
      </>
    ) : (
      <>
        Change{" "}
        <Text component="span" fw={600} c={colors.textPrimary}>
          {action.user.name}
        </Text>
        {"'s role from "}
        <Text component="span" fw={600} c={colors.textPrimary} tt="capitalize">
          {action.user.role}
        </Text>
        {" to "}
        <Text component="span" fw={600} c={colors.textPrimary} tt="capitalize">
          {(action as Extract<PendingAction, { type: "role" }>).newRole}
        </Text>
        {"?"}
      </>
    )
  ) : null;

  return (
    <Modal
      opened={!!action}
      onClose={onClose}
      title={
        <Text fw={600} style={{ fontSize: fontSizesPx.xl }}>
          {title}
        </Text>
      }
      centered
      size="sm"
      styles={{ header: { borderBottom: border, paddingBottom: spacingPx[4] } }}
    >
      <Text
        c={colors.textSecondary}
        style={{ fontSize: fontSizesPx.base, lineHeight: 1.6 }}
        mt={spacingPx[3]}
      >
        {body}
      </Text>

      <Text
        c={colors.textMuted}
        style={{ fontSize: fontSizesPx.sm, marginTop: spacingPx[4] }}
      >
        Press and hold the button below to confirm.
      </Text>

      <Group justify="flex-end" mt={spacingPx[5]} gap={spacingPx[3]}>
        <Button variant="subtle" color="gray" onClick={onClose}>
          Cancel
        </Button>
        <HoldToConfirmButton
          onConfirm={onConfirm}
          label={isDelete ? "Hold to remove" : "Hold to confirm"}
          danger={isDelete}
        />
      </Group>
    </Modal>
  );
}

/* ─── Users panel ─────────────────────────────────────────── */
function UsersPanel() {
  const { data, isLoading } = api.auth.listUsers.useQuery(undefined, {
    staleTime: 30_000,
  });

  const [localUsers, setLocalUsers] = useState<GqlUser[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  // Tracks the role shown in the Select while the modal is open
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.users) setLocalUsers(data.users as GqlUser[]);
  }, [data]);

  const filteredUsers =
    filter === "pending" ? localUsers.filter((u) => !u.isActive) : localUsers;

  const pendingCount = localUsers.filter((u) => !u.isActive).length;

  /* ── handlers ── */
  const handleRoleSelect = (user: GqlUser, newRole: string | null) => {
    if (!newRole || newRole === user.role) return;
    setPendingRoles((prev) => ({ ...prev, [user.id]: newRole }));
    setPendingAction({ type: "role", user, newRole });
  };

  const handleActivate = (user: GqlUser) => {
    setLocalUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: true } : u)),
    );
  };

  const handleDelete = (user: GqlUser) => {
    setPendingAction({ type: "delete", user });
  };

  const handleModalClose = () => {
    if (pendingAction?.type === "role") {
      const id = pendingAction.user.id;
      setPendingRoles((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    }
    setPendingAction(null);
  };

  const handleConfirm = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "role") {
      const id = pendingAction.user.id;
      setLocalUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, role: pendingAction.newRole } : u,
        ),
      );
      setPendingRoles((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    } else if (pendingAction.type === "delete") {
      setLocalUsers((prev) =>
        prev.filter((u) => u.id !== pendingAction.user.id),
      );
    }
    setPendingAction(null);
  };

  /* ── render ── */
  if (isLoading) {
    return (
      <Box p={24} style={{ display: "flex", justifyContent: "center" }}>
        <Loader />
      </Box>
    );
  }

  if (data?.error) {
    return (
      <Box p={24}>
        <Text c={colors.textMuted} style={{ fontSize: fontSizesPx.base }}>
          {data.error === "Unauthorized"
            ? "You need admin privileges to view user management."
            : data.error}
        </Text>
      </Box>
    );
  }

  const adminCount = localUsers.filter(
    (u) => u.role === "admin" || u.role === "org_admin",
  ).length;
  const activeCount = localUsers.filter((u) => u.isActive).length;

  const stats: StatItem[] = [
    { label: "Total Users", value: String(localUsers.length) },
    { label: "Admins", value: String(adminCount), color: colors.accent },
    { label: "Active", value: String(activeCount), color: colors.success },
  ];

  return (
    <Box p={24}>
      <StatsGrid stats={stats} cols={3} mb={24} />

      <Card p={0} style={{ border, overflow: "hidden" }}>
        {/* Card header with filter */}
        <Group
          px={20}
          py={12}
          justify="space-between"
          style={{ background: colors.bgPrimary, borderBottom: border }}
        >
          <Group gap={8}>
            <Select
              value={filter}
              onChange={(v) => v && setFilter(v as FilterMode)}
              data={[
                { value: "all", label: "All users" },
                { value: "pending", label: "Pending approval" },
              ]}
              size="xs"
              variant="unstyled"
              fw={600}
              style={{ fontSize: fontSizesPx.lg, width: 160 }}
              styles={{
                input: {
                  fontWeight: 600,
                  fontSize: fontSizesPx.lg,
                  color: colors.textPrimary,
                },
              }}
            />
            <Badge
              size="sm"
              variant="light"
              color={
                filter === "pending" && pendingCount > 0 ? "orange" : "gray"
              }
            >
              {filteredUsers.length}
            </Badge>
          </Group>
        </Group>

        {/* Table */}
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr style={{ background: colors.bgPrimary }}>
              {(["User", "Role", "Email", "Status", ""] as const).map((h) => (
                <Table.Th
                  key={h}
                  style={{
                    fontSize: fontSizesPx.sm,
                    color: colors.textMuted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: h === "" ? 40 : undefined,
                  }}
                >
                  {h}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredUsers.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text
                    c={colors.textMuted}
                    ta="center"
                    py={24}
                    style={{ fontSize: fontSizesPx.base }}
                  >
                    {filter === "pending"
                      ? "No users pending approval"
                      : "No users found"}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredUsers.map((user) => (
                <Table.Tr key={user.id}>
                  {/* User */}
                  <Table.Td>
                    <Group gap={10}>
                      <Avatar
                        src={user.image}
                        size={32}
                        radius="xl"
                        color="accent"
                      >
                        {user.name?.[0]?.toUpperCase() ?? "?"}
                      </Avatar>
                      <Box>
                        <Text
                          fw={500}
                          style={{
                            fontSize: fontSizesPx.base,
                            color: colors.textPrimary,
                          }}
                        >
                          {user.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: fontSizesPx.sm,
                            color: colors.textMuted,
                          }}
                        >
                          {user.emailVerified ? "Verified" : "Unverified"}
                        </Text>
                      </Box>
                    </Group>
                  </Table.Td>

                  {/* Role - dropdown */}
                  <Table.Td>
                    <Select
                      value={pendingRoles[user.id] ?? user.role}
                      onChange={(val) => handleRoleSelect(user, val)}
                      data={ROLES}
                      size="xs"
                      w={110}
                      styles={{
                        input: {
                          fontWeight: 600,
                          fontSize: fontSizesPx.sm,
                          textTransform: "capitalize",
                          color:
                            roleColor[user.role] === "orange"
                              ? colors.accent
                              : roleColor[user.role] === "grape"
                                ? colors.accent
                                : roleColor[user.role] === "blue"
                                  ? colors.info
                                  : roleColor[user.role] === "green"
                                    ? colors.success
                                    : colors.textMuted,
                        },
                      }}
                    />
                  </Table.Td>

                  {/* Email */}
                  <Table.Td>
                    <Text
                      style={{
                        fontSize: fontSizesPx.base,
                        color: colors.textSecondary,
                      }}
                    >
                      {user.email}
                    </Text>
                  </Table.Td>

                  {/* Status + Activate */}
                  <Table.Td>
                    <Group gap={8} wrap="nowrap">
                      <Badge
                        size="sm"
                        variant="dot"
                        color={user.isActive ? "green" : "orange"}
                      >
                        {user.isActive ? "Active" : "Pending"}
                      </Badge>
                      {!user.isActive && (
                        <Button
                          size="xs"
                          variant="light"
                          color="green"
                          leftSection={<IconUserCheck size={12} />}
                          onClick={() => handleActivate(user)}
                        >
                          Activate
                        </Button>
                      )}
                    </Group>
                  </Table.Td>

                  {/* Delete */}
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleDelete(user)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Card>

      <ConfirmModal
        action={pendingAction}
        onClose={handleModalClose}
        onConfirm={handleConfirm}
      />
    </Box>
  );
}

/* ─── Features panel ──────────────────────────────────────── */
function FeaturesPanel() {
  const { data: features, isLoading } = api.featureFlags.getAll.useQuery(
    undefined,
    {
      staleTime: 30_000,
    },
  );
  const { toggle } = useFeatureFlags();

  if (isLoading || !features) {
    return (
      <Box p={24} style={{ display: "flex", justifyContent: "center" }}>
        <Loader />
      </Box>
    );
  }

  const enabledCount = features.filter((f) => f.enabled).length;
  const disabledCount = features.filter((f) => !f.enabled).length;

  const stats: StatItem[] = [
    { label: "Total Features", value: String(features.length) },
    { label: "Enabled", value: String(enabledCount), color: colors.success },
    { label: "Disabled", value: String(disabledCount), color: colors.critical },
  ];

  const tiers = [1, 2, 3, 4] as const;
  const grouped = tiers.map((tier) => ({
    tier,
    label: TIER_LABELS[tier] ?? `Tier ${tier}`,
    features: features.filter((f) => f.tier === tier),
  }));

  return (
    <Box p={24}>
      <StatsGrid stats={stats} cols={3} mb={24} />

      <Stack gap={24}>
        {grouped.map((group) => (
          <Card key={group.tier} p={0} style={{ border, overflow: "hidden" }}>
            <Group
              px={20}
              py={12}
              justify="space-between"
              style={{ background: colors.bgPrimary, borderBottom: border }}
            >
              <Group gap={10}>
                <Box
                  w={4}
                  style={{
                    alignSelf: "stretch",
                    background: tierColors[group.tier],
                    borderRadius: 2,
                  }}
                />
                <Text
                  fw={600}
                  c={colors.textPrimary}
                  style={{ fontSize: fontSizesPx.lg }}
                >
                  {group.label}
                </Text>
                <Badge
                  size="sm"
                  color={tierBadgeColors[group.tier]}
                  variant="light"
                >
                  {group.features.length} features
                </Badge>
              </Group>
              {group.tier === 1 && (
                <Group gap={4}>
                  <IconLock size={14} style={{ color: colors.textMuted }} />
                  <Text size="xs" c={colors.textMuted}>
                    Always enabled
                  </Text>
                </Group>
              )}
            </Group>

            <Stack gap={0}>
              {group.features.map((feature, i) => {
                const isCore = feature.tier === 1;
                return (
                  <Group
                    key={feature.key}
                    px={20}
                    py={14}
                    justify="space-between"
                    wrap="nowrap"
                    style={{
                      borderBottom:
                        i < group.features.length - 1 ? border : undefined,
                      opacity: isCore ? 0.7 : 1,
                    }}
                  >
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group gap={8} mb={2}>
                        <Text
                          fw={500}
                          c={colors.textPrimary}
                          style={{ fontSize: fontSizesPx.lg }}
                        >
                          {feature.label}
                        </Text>
                        {isCore && (
                          <IconLock
                            size={14}
                            style={{ color: colors.textMuted }}
                          />
                        )}
                      </Group>
                      <Group gap={8}>
                        <Text
                          c={colors.textSecondary}
                          style={{ fontSize: fontSizesPx.md }}
                        >
                          {feature.description}
                        </Text>
                        {feature.route && (
                          <Anchor
                            component={Link}
                            href={feature.route}
                            c={colors.textMuted}
                            style={{
                              fontSize: fontSizesPx.sm,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            {feature.route}
                            <IconExternalLink size={11} />
                          </Anchor>
                        )}
                      </Group>
                    </Box>
                    <Switch
                      checked={feature.enabled}
                      disabled={isCore}
                      onChange={(e) =>
                        toggle(feature.key, e.currentTarget.checked)
                      }
                      size="md"
                      color={colors.accent}
                      styles={{
                        track: { cursor: isCore ? "not-allowed" : "pointer" },
                      }}
                    />
                  </Group>
                );
              })}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

/* ─── Organisations panel ─────────────────────────────────── */
const INPUT_STYLES = {
  label: {
    fontSize: fontSizesPx.base,
    fontWeight: 500,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  input: { borderColor: colors.border, fontSize: fontSizesPx.lg },
} as const;

function OrganisationsPanel() {
  const {
    data: orgs,
    isLoading,
    refetch,
  } = api.teams.myOrganisations.useQuery(undefined, { staleTime: 30_000 });
  const [createOpen, setCreateOpen] = useState(false);

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  const [createdOrgName, setCreatedOrgName] = useState("");

  // Step 1: Org fields
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  // Step 2: Team fields
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);

  // Step 3: Invite fields
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteTeamRole, setInviteTeamRole] = useState("viewer");
  const [invitesSent, setInvitesSent] = useState(0);
  const [inviteErrors, setInviteErrors] = useState<string[]>([]);

  // Per-step error
  const [stepError, setStepError] = useState("");

  const createOrg = api.teams.createOrganisation.useMutation();
  const createTeam = api.teams.createTeam.useMutation();
  const inviteMutation = api.invitations.invite.useMutation();
  const deleteOrg = api.teams.deleteOrganisation.useMutation({
    onSuccess: () => void refetch(),
  });
  const deleteTeamMut = api.teams.deleteTeam.useMutation({
    onSuccess: () => void refetch(),
  });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "org" | "team";
    id: string;
    name: string;
  } | null>(null);

  const resetWizard = () => {
    setStep(1);
    setCreatedOrgId(null);
    setCreatedOrgName("");
    setNewName("");
    setNewSlug("");
    setTeamName("");
    setTeamSlug("");
    setTeamDesc("");
    setCreatedTeamId(null);
    setInviteEmails("");
    setInviteRole("member");
    setInviteTeamRole("viewer");
    setInvitesSent(0);
    setInviteErrors([]);
    setStepError("");
  };

  const handleCloseModal = () => {
    setCreateOpen(false);
    void refetch();
    resetWizard();
  };

  const handleCreateOrg = async () => {
    setStepError("");
    try {
      const result = await createOrg.mutateAsync({
        name: newName,
        slug: newSlug,
      });
      setCreatedOrgId(result.id);
      setCreatedOrgName(result.name);
      setStep(2);
    } catch (err) {
      setStepError(
        err instanceof Error ? err.message : "Failed to create organisation",
      );
    }
  };

  const handleCreateTeam = async () => {
    if (!createdOrgId) return;
    setStepError("");
    try {
      const result = await createTeam.mutateAsync({
        organisationId: createdOrgId,
        name: teamName,
        slug: teamSlug,
        description: teamDesc || undefined,
      });
      setCreatedTeamId(result.id);
      setStep(3);
    } catch (err) {
      setStepError(
        err instanceof Error ? err.message : "Failed to create team",
      );
    }
  };

  const handleSendInvites = async () => {
    if (!createdOrgId) return;
    setInviteErrors([]);
    setStepError("");
    const emails = inviteEmails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      setStepError("Please enter at least one email address");
      return;
    }

    let sent = 0;
    const errors: string[] = [];
    for (const email of emails) {
      try {
        await inviteMutation.mutateAsync({
          email,
          organisationId: createdOrgId,
          role: inviteRole,
          ...(createdTeamId
            ? { teamId: createdTeamId, teamRole: inviteTeamRole }
            : {}),
        });
        sent++;
      } catch (err) {
        errors.push(
          `${email}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }
    setInvitesSent(sent);
    setInviteErrors(errors);
  };

  if (isLoading) {
    return (
      <Box p={24} style={{ display: "flex", justifyContent: "center" }}>
        <Loader />
      </Box>
    );
  }

  const orgList = orgs ?? [];

  const stepLabels = ["Organisation", "Team", "Invite Users"];
  const modalTitle = `Step ${step}: ${stepLabels[step - 1]}`;

  return (
    <Box p={24}>
      <StatsGrid
        stats={[
          { label: "Total Organisations", value: String(orgList.length) },
        ]}
        cols={1}
        mb={24}
      />

      <Card p={0} style={{ border, overflow: "hidden" }}>
        <Group
          px={20}
          py={12}
          justify="space-between"
          style={{ background: colors.bgPrimary, borderBottom: border }}
        >
          <Text
            fw={600}
            c={colors.textPrimary}
            style={{ fontSize: fontSizesPx.lg }}
          >
            Organisations
          </Text>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            color="dark"
            onClick={() => {
              resetWizard();
              setCreateOpen(true);
            }}
          >
            Create Organisation
          </Button>
        </Group>

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr style={{ background: colors.bgPrimary }}>
              {["Name", "Slug", "Teams", "Members", ""].map((h) => (
                <Table.Th
                  key={h}
                  style={{
                    fontSize: fontSizesPx.sm,
                    color: colors.textMuted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {h}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orgList.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text
                    c={colors.textMuted}
                    ta="center"
                    py={24}
                    style={{ fontSize: fontSizesPx.base }}
                  >
                    No organisations yet. Create one to get started.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              orgList.flatMap((org) => {
                const teams = (org.teams ?? []) as Array<{
                  id: string;
                  name: string;
                  slug: string;
                  members?: unknown[];
                }>;
                return [
                  <Table.Tr key={org.id}>
                    <Table.Td>
                      <Group gap={8}>
                        <IconBuilding
                          size={16}
                          style={{ color: colors.textMuted }}
                        />
                        <Text
                          fw={500}
                          style={{
                            fontSize: fontSizesPx.base,
                            color: colors.textPrimary,
                          }}
                        >
                          {org.name}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        style={{
                          fontSize: fontSizesPx.base,
                          color: colors.textSecondary,
                        }}
                      >
                        {org.slug}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color="blue">
                        {teams.length} teams
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color="gray">
                        {org.members?.length ?? 0} members
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <Anchor
                          component={Link}
                          href={`/settings/org?id=${org.id}`}
                          c={colors.textMuted}
                          style={{
                            fontSize: fontSizesPx.sm,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          Manage <IconExternalLink size={11} />
                        </Anchor>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          title="Delete organisation"
                          onClick={() =>
                            setDeleteTarget({
                              type: "org",
                              id: org.id,
                              name: org.name,
                            })
                          }
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>,
                  // Sub-rows for teams within this org
                  ...teams.map((team) => (
                    <Table.Tr
                      key={`team-${team.id}`}
                      style={{ background: "rgba(0,0,0,0.015)" }}
                    >
                      <Table.Td pl={48}>
                        <Text
                          style={{
                            fontSize: fontSizesPx.sm,
                            color: colors.textSecondary,
                          }}
                        >
                          {team.name}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text
                          style={{
                            fontSize: fontSizesPx.sm,
                            color: colors.textMuted,
                          }}
                        >
                          {team.slug}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" variant="light" color="gray">
                          team
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" variant="light" color="gray">
                          {(team.members as unknown[] | undefined)?.length ?? 0}{" "}
                          members
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          title="Delete team"
                          onClick={() =>
                            setDeleteTarget({
                              type: "team",
                              id: team.id,
                              name: team.name,
                            })
                          }
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  )),
                ];
              })
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {/* Multi-step Create Org Modal */}
      <Modal
        opened={createOpen}
        onClose={handleCloseModal}
        title={
          <Text fw={600} style={{ fontSize: fontSizesPx.xl }}>
            {modalTitle}
          </Text>
        }
        centered
        size="md"
        styles={{
          header: { borderBottom: border, paddingBottom: spacingPx[4] },
        }}
      >
        {/* Step indicator */}
        <Group gap={4} mt={12} mb={20}>
          {[1, 2, 3].map((s) => (
            <Box
              key={s}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: s <= step ? colors.accent : colors.border,
                transition: "background 0.2s",
              }}
            />
          ))}
        </Group>

        {/* Step 1: Create Organisation */}
        {step === 1 && (
          <Stack gap={12}>
            {stepError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                styles={{ message: { fontSize: 13 } }}
              >
                {stepError}
              </Alert>
            )}
            <TextInput
              label="Organisation Name"
              placeholder="e.g. NRC Sudan"
              value={newName}
              onChange={(e) => {
                setNewName(e.currentTarget.value);
                setNewSlug(
                  e.currentTarget.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                );
              }}
              required
              autoFocus
              styles={INPUT_STYLES}
            />
            <TextInput
              label="Slug"
              placeholder="e.g. nrc-sudan"
              value={newSlug}
              onChange={(e) => setNewSlug(e.currentTarget.value)}
              required
              styles={INPUT_STYLES}
            />
            <Group justify="flex-end" mt={8}>
              <Button variant="subtle" color="gray" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                color="dark"
                loading={createOrg.isPending}
                onClick={() => void handleCreateOrg()}
                disabled={!newName.trim() || !newSlug.trim()}
              >
                Create & Next
              </Button>
            </Group>
          </Stack>
        )}

        {/* Step 2: Create Team */}
        {step === 2 && (
          <Stack gap={12}>
            <Text size="sm" c={colors.textSecondary}>
              Create the first team for{" "}
              <Text component="span" fw={600} c={colors.textPrimary}>
                {createdOrgName}
              </Text>
              .
            </Text>
            {stepError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                styles={{ message: { fontSize: 13 } }}
              >
                {stepError}
              </Alert>
            )}
            <TextInput
              label="Team Name"
              placeholder="e.g. Sudan Monitoring"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.currentTarget.value);
                setTeamSlug(
                  e.currentTarget.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                );
              }}
              required
              autoFocus
              styles={INPUT_STYLES}
            />
            <TextInput
              label="Slug"
              placeholder="e.g. sudan-monitoring"
              value={teamSlug}
              onChange={(e) => setTeamSlug(e.currentTarget.value)}
              required
              styles={INPUT_STYLES}
            />
            <TextInput
              label="Description (optional)"
              placeholder="What does this team monitor?"
              value={teamDesc}
              onChange={(e) => setTeamDesc(e.currentTarget.value)}
              styles={INPUT_STYLES}
            />
            <Group justify="flex-end" mt={8}>
              <Button
                variant="subtle"
                color="gray"
                onClick={() => {
                  setStepError("");
                  setStep(3);
                }}
              >
                Skip
              </Button>
              <Button
                color="dark"
                loading={createTeam.isPending}
                onClick={() => void handleCreateTeam()}
                disabled={!teamName.trim() || !teamSlug.trim()}
              >
                Create Team & Next
              </Button>
            </Group>
          </Stack>
        )}

        {/* Step 3: Invite Users */}
        {step === 3 && (
          <Stack gap={12}>
            <Text size="sm" c={colors.textSecondary}>
              Invite users to{" "}
              <Text component="span" fw={600} c={colors.textPrimary}>
                {createdOrgName}
              </Text>
              {createdTeamId ? " and the team you just created" : ""}. Separate
              multiple emails with commas or newlines.
            </Text>

            {stepError && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                styles={{ message: { fontSize: 13 } }}
              >
                {stepError}
              </Alert>
            )}

            {inviteErrors.length > 0 && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="orange"
                variant="light"
                styles={{ message: { fontSize: 13 } }}
              >
                <Stack gap={2}>
                  {inviteErrors.map((err, i) => (
                    <Text key={i} style={{ fontSize: 12 }}>
                      {err}
                    </Text>
                  ))}
                </Stack>
              </Alert>
            )}

            {invitesSent > 0 && (
              <Alert
                icon={<IconUserCheck size={16} />}
                color="green"
                variant="light"
                styles={{ message: { fontSize: 13 } }}
              >
                {invitesSent} invitation{invitesSent > 1 ? "s" : ""} sent
                successfully
              </Alert>
            )}

            <TextInput
              label="Email Addresses"
              placeholder="user1@example.com, user2@example.com"
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.currentTarget.value)}
              styles={INPUT_STYLES}
            />

            <Group gap={12}>
              <Select
                label="Org Role"
                value={inviteRole}
                onChange={(v) => v && setInviteRole(v)}
                data={[
                  { value: "member", label: "Member" },
                  { value: "admin", label: "Admin" },
                ]}
                w={140}
                styles={INPUT_STYLES}
              />
              {createdTeamId && (
                <Select
                  label="Team Role"
                  value={inviteTeamRole}
                  onChange={(v) => v && setInviteTeamRole(v)}
                  data={[
                    { value: "viewer", label: "Viewer" },
                    { value: "analyst", label: "Analyst" },
                    { value: "lead", label: "Lead" },
                  ]}
                  w={140}
                  styles={INPUT_STYLES}
                />
              )}
            </Group>

            <Group justify="flex-end" mt={8}>
              <Button variant="subtle" color="gray" onClick={handleCloseModal}>
                {invitesSent > 0 ? "Done" : "Skip & Close"}
              </Button>
              <Button
                color="dark"
                loading={inviteMutation.isPending}
                leftSection={<IconUserPlus size={14} />}
                onClick={() => void handleSendInvites()}
                disabled={!inviteEmails.trim()}
              >
                Send Invitations
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={
          <Text fw={600} style={{ fontSize: fontSizesPx.xl }}>
            Delete {deleteTarget?.type === "org" ? "Organisation" : "Team"}
          </Text>
        }
        centered
        size="sm"
        styles={{
          header: { borderBottom: border, paddingBottom: spacingPx[4] },
        }}
      >
        <Text
          c={colors.textSecondary}
          style={{ fontSize: fontSizesPx.base, lineHeight: 1.6 }}
          mt={spacingPx[3]}
        >
          Are you sure you want to delete{" "}
          <Text component="span" fw={600} c={colors.textPrimary}>
            {deleteTarget?.name}
          </Text>
          ?
          {deleteTarget?.type === "org"
            ? " This will permanently remove the organisation, all its teams, members, and invitations."
            : " This will permanently remove the team and all its members."}
        </Text>
        <Text
          c={colors.textMuted}
          style={{ fontSize: fontSizesPx.sm, marginTop: spacingPx[4] }}
        >
          Press and hold the button below to confirm.
        </Text>
        <Group justify="flex-end" mt={spacingPx[5]} gap={spacingPx[3]}>
          <Button
            variant="subtle"
            color="gray"
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <HoldToConfirmButton
            label={`Hold to delete`}
            danger
            onConfirm={() => {
              if (!deleteTarget) return;
              if (deleteTarget.type === "org") {
                deleteOrg.mutate({ id: deleteTarget.id });
              } else {
                deleteTeamMut.mutate({ id: deleteTarget.id });
              }
              setDeleteTarget(null);
            }}
          />
        </Group>
      </Modal>
    </Box>
  );
}

/* ─── Invitations panel ──────────────────────────────────── */
function InvitationsPanel() {
  const { data: orgs } = api.teams.myOrganisations.useQuery(undefined, {
    staleTime: 30_000,
  });
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Auto-select first org
  useEffect(() => {
    if (!selectedOrgId && orgs?.length) {
      setSelectedOrgId(orgs[0]!.id);
    }
  }, [orgs, selectedOrgId]);

  const orgOptions = (orgs ?? []).map((o) => ({ value: o.id, label: o.name }));

  const {
    data: pendingInvites,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = api.invitations.pending.useQuery(
    { organisationId: selectedOrgId! },
    { enabled: !!selectedOrgId, staleTime: 15_000 },
  );

  // Invite form state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [inviteTeamRole, setInviteTeamRole] = useState("viewer");
  const [inviteError, setInviteError] = useState("");

  // Get teams for selected org
  const selectedOrg = orgs?.find((o) => o.id === selectedOrgId);
  const teamOptions = (selectedOrg?.teams ?? []).map(
    (t: { id: string; name: string }) => ({
      value: t.id,
      label: t.name,
    }),
  );

  const inviteMutation = api.invitations.invite.useMutation({
    onSuccess: () => {
      void refetchPending();
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      setInviteTeamId(null);
      setInviteTeamRole("viewer");
      setInviteError("");
    },
    onError: (err) => setInviteError(err.message),
  });

  const cancelMutation = api.invitations.cancel.useMutation({
    onSuccess: () => void refetchPending(),
  });

  const resendMutation = api.invitations.resend.useMutation({
    onSuccess: () => void refetchPending(),
  });

  const invites = pendingInvites ?? [];

  return (
    <Box p={24}>
      {/* Org selector */}
      <Group mb={24} gap={12}>
        <Select
          label="Organisation"
          value={selectedOrgId}
          onChange={setSelectedOrgId}
          data={orgOptions}
          placeholder="Select organisation"
          w={280}
          styles={{
            label: {
              fontSize: fontSizesPx.sm,
              fontWeight: 600,
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 4,
            },
            input: {
              fontWeight: 600,
              fontSize: fontSizesPx.lg,
              borderColor: colors.border,
            },
          }}
        />
        <Box style={{ flex: 1 }} />
        <Button
          leftSection={<IconUserPlus size={14} />}
          color="dark"
          size="sm"
          onClick={() => setInviteOpen(true)}
          disabled={!selectedOrgId}
          mt={20}
        >
          Invite User
        </Button>
      </Group>

      {/* Pending Invitations Table */}
      <Card p={0} style={{ border, overflow: "hidden" }}>
        <Group
          px={20}
          py={12}
          justify="space-between"
          style={{ background: colors.bgPrimary, borderBottom: border }}
        >
          <Group gap={8}>
            <Text
              fw={600}
              c={colors.textPrimary}
              style={{ fontSize: fontSizesPx.lg }}
            >
              Pending Invitations
            </Text>
            <Badge
              size="sm"
              variant="light"
              color={invites.length > 0 ? "orange" : "gray"}
            >
              {invites.length}
            </Badge>
          </Group>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => void refetchPending()}
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Group>

        {pendingLoading ? (
          <Box p={24} style={{ display: "flex", justifyContent: "center" }}>
            <Loader size="sm" />
          </Box>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr style={{ background: colors.bgPrimary }}>
                {["Email", "Org Role", "Team", "Invited By", "Expires", ""].map(
                  (h) => (
                    <Table.Th
                      key={h}
                      style={{
                        fontSize: fontSizesPx.sm,
                        color: colors.textMuted,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {h}
                    </Table.Th>
                  ),
                )}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {invites.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text
                      c={colors.textMuted}
                      ta="center"
                      py={24}
                      style={{ fontSize: fontSizesPx.base }}
                    >
                      No pending invitations
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                invites.map((invite) => (
                  <Table.Tr key={invite.id}>
                    <Table.Td>
                      <Group gap={6}>
                        <IconMail
                          size={14}
                          style={{ color: colors.textMuted }}
                        />
                        <Text
                          style={{
                            fontSize: fontSizesPx.base,
                            color: colors.textPrimary,
                          }}
                        >
                          {invite.email}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={invite.role === "admin" ? "orange" : "gray"}
                        tt="capitalize"
                      >
                        {invite.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {invite.team ? (
                        <Text
                          style={{
                            fontSize: fontSizesPx.base,
                            color: colors.textSecondary,
                          }}
                        >
                          {invite.team.name} ({invite.teamRole ?? "viewer"})
                        </Text>
                      ) : (
                        <Text
                          style={{
                            fontSize: fontSizesPx.sm,
                            color: colors.textMuted,
                          }}
                        >
                          -
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text
                        style={{
                          fontSize: fontSizesPx.base,
                          color: colors.textSecondary,
                        }}
                      >
                        {invite.invitedBy.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        style={{
                          fontSize: fontSizesPx.sm,
                          color: colors.textMuted,
                        }}
                      >
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="sm"
                          title="Resend"
                          loading={resendMutation.isPending}
                          onClick={() =>
                            resendMutation.mutate({ id: invite.id })
                          }
                        >
                          <IconMailForward size={14} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          title="Cancel"
                          loading={cancelMutation.isPending}
                          onClick={() =>
                            cancelMutation.mutate({ id: invite.id })
                          }
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Invite User Modal */}
      <Modal
        opened={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setInviteError("");
        }}
        title={
          <Text fw={600} style={{ fontSize: fontSizesPx.xl }}>
            Invite User
          </Text>
        }
        centered
        size="md"
        styles={{
          header: { borderBottom: border, paddingBottom: spacingPx[4] },
        }}
      >
        <Stack gap={12} mt={16}>
          {inviteError && (
            <Text c={colors.critical} style={{ fontSize: fontSizesPx.base }}>
              {inviteError}
            </Text>
          )}

          <TextInput
            label="Email Address"
            placeholder="user@example.com"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.currentTarget.value)}
            required
            styles={{
              label: {
                fontSize: fontSizesPx.base,
                fontWeight: 500,
                color: colors.textPrimary,
                marginBottom: 4,
              },
              input: { borderColor: colors.border, fontSize: fontSizesPx.lg },
            }}
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
            styles={{
              label: {
                fontSize: fontSizesPx.base,
                fontWeight: 500,
                color: colors.textPrimary,
                marginBottom: 4,
              },
              input: { borderColor: colors.border, fontSize: fontSizesPx.lg },
            }}
          />

          <Select
            label="Team (optional)"
            value={inviteTeamId}
            onChange={setInviteTeamId}
            data={teamOptions}
            placeholder="No team - org only"
            clearable
            styles={{
              label: {
                fontSize: fontSizesPx.base,
                fontWeight: 500,
                color: colors.textPrimary,
                marginBottom: 4,
              },
              input: { borderColor: colors.border, fontSize: fontSizesPx.lg },
            }}
          />

          {inviteTeamId && (
            <Select
              label="Team Role"
              value={inviteTeamRole}
              onChange={(v) => v && setInviteTeamRole(v)}
              data={[
                { value: "viewer", label: "Viewer" },
                { value: "analyst", label: "Analyst" },
                { value: "lead", label: "Lead" },
              ]}
              styles={{
                label: {
                  fontSize: fontSizesPx.base,
                  fontWeight: 500,
                  color: colors.textPrimary,
                  marginBottom: 4,
                },
                input: { borderColor: colors.border, fontSize: fontSizesPx.lg },
              }}
            />
          )}

          <Group justify="flex-end" mt={8}>
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="dark"
              loading={inviteMutation.isPending}
              leftSection={<IconUserPlus size={14} />}
              onClick={() => {
                setInviteError("");
                inviteMutation.mutate({
                  email: inviteEmail.trim(),
                  organisationId: selectedOrgId!,
                  role: inviteRole,
                  ...(inviteTeamId
                    ? { teamId: inviteTeamId, teamRole: inviteTeamRole }
                    : {}),
                });
              }}
              disabled={!inviteEmail.trim() || !selectedOrgId}
            >
              Send Invitation
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

/* ─── Data tab ────────────────────────────────────────────── */

interface SourceDef {
  key?: string;          // matches name in pipeline.getSources; absent for direct-query sources
  name: string;
  provider: string;
  providerUrl?: string;
  description: string;
  cadence: string;
  type: "api" | "manual" | "direct";
}

interface DataGroup {
  id: string;
  label: string;
  description: string;
  sources: SourceDef[];
}

const DATA_GROUPS: DataGroup[] = [
  {
    id: "early-warning",
    label: "Early Warning & Signals",
    description: "Real-time and near-real-time event detection feeds",
    sources: [
      {
        key: "dataminr",
        name: "Dataminr",
        provider: "Dataminr Inc.",
        providerUrl: "https://www.dataminr.com",
        description: "Real-time AI-powered alerts from public data: social media, news, and public sources. Primary active signal source.",
        cadence: "Real-time",
        type: "api",
      },
      {
        key: "acled",
        name: "ACLED",
        provider: "Armed Conflict Location & Event Data Project",
        providerUrl: "https://acleddata.com",
        description: "Disaggregated conflict event data: dates, locations, actors, fatalities. Covers political violence and protests globally.",
        cadence: "Weekly",
        type: "api",
      },
      {
        key: "gdacs",
        name: "GDACS",
        provider: "EU Joint Research Centre / UNOCHA",
        providerUrl: "https://gdacs.org",
        description: "Global disaster alerts: earthquakes, floods, cyclones, volcanoes, droughts. Near-real-time automated alerts.",
        cadence: "Real-time",
        type: "api",
      },
    ],
  },
  {
    id: "displacement",
    label: "Displacement & Population Movement",
    description: "IDP tracking and population flow data",
    sources: [
      {
        name: "IOM DTM",
        provider: "IOM / OCHA HDX",
        providerUrl: "https://dtm.iom.int",
        description: "IOM Displacement Tracking Matrix. Conflict-induced IDP figures accessed via HDX HAPI. Disaster displacement not included - covered by IDMC separately.",
        cadence: "Monthly",
        type: "direct",
      },
    ],
  },
  {
    id: "risk",
    label: "Risk & Vulnerability Indices",
    description: "Composite index scores for country-level risk assessment",
    sources: [
      {
        name: "INFORM Risk",
        provider: "JRC / European Commission",
        providerUrl: "https://drmkc.jrc.ec.europa.eu/inform-index",
        description: "Annual composite risk index: Hazard & Exposure, Vulnerability, Coping Capacity. 264 indicators per country at sub-composite level.",
        cadence: "Annual",
        type: "direct",
      },
      {
        name: "INFORM Severity",
        provider: "ACAPS",
        providerUrl: "https://www.acaps.org",
        description: "Monthly crisis severity index. Covers impact, conditions of affected people, and complexity. Aggregated country-level score via ACAPS API.",
        cadence: "Monthly",
        type: "direct",
      },
    ],
  },
  {
    id: "field",
    label: "Field Intelligence",
    description: "Human-generated reports from field officers, partners, and government sources",
    sources: [
      {
        key: "field_officer",
        name: "Field Officer Reports",
        provider: "NRC Internal",
        description: "Direct signal submissions from NRC field officers via the Observe mobile app. Includes low-connectivity offline support.",
        cadence: "Ad hoc",
        type: "manual",
      },
      {
        key: "partner",
        name: "Partner Reports",
        provider: "NRC Partners",
        description: "Signals submitted by partner organisations through the platform.",
        cadence: "Ad hoc",
        type: "manual",
      },
      {
        key: "government",
        name: "Government Sources",
        provider: "Government Agencies",
        description: "Signals sourced from or attributed to government authorities.",
        cadence: "Ad hoc",
        type: "manual",
      },
    ],
  },
];

function freshnessLabel(isoDate: string | null | undefined): string {
  if (!isoDate) return "No data yet";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function DataSourceCard({
  source,
  signalCount,
  latestAt,
  maxCount,
  isActive,
}: {
  source: SourceDef;
  signalCount: number | null;
  latestAt: string | null;
  maxCount: number;
  isActive: boolean | null;
}) {
  const typeBadgeColor = source.type === "api" ? "blue" : source.type === "direct" ? "violet" : "gray";
  const typeLabel = source.type === "api" ? "Pipeline API" : source.type === "direct" ? "Direct Query" : "Manual Entry";
  const barWidth = signalCount && maxCount > 0 ? Math.max((signalCount / maxCount) * 100, 2) : 0;

  return (
    <Card p="md" radius={0} style={{ background: colors.bgWhite }}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} mb={4} align="center">
            <Text fw={600} style={{ fontSize: fontSizesPx.base }}>{source.name}</Text>
            <Badge size="xs" color={typeBadgeColor} variant="light" radius="sm">{typeLabel}</Badge>
            {isActive === false && (
              <Badge size="xs" color="gray" variant="outline" radius="sm">Inactive</Badge>
            )}
          </Group>
          <Text c={colors.textSecondary} style={{ fontSize: fontSizesPx.sm }} mb={6}>
            {source.description}
          </Text>
          <Group gap={16}>
            <Text style={{ fontSize: fontSizesPx.xs, color: colors.textSecondary }}>
              Provider: <span style={{ color: colors.textPrimary }}>{source.provider}</span>
            </Text>
            <Text style={{ fontSize: fontSizesPx.xs, color: colors.textSecondary }}>
              Cadence: <span style={{ color: colors.textPrimary }}>{source.cadence}</span>
            </Text>
            {source.providerUrl && (
              <Anchor href={source.providerUrl} target="_blank"
                style={{ fontSize: fontSizesPx.xs, color: colors.accent }}>
                <Group gap={4} align="center">
                  <IconExternalLink size={11} />
                  docs
                </Group>
              </Anchor>
            )}
          </Group>
        </Box>

        <Box style={{ width: 130, flexShrink: 0, textAlign: "right" }}>
          {signalCount !== null ? (
            <>
              <Text fw={700} style={{ fontSize: 20, color: signalCount > 0 ? colors.textPrimary : colors.textSecondary }}>
                {signalCount}
              </Text>
              <Text style={{ fontSize: fontSizesPx.xs, color: colors.textSecondary }} mb={2}>
                signals
              </Text>
              <Box style={{ height: 4, background: colors.border, borderRadius: 2 }} mb={6}>
                <Box style={{
                  height: "100%",
                  width: `${barWidth}%`,
                  background: signalCount > 0 ? colors.accent : colors.border,
                  borderRadius: 2,
                  transition: "width 0.4s ease",
                }} />
              </Box>
              <Text style={{ fontSize: fontSizesPx.xs, color: latestAt ? colors.textSecondary : colors.border }}>
                {freshnessLabel(latestAt)}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: fontSizesPx.xs, color: colors.textSecondary }}>
              {source.type === "direct" ? "Direct query" : "No signals yet"}
            </Text>
          )}
        </Box>
      </Group>
    </Card>
  );
}

function DataPanel() {
  const [demoEnabled, setDemoEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("clear_demo_data") !== "false";
  });

  const sourcesQuery = api.pipeline.getSources.useQuery(undefined, { staleTime: 60_000, retry: false });
  const statsQuery = api.pipeline.getStatistics.useQuery(undefined, { staleTime: 60_000, retry: false });

  const handleDemoToggle = (val: boolean) => {
    setDemoEnabled(val);
    localStorage.setItem("clear_demo_data", String(val));
  };

  // isActive per source name from getSources
  const activeMap = new Map<string, boolean>();
  for (const s of sourcesQuery.data?.sources ?? []) {
    activeMap.set(s.name, s.is_active);
  }

  // signal_count + latest_signal_at per source name from getStatistics
  const bySource = statsQuery.data?.by_source ?? {};

  const maxSignals = Math.max(
    ...DATA_GROUPS.flatMap((g) =>
      g.sources.map((s) => (s.key ? (bySource[s.key]?.signal_count ?? 0) : 0))
    ),
    1,
  );

  const isLoading = sourcesQuery.isLoading || statsQuery.isLoading;

  return (
    <Box p={spacingPx[7]}>
      <Stack gap="xl">
        {/* Demo Data card */}
        <Card p="md" radius={0} style={{
          border: `1px solid ${colors.border}`,
          background: demoEnabled ? "#FFFBF5" : colors.bgWhite,
        }}>
          <Group justify="space-between" align="center">
            <Box>
              <Group gap={8} mb={4}>
                <Text fw={600} style={{ fontSize: fontSizesPx.base }}>Demo Data</Text>
                <Badge size="xs" color="orange" variant="light" radius="sm">Dev only</Badge>
              </Group>
              <Text c={colors.textSecondary} style={{ fontSize: fontSizesPx.sm }}>
                Hardcoded demo markers, crisis pins, and sample statistics overlaid on the dashboard. Disable to show only live data.
              </Text>
            </Box>
            <Switch
              checked={demoEnabled}
              onChange={(e) => handleDemoToggle(e.currentTarget.checked)}
              color="orange"
              size="md"
            />
          </Group>
        </Card>

        {isLoading && (
          <Group justify="center" py="xl">
            <Loader size="sm" />
            <Text c={colors.textSecondary} style={{ fontSize: fontSizesPx.sm }}>Loading source data...</Text>
          </Group>
        )}

        {/* Source groups */}
        {!isLoading && DATA_GROUPS.map((group) => (
          <Box key={group.id}>
            <Text tt="uppercase" fw={700} mb={2}
              style={{ fontSize: fontSizesPx.xs, letterSpacing: "0.08em", color: colors.textSecondary }}>
              {group.label}
            </Text>
            <Text mb={8} style={{ fontSize: fontSizesPx.sm, color: colors.textSecondary }}>
              {group.description}
            </Text>
            <Box style={{ border: `1px solid ${colors.border}` }}>
              {group.sources.map((source, idx) => (
                <Box key={source.key ?? source.name}>
                  {idx > 0 && <Divider />}
                  <DataSourceCard
                    source={source}
                    signalCount={source.key ? (bySource[source.key]?.signal_count ?? 0) : null}
                    latestAt={source.key ? (bySource[source.key]?.latest_signal_at ?? null) : null}
                    maxCount={maxSignals}
                    isActive={source.key ? (activeMap.get(source.key) ?? null) : null}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function AdminPage() {
  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Admin"
        subtitle="Platform configuration, user and organisation management"
      />

      <Tabs
        defaultValue="users"
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <Tabs.List
          px={24}
          style={{
            background: colors.bgWhite,
            borderBottom: border,
            flexShrink: 0,
          }}
        >
          <Tabs.Tab
            value="users"
            leftSection={<IconUsers size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            Users
          </Tabs.Tab>
          <Tabs.Tab
            value="organisations"
            leftSection={<IconBuilding size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            Organisations
          </Tabs.Tab>
          <Tabs.Tab
            value="invitations"
            leftSection={<IconUserPlus size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            Invitations
          </Tabs.Tab>
          <Tabs.Tab
            value="features"
            leftSection={<IconToggleLeft size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            Features
          </Tabs.Tab>
          <Tabs.Tab
            value="data"
            leftSection={<IconDatabase size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            Data
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users" style={{ flex: 1, overflowY: "auto" }}>
          <UsersPanel />
        </Tabs.Panel>
        <Tabs.Panel
          value="organisations"
          style={{ flex: 1, overflowY: "auto" }}
        >
          <OrganisationsPanel />
        </Tabs.Panel>
        <Tabs.Panel value="invitations" style={{ flex: 1, overflowY: "auto" }}>
          <InvitationsPanel />
        </Tabs.Panel>
        <Tabs.Panel value="features" style={{ flex: 1, overflowY: "auto" }}>
          <FeaturesPanel />
        </Tabs.Panel>
        <Tabs.Panel value="data" style={{ flex: 1, overflowY: "auto" }}>
          <DataPanel />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
