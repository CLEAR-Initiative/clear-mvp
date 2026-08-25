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
  Checkbox,
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
  Tooltip,
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
import { useFormatter, useTranslations } from "next-intl";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/components/feature-flags-provider";
import { isPlatformAdmin } from "~/lib/roles";
import { PageHeader, StatsGrid } from "~/components/ui";
import type { StatItem } from "~/components/ui";
import { colors, fontSizesPx, spacingPx } from "~/lib/tokens";

/* ─── Shared ──────────────────────────────────────────────── */
const border = `1px solid ${colors.border}`;

/* ─── Features tab helpers ────────────────────────────────── */

/* ─── Users tab types & constants ─────────────────────────── */
type GqlUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  isActive: boolean;
  organisations?: { id: string; organisationId: string; role: string }[];
  teamMemberships?: { id: string; role: string }[];
};

type FilterMode = "all" | "pending";

type PendingAction = { type: "role"; user: GqlUser; newRole: string };

// Global roles only. Org and team roles live in /settings/org and
// /settings/team/<id>. `org_admin` was previously listed here because it
// used to double as a global role; under the new taxonomy it's org-scoped.
// labelKey: i18n keys under admin.users.roles.* - resolved via t() at render time.
const ROLES = [
  { value: "viewer", labelKey: "viewer" },
  { value: "analyst", labelKey: "analyst" },
  { value: "admin", labelKey: "admin" },
] as const;

const GLOBAL_ROLE_SET: ReadonlySet<string> = new Set(
  ROLES.map((r) => r.value),
);

/**
 * Map any stored `user.role` value to a role that's actually in the current
 * global taxonomy. Legacy values that used to be treated as global
 * (`org_admin`, `field`, team-role names, etc.) collapse to `"viewer"` so
 * they don't leak through Mantine's Select trigger as unmatched values —
 * which would look like the dropdown "contains" them. The stored DB value
 * is untouched; a separate SQL backfill is the source-of-truth cleanup.
 */
function toGlobalRole(role: string | null | undefined): string {
  if (role && GLOBAL_ROLE_SET.has(role)) return role;
  return "viewer";
}

const roleColor: Record<string, string> = {
  admin: "orange",
  analyst: "blue",
  viewer: "gray",
  user: "gray",
};

/* ─── Hold-to-confirm button ──────────────────────────────── */
function HoldToConfirmButton({
  onConfirm,
  label,
  duration = 2000,
  danger = true,
}: {
  onConfirm: () => void;
  label: string;
  duration?: number;
  danger?: boolean;
}) {
  const t = useTranslations("admin.hold");
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
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: `${progress}%`,
          background: "rgba(255,255,255,0.22)",
          pointerEvents: "none",
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>
        {progress > 0 ? t("holding") : label}
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
  const t = useTranslations("admin");
  const tActions = useTranslations("common.actions");

  const title = t("confirm.roleTitle");

  const b = (chunks: React.ReactNode) => (
    <Text component="span" fw={600} c={colors.textPrimary}>
      {chunks}
    </Text>
  );

  const body = action ? (
    <>
      {t.rich("confirm.roleBody", {
        b,
        name: action.user.name,
        from: action.user.role,
        to: action.newRole,
      })}
    </>
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
        {t("confirm.holdHint")}
      </Text>

      <Group justify="flex-end" mt={spacingPx[5]} gap={spacingPx[3]}>
        <Button variant="subtle" color="gray" onClick={onClose}>
          {tActions("cancel")}
        </Button>
        <HoldToConfirmButton
          onConfirm={onConfirm}
          label={t("hold.confirm")}
          danger={false}
        />
      </Group>
    </Modal>
  );
}

/* ─── Users panel ─────────────────────────────────────────── */
function UsersPanel() {
  const t = useTranslations("admin.users");
  const utils = api.useUtils();
  const { data, isLoading } = api.auth.listUsers.useQuery(undefined, {
    staleTime: 30_000,
  });
  const { data: orgsData } = api.auth.listOrganisations.useQuery(undefined, {
    staleTime: 60_000,
  });
  const orgNameMap = Object.fromEntries(
    (orgsData?.organisations ?? []).map((o) => [o.id, o.name]),
  );
  // membershipId (TeamMember.id) → team name, built from org→team→member hierarchy
  const teamNameByMembershipId = Object.fromEntries(
    (orgsData?.organisations ?? []).flatMap((o) =>
      (o.teams ?? []).flatMap((t) =>
        (t.members ?? []).map((m) => [m.id, t.name]),
      ),
    ),
  );

  const [localUsers, setLocalUsers] = useState<GqlUser[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  // Tracks the role shown in the Select while the modal is open
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.users) setLocalUsers(data.users as GqlUser[]);
  }, [data]);

  // Org teams for the cascading team filter
  const selectedOrg = (orgsData?.organisations ?? []).find((o) => o.id === selectedOrgId);
  const orgTeamOptions = (selectedOrg?.teams ?? []).map((t) => ({ value: t.id, label: t.name }));
  // Set of membership IDs belonging to the selected team
  const selectedTeamMembershipIds = selectedTeamId
    ? new Set((selectedOrg?.teams ?? []).find((t) => t.id === selectedTeamId)?.members.map((m) => m.id) ?? [])
    : null;

  const filteredUsers = localUsers.filter((u) => {
    if (filter === "pending" && u.role !== "pending") return false;
    if (selectedOrgId && !u.organisations?.some((o) => o.organisationId === selectedOrgId)) return false;
    if (selectedTeamMembershipIds && !u.teamMemberships?.some((m) => selectedTeamMembershipIds.has(m.id))) return false;
    return true;
  });

  const pendingCount = localUsers.filter((u) => u.role === "pending").length;

  const updateUserRole = api.auth.updateUserRole.useMutation({
    onSuccess: (updated) => {
      setLocalUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u)),
      );
      setPendingRoles((prev) => {
        const n = { ...prev };
        delete n[updated.id];
        return n;
      });
      notifications.show({
        title: t("roleUpdated"),
        message: t("roleUpdatedDetail", { role: updated.role }),
        color: "green",
        autoClose: 2000,
      });
      void utils.auth.listUsers.invalidate();
    },
    onError: (err) => {
      notifications.show({
        title: t("roleUpdateFailed"),
        message: err.message,
        color: "red",
      });
    },
  });

  const approveUser = api.auth.approveUser.useMutation({
    onSuccess: (result) => {
      const id = result.user.id;
      setLocalUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, role: result.user.role ?? "viewer", isActive: result.user.isActive ?? true }
            : u,
        ),
      );
      notifications.show({
        title: t("approved"),
        message: t("approvedDetail"),
        color: "green",
        autoClose: 2000,
      });
      void utils.auth.listUsers.invalidate();
    },
    onError: (err) => {
      notifications.show({
        title: t("approveFailed"),
        message: err.message,
        color: "red",
      });
    },
  });

  /* ── handlers ── */
  const handleRoleSelect = (user: GqlUser, newRole: string | null) => {
    if (!newRole || newRole === user.role) return;
    if (user.role === "pending") return;
    setPendingRoles((prev) => ({ ...prev, [user.id]: newRole }));
    setPendingAction({ type: "role", user, newRole });
  };

  const handleActivate = (user: GqlUser) => {
    approveUser.mutate({ userId: user.id });
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
    const { user, newRole } = pendingAction;
    setPendingAction(null);
    updateUserRole.mutate(
      { userId: user.id, role: newRole as "viewer" | "analyst" | "admin" },
      {
        onError: () => {
          setPendingRoles((prev) => {
            const n = { ...prev };
            delete n[user.id];
            return n;
          });
        },
      },
    );
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
            ? t("unauthorized")
            : data.error}
        </Text>
      </Box>
    );
  }

  const adminCount = localUsers.filter((u) => isPlatformAdmin(u.role)).length;
  const activeCount = localUsers.filter((u) => u.isActive).length;

  const stats: StatItem[] = [
    { label: t("stats.total"), value: String(localUsers.length) },
    { label: t("stats.admins"), value: String(adminCount), color: colors.accent },
    { label: t("stats.active"), value: String(activeCount), color: colors.success },
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
                { value: "all", label: t("filterAll") },
                { value: "pending", label: t("filterPending") },
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
            <Select
              placeholder={t("allOrgs")}
              data={(orgsData?.organisations ?? []).map((o) => ({ value: o.id, label: o.name }))}
              value={selectedOrgId}
              onChange={(v) => { setSelectedOrgId(v); setSelectedTeamId(null); }}
              size="xs"
              variant="unstyled"
              clearable
              style={{ width: 130 }}
              styles={{ input: { fontWeight: 600, fontSize: fontSizesPx.lg, color: colors.textPrimary } }}
            />
            {selectedOrgId && orgTeamOptions.length > 0 && (
              <Select
                placeholder={t("allTeams")}
                data={orgTeamOptions}
                value={selectedTeamId}
                onChange={setSelectedTeamId}
                size="xs"
                variant="unstyled"
                clearable
                style={{ width: 130 }}
                styles={{ input: { fontWeight: 600, fontSize: fontSizesPx.lg, color: colors.textPrimary } }}
              />
            )}
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
              {(["user", "role", "email", "org", "team", "status", ""] as const).map((h) => (
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
                  {h === "" ? "" : t(`columns.${h}`)}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredUsers.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text
                    c={colors.textMuted}
                    ta="center"
                    py={24}
                    style={{ fontSize: fontSizesPx.base }}
                  >
                    {filter === "pending"
                      ? t("emptyPending")
                      : t("empty")}
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
                          {user.emailVerified ? t("verified") : t("unverified")}
                        </Text>
                      </Box>
                    </Group>
                  </Table.Td>

                  {/* Role - dropdown */}
                  <Table.Td>
                    <Select
                      value={pendingRoles[user.id] ?? toGlobalRole(user.role)}
                      onChange={(val) => handleRoleSelect(user, val)}
                      data={ROLES.map((r) => ({ value: r.value, label: t(`roles.${r.labelKey}`) }))}
                      size="xs"
                      w={110}
                      disabled={user.role === "pending" || updateUserRole.isPending}
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
                      {user.email ?? "—"}
                    </Text>
                  </Table.Td>

                  {/* Org */}
                  <Table.Td>
                    {user.organisations && user.organisations.length > 0 ? (
                      <Stack gap={2}>
                        {user.organisations.map((o) => (
                          <Text key={o.id} style={{ fontSize: fontSizesPx.sm, color: colors.textSecondary }}>
                            {orgNameMap[o.organisationId] ?? o.organisationId.slice(0, 8)}
                            <Text span c={colors.textMuted} style={{ fontSize: fontSizesPx.xs }}> ({o.role})</Text>
                          </Text>
                        ))}
                      </Stack>
                    ) : (
                      <Text style={{ fontSize: fontSizesPx.sm, color: colors.textMuted }}>-</Text>
                    )}
                  </Table.Td>

                  {/* Team */}
                  <Table.Td>
                    {user.teamMemberships && user.teamMemberships.length > 0 ? (
                      <Stack gap={2}>
                        {user.teamMemberships.map((m) => (
                          <Text key={m.id} style={{ fontSize: fontSizesPx.sm, color: colors.textSecondary }}>
                            {teamNameByMembershipId[m.id] ?? "-"}
                            <Text span c={colors.textMuted} style={{ fontSize: fontSizesPx.xs }}> ({m.role})</Text>
                          </Text>
                        ))}
                      </Stack>
                    ) : (
                      <Text style={{ fontSize: fontSizesPx.sm, color: colors.textMuted }}>-</Text>
                    )}
                  </Table.Td>

                  {/* Status + Activate */}
                  <Table.Td>
                    <Group gap={8} wrap="nowrap">
                      <Badge
                        size="sm"
                        variant="dot"
                        color={user.role === "pending" ? "orange" : "green"}
                      >
                        {user.role === "pending" ? t("statusPending") : t("statusActive")}
                      </Badge>
                      {user.role === "pending" && (
                        <Button
                          size="xs"
                          variant="light"
                          color="green"
                          leftSection={<IconUserCheck size={12} />}
                          loading={approveUser.isPending}
                          onClick={() => handleActivate(user)}
                        >
                          {t("activate")}
                        </Button>
                      )}
                    </Group>
                  </Table.Td>

                  {/* Delete — no GraphQL mutation exists yet; do not fake-persist. */}
                  <Table.Td>
                    <Tooltip label={t("deleteUnavailable")}>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        disabled
                        aria-label={t("deleteUnavailable")}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
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
  const t = useTranslations("admin.features");
  const { features, isLoading, toggle } = useFeatureFlags();

  if (isLoading || !features.length) {
    return (
      <Box p={24} style={{ display: "flex", justifyContent: "center" }}>
        <Loader />
      </Box>
    );
  }

  const enabledCount = features.filter((f) => f.enabled).length;
  const disabledCount = features.filter((f) => !f.enabled).length;

  const stats: StatItem[] = [
    { label: t("stats.total"), value: String(features.length) },
    { label: t("stats.enabled"), value: String(enabledCount), color: colors.success },
    { label: t("stats.disabled"), value: String(disabledCount), color: colors.critical },
  ];

  return (
    <Box p={24}>
      <StatsGrid stats={stats} cols={3} mb={24} />

      <Card p={0} style={{ border, overflow: "hidden" }}>
        <Stack gap={0}>
          {features.map((feature, i) => {
            const isCore = feature.tier === 1;
            return (
              <Group
                key={feature.key}
                px={20}
                py={14}
                justify="space-between"
                wrap="nowrap"
                style={{
                  borderBottom: i < features.length - 1 ? border : undefined,
                  opacity: isCore ? 0.7 : 1,
                }}
              >
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group gap={8} mb={2}>
                    <Text fw={500} c={colors.textPrimary} style={{ fontSize: fontSizesPx.lg }}>
                      {feature.label}
                    </Text>
                    {isCore && (
                      <IconLock size={14} style={{ color: colors.textMuted }} />
                    )}
                  </Group>
                  <Text c={colors.textSecondary} style={{ fontSize: fontSizesPx.md }}>
                    {feature.description}
                  </Text>
                </Box>
                <Switch
                  checked={feature.enabled}
                  disabled={isCore}
                  onChange={(e) => toggle(feature.key, e.currentTarget.checked)}
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
  const t = useTranslations("admin.orgs");
  const tRoles = useTranslations("admin.roles");
  const tConfirm = useTranslations("admin.confirm");
  const tHold = useTranslations("admin.hold");
  const tActions = useTranslations("common.actions");
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
        err instanceof Error ? err.message : t("wizard.createOrgFailed"),
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
        err instanceof Error ? err.message : t("wizard.createTeamFailed"),
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
      setStepError(t("wizard.noEmails"));
      return;
    }

    if (!createdTeamId) {
      setStepError(t("wizard.needTeam"));
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
          teams: [
            {
              teamId: createdTeamId,
              teamRole: inviteTeamRole as "team_admin" | "field_coordinator" | "team_member",
            },
          ],
        });
        sent++;
      } catch (err) {
        errors.push(
          `${email}: ${err instanceof Error ? err.message : t("wizard.unknownError")}`,
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

  // i18n keys under admin.orgs.wizard.steps.* - resolved via t() at render time.
  const stepLabelKeys = ["organisation", "team", "invite"] as const;
  const modalTitle = t("wizard.stepTitle", { step, label: t(`wizard.steps.${stepLabelKeys[step - 1]}`) });

  return (
    <Box p={24}>
      <StatsGrid
        stats={[
          { label: t("statsTotal"), value: String(orgList.length) },
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
            {t("title")}
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
            {t("create")}
          </Button>
        </Group>

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr style={{ background: colors.bgPrimary }}>
              {(["name", "slug", "teams", "members", ""] as const).map((h) => (
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
                  {h === "" ? "" : t(`columns.${h}`)}
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
                    {t("empty")}
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
                        {t("teamsCount", { count: teams.length })}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color="gray">
                        {t("membersCount", { count: org.members?.length ?? 0 })}
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
                          {t("manage")} <IconExternalLink size={11} />
                        </Anchor>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          title={t("deleteOrgTooltip")}
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
                      <Table.Td ps={48}>
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
                          {t("teamBadge")}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="xs" variant="light" color="gray">
                          {t("membersCount", { count: (team.members as unknown[] | undefined)?.length ?? 0 })}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          title={t("deleteTeamTooltip")}
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
              label={t("wizard.orgNameLabel")}
              placeholder={t("wizard.orgNamePlaceholder")}
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
              label={t("wizard.slugLabel")}
              placeholder={t("wizard.orgSlugPlaceholder")}
              value={newSlug}
              onChange={(e) => setNewSlug(e.currentTarget.value)}
              required
              styles={INPUT_STYLES}
            />
            <Group justify="flex-end" mt={8}>
              <Button variant="subtle" color="gray" onClick={handleCloseModal}>
                {tActions("cancel")}
              </Button>
              <Button
                color="dark"
                loading={createOrg.isPending}
                onClick={() => void handleCreateOrg()}
                disabled={!newName.trim() || !newSlug.trim()}
              >
                {t("wizard.createNext")}
              </Button>
            </Group>
          </Stack>
        )}

        {/* Step 2: Create Team */}
        {step === 2 && (
          <Stack gap={12}>
            <Text size="sm" c={colors.textSecondary}>
              {t.rich("wizard.teamIntro", {
                b: (chunks) => (
                  <Text component="span" fw={600} c={colors.textPrimary}>
                    {chunks}
                  </Text>
                ),
                org: createdOrgName,
              })}
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
              label={t("wizard.teamNameLabel")}
              placeholder={t("wizard.teamNamePlaceholder")}
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
              label={t("wizard.slugLabel")}
              placeholder={t("wizard.teamSlugPlaceholder")}
              value={teamSlug}
              onChange={(e) => setTeamSlug(e.currentTarget.value)}
              required
              styles={INPUT_STYLES}
            />
            <TextInput
              label={t("wizard.descriptionLabel")}
              placeholder={t("wizard.descriptionPlaceholder")}
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
                {t("wizard.skip")}
              </Button>
              <Button
                color="dark"
                loading={createTeam.isPending}
                onClick={() => void handleCreateTeam()}
                disabled={!teamName.trim() || !teamSlug.trim()}
              >
                {t("wizard.createTeamNext")}
              </Button>
            </Group>
          </Stack>
        )}

        {/* Step 3: Invite Users */}
        {step === 3 && (
          <Stack gap={12}>
            <Text size="sm" c={colors.textSecondary}>
              {t.rich(createdTeamId ? "wizard.inviteIntroTeam" : "wizard.inviteIntro", {
                b: (chunks) => (
                  <Text component="span" fw={600} c={colors.textPrimary}>
                    {chunks}
                  </Text>
                ),
                org: createdOrgName,
              })}
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
                {t("wizard.invitesSent", { count: invitesSent })}
              </Alert>
            )}

            <TextInput
              label={t("wizard.emailsLabel")}
              placeholder={t("wizard.emailsPlaceholder")}
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.currentTarget.value)}
              styles={INPUT_STYLES}
            />

            <Group gap={12}>
              <Select
                label={t("wizard.orgRoleLabel")}
                value={inviteRole}
                onChange={(v) => v && setInviteRole(v)}
                data={[
                  { value: "member", label: tRoles("member") },
                  { value: "org_admin", label: tRoles("orgAdmin") },
                ]}
                w={140}
                styles={INPUT_STYLES}
              />
              {createdTeamId && (
                <Select
                  label={t("wizard.teamRoleLabel")}
                  value={inviteTeamRole}
                  onChange={(v) => v && setInviteTeamRole(v)}
                  data={[
                    { value: "team_member", label: tRoles("teamMember") },
                    { value: "field_coordinator", label: tRoles("fieldCoordinator") },
                    { value: "team_admin", label: tRoles("teamAdmin") },
                  ]}
                  w={140}
                  styles={INPUT_STYLES}
                />
              )}
            </Group>

            <Group justify="flex-end" mt={8}>
              <Button variant="subtle" color="gray" onClick={handleCloseModal}>
                {invitesSent > 0 ? t("wizard.done") : t("wizard.skipClose")}
              </Button>
              <Button
                color="dark"
                loading={inviteMutation.isPending}
                leftSection={<IconUserPlus size={14} />}
                onClick={() => void handleSendInvites()}
                disabled={!inviteEmails.trim()}
              >
                {t("wizard.send")}
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
            {deleteTarget?.type === "org" ? t("deleteModal.titleOrg") : t("deleteModal.titleTeam")}
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
          {t.rich("deleteModal.body", {
            b: (chunks) => (
              <Text component="span" fw={600} c={colors.textPrimary}>
                {chunks}
              </Text>
            ),
            name: deleteTarget?.name ?? "",
          })}{" "}
          {deleteTarget?.type === "org"
            ? t("deleteModal.consequenceOrg")
            : t("deleteModal.consequenceTeam")}
        </Text>
        <Text
          c={colors.textMuted}
          style={{ fontSize: fontSizesPx.sm, marginTop: spacingPx[4] }}
        >
          {tConfirm("holdHint")}
        </Text>
        <Group justify="flex-end" mt={spacingPx[5]} gap={spacingPx[3]}>
          <Button
            variant="subtle"
            color="gray"
            onClick={() => setDeleteTarget(null)}
          >
            {tActions("cancel")}
          </Button>
          <HoldToConfirmButton
            label={tHold("delete")}
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
  const t = useTranslations("admin.invitations");
  const tRoles = useTranslations("admin.roles");
  const tActions = useTranslations("common.actions");
  const format = useFormatter();
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
  type TeamRole = "team_admin" | "field_coordinator" | "team_member";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  // teamId → teamRole map. Selecting/deselecting a team toggles a row;
  // role per team defaults to "team_member".
  const [inviteTeams, setInviteTeams] = useState<Record<string, TeamRole>>({});
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
      setInviteTeams({});
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
          label={t("orgLabel")}
          value={selectedOrgId}
          onChange={setSelectedOrgId}
          data={orgOptions}
          placeholder={t("orgPlaceholder")}
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
          {t("inviteUser")}
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
              {t("pendingTitle")}
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
                {(["email", "orgRole", "team", "invitedBy", "expires", ""] as const).map(
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
                      {h === "" ? "" : t(`columns.${h}`)}
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
                      {t("empty")}
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
                          {invite.team.name} ({invite.teamRole ?? "team_member"})
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
                        {format.dateTime(new Date(invite.expiresAt), "short")}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="sm"
                          title={t("resend")}
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
                          title={t("cancel")}
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
            {t("modal.title")}
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
            label={t("modal.emailLabel")}
            placeholder={t("modal.emailPlaceholder")}
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
            label={t("modal.orgRoleLabel")}
            value={inviteRole}
            onChange={(v) => v && setInviteRole(v)}
            data={[
              { value: "member", label: tRoles("member") },
              { value: "org_admin", label: tRoles("orgAdmin") },
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

          <Box>
            <Text
              style={{
                fontSize: fontSizesPx.base,
                fontWeight: 500,
                color: colors.textPrimary,
                marginBottom: 6,
              }}
            >
              {t("modal.teamsLabel")} <Text component="span" c={colors.critical}>*</Text>
            </Text>
            {teamOptions.length === 0 ? (
              <Text size="sm" c={colors.textMuted}>
                {t("modal.noTeams")}
              </Text>
            ) : (
              <Stack gap={6}>
                {teamOptions.map((opt) => {
                  const teamId = opt.value;
                  const selectedRole = inviteTeams[teamId];
                  const isSelected = selectedRole !== undefined;
                  return (
                    <Group key={teamId} gap={8} wrap="nowrap" align="center">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const checked = e.currentTarget.checked;
                          setInviteTeams((prev) => {
                            const next = { ...prev };
                            if (checked) next[teamId] = "team_member";
                            else delete next[teamId];
                            return next;
                          });
                        }}
                        label={opt.label}
                        styles={{ label: { fontSize: fontSizesPx.base } }}
                      />
                      <Box style={{ flex: 1 }} />
                      <Select
                        size="xs"
                        value={selectedRole ?? "team_member"}
                        onChange={(v) => {
                          if (!v || !isSelected) return;
                          setInviteTeams((prev) => ({
                            ...prev,
                            [teamId]: v as TeamRole,
                          }));
                        }}
                        data={[
                          { value: "team_member", label: tRoles("teamMember") },
                          { value: "field_coordinator", label: tRoles("fieldCoordinator") },
                          { value: "team_admin", label: tRoles("teamAdmin") },
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

          <Group justify="flex-end" mt={8}>
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setInviteOpen(false)}
            >
              {tActions("cancel")}
            </Button>
            <Button
              color="dark"
              loading={inviteMutation.isPending}
              leftSection={<IconUserPlus size={14} />}
              onClick={() => {
                setInviteError("");
                const teams = Object.entries(inviteTeams).map(
                  ([teamId, teamRole]) => ({ teamId, teamRole }),
                );
                if (teams.length === 0) {
                  setInviteError(t("modal.selectAtLeastOneTeam"));
                  return;
                }
                inviteMutation.mutate({
                  email: inviteEmail.trim(),
                  organisationId: selectedOrgId!,
                  role: inviteRole,
                  teams,
                });
              }}
              disabled={
                !inviteEmail.trim() ||
                !selectedOrgId ||
                Object.keys(inviteTeams).length === 0
              }
            >
              {t("modal.send")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

/* ─── Data tab ────────────────────────────────────────────── */

type SourceI18nKey =
  | "dataminr" | "acled" | "gdacs" | "iomDtm" | "informRisk"
  | "informSeverity" | "fieldOfficer" | "partner" | "government";
type CadenceKey = "realTime" | "weekly" | "monthly" | "annual" | "adHoc";
type GroupI18nKey = "earlyWarning" | "displacement" | "risk" | "field";

interface SourceDef {
  key?: string;             // matches name in pipeline.getSources; absent for direct-query sources
  i18nKey: SourceI18nKey;   // i18n key under admin.data.sources.* (name/provider/description)
  providerUrl?: string;
  cadenceKey: CadenceKey;   // i18n key under admin.data.cadences.*
  type: "api" | "manual" | "direct";
}

interface DataGroup {
  id: string;
  i18nKey: GroupI18nKey;    // i18n key under admin.data.groups.* (label/description)
  sources: SourceDef[];
}

// All display strings live in admin.data.* - resolved via t() at render time.
const DATA_GROUPS: DataGroup[] = [
  {
    id: "early-warning",
    i18nKey: "earlyWarning",
    sources: [
      {
        key: "dataminr",
        i18nKey: "dataminr",
        providerUrl: "https://www.dataminr.com",
        cadenceKey: "realTime",
        type: "api",
      },
      {
        key: "acled",
        i18nKey: "acled",
        providerUrl: "https://acleddata.com",
        cadenceKey: "weekly",
        type: "api",
      },
      {
        key: "gdacs",
        i18nKey: "gdacs",
        providerUrl: "https://gdacs.org",
        cadenceKey: "realTime",
        type: "api",
      },
    ],
  },
  {
    id: "displacement",
    i18nKey: "displacement",
    sources: [
      {
        i18nKey: "iomDtm",
        providerUrl: "https://dtm.iom.int",
        cadenceKey: "monthly",
        type: "direct",
      },
    ],
  },
  {
    id: "risk",
    i18nKey: "risk",
    sources: [
      {
        i18nKey: "informRisk",
        providerUrl: "https://drmkc.jrc.ec.europa.eu/inform-index",
        cadenceKey: "annual",
        type: "direct",
      },
      {
        i18nKey: "informSeverity",
        providerUrl: "https://www.acaps.org",
        cadenceKey: "monthly",
        type: "direct",
      },
    ],
  },
  {
    id: "field",
    i18nKey: "field",
    sources: [
      {
        key: "field_officer",
        i18nKey: "fieldOfficer",
        cadenceKey: "adHoc",
        type: "manual",
      },
      {
        key: "partner",
        i18nKey: "partner",
        cadenceKey: "adHoc",
        type: "manual",
      },
      {
        key: "government",
        i18nKey: "government",
        cadenceKey: "adHoc",
        type: "manual",
      },
    ],
  },
];

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
  const t = useTranslations("admin.data");
  const format = useFormatter();
  const typeBadgeColor = source.type === "api" ? "blue" : source.type === "direct" ? "violet" : "gray";
  const typeLabel = t(`types.${source.type}`);
  const barWidth = signalCount && maxCount > 0 ? Math.max((signalCount / maxCount) * 100, 2) : 0;

  return (
    <Card p="md" radius={0} style={{ background: colors.bgWhite }}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} mb={4} align="center">
            <Text fw={600} style={{ fontSize: fontSizesPx.base }}>{t(`sources.${source.i18nKey}.name`)}</Text>
            <Badge size="xs" color={typeBadgeColor} variant="light" radius="sm">{typeLabel}</Badge>
            {isActive === false && (
              <Badge size="xs" color="gray" variant="outline" radius="sm">{t("inactive")}</Badge>
            )}
          </Group>
          <Text c={colors.textSecondary} style={{ fontSize: fontSizesPx.sm }} mb={6}>
            {t(`sources.${source.i18nKey}.description`)}
          </Text>
          <Group gap={16}>
            <Text style={{ fontSize: fontSizesPx.xs, color: colors.textSecondary }}>
              {t("provider")} <span style={{ color: colors.textPrimary }}>{t(`sources.${source.i18nKey}.provider`)}</span>
            </Text>
            <Text style={{ fontSize: fontSizesPx.xs, color: colors.textSecondary }}>
              {t("cadence")} <span style={{ color: colors.textPrimary }}>{t(`cadences.${source.cadenceKey}`)}</span>
            </Text>
            {source.providerUrl && (
              <Anchor href={source.providerUrl} target="_blank"
                style={{ fontSize: fontSizesPx.xs, color: colors.accent }}>
                <Group gap={4} align="center">
                  <IconExternalLink size={11} />
                  {t("docs")}
                </Group>
              </Anchor>
            )}
          </Group>
        </Box>

        <Box style={{ width: 130, flexShrink: 0, textAlign: "end" }}>
          {signalCount !== null ? (
            <>
              <Text fw={700} style={{ fontSize: 20, color: signalCount > 0 ? colors.textPrimary : colors.textSecondary }}>
                {signalCount}
              </Text>
              <Text style={{ fontSize: fontSizesPx.xs, color: colors.textSecondary }} mb={2}>
                {t("signalsUnit")}
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
                {latestAt ? format.relativeTime(new Date(latestAt)) : t("noDataYet")}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: fontSizesPx.xs, color: colors.textSecondary }}>
              {source.type === "direct" ? t("directQuery") : t("noSignals")}
            </Text>
          )}
        </Box>
      </Group>
    </Card>
  );
}

function DataPanel() {
  const t = useTranslations("admin.data");
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
          background: demoEnabled ? colors.accentLight : colors.bgWhite,
        }}>
          <Group justify="space-between" align="center">
            <Box>
              <Group gap={8} mb={4}>
                <Text fw={600} style={{ fontSize: fontSizesPx.base }}>{t("demoTitle")}</Text>
                <Badge size="xs" color="orange" variant="light" radius="sm">{t("demoBadge")}</Badge>
              </Group>
              <Text c={colors.textSecondary} style={{ fontSize: fontSizesPx.sm }}>
                {t("demoDescription")}
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
            <Text c={colors.textSecondary} style={{ fontSize: fontSizesPx.sm }}>{t("loading")}</Text>
          </Group>
        )}

        {/* Source groups */}
        {!isLoading && DATA_GROUPS.map((group) => (
          <Box key={group.id}>
            <Text tt="uppercase" fw={700} mb={2}
              style={{ fontSize: fontSizesPx.xs, letterSpacing: "0.08em", color: colors.textSecondary }}>
              {t(`groups.${group.i18nKey}.label`)}
            </Text>
            <Text mb={8} style={{ fontSize: fontSizesPx.sm, color: colors.textSecondary }}>
              {t(`groups.${group.i18nKey}.description`)}
            </Text>
            <Box style={{ border: `1px solid ${colors.border}` }}>
              {group.sources.map((source, idx) => (
                <Box key={source.key ?? source.i18nKey}>
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
  const t = useTranslations("admin");
  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title={t("header.title")}
        subtitle={t("header.subtitle")}
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
            {t("tabs.users")}
          </Tabs.Tab>
          <Tabs.Tab
            value="organisations"
            leftSection={<IconBuilding size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            {t("tabs.organisations")}
          </Tabs.Tab>
          <Tabs.Tab
            value="invitations"
            leftSection={<IconUserPlus size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            {t("tabs.invitations")}
          </Tabs.Tab>
          <Tabs.Tab
            value="features"
            leftSection={<IconToggleLeft size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            {t("tabs.features")}
          </Tabs.Tab>
          <Tabs.Tab
            value="data"
            leftSection={<IconDatabase size={16} />}
            style={{ fontSize: fontSizesPx.base }}
          >
            {t("tabs.data")}
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
