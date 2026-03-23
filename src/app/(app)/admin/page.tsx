"use client";

import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconExternalLink,
  IconLock,
  IconToggleLeft,
  IconTrash,
  IconUserCheck,
  IconUsers,
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
  | { type: "role";   user: GqlUser; newRole: string }
  | { type: "delete"; user: GqlUser };

const ROLES = [
  { value: "field",     label: "Field" },
  { value: "analyst",   label: "Analyst" },
  { value: "org_admin", label: "Org Admin" },
  { value: "admin",     label: "Admin" },
];

const roleColor: Record<string, string> = {
  admin:     "orange",
  org_admin: "grape",
  analyst:   "blue",
  field:     "green",
  viewer:    "gray",
  user:      "gray",
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
  const rafRef       = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const fillColor    = danger ? colors.critical : colors.accent;

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

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={(e) => { e.preventDefault(); startHold(); }}
      onTouchEnd={stopHold}
      onTouchCancel={stopHold}
      style={{
        position:   "relative",
        overflow:   "hidden",
        background: fillColor,
        color:      "#fff",
        border:     "none",
        borderRadius: 6,
        padding:    `0 ${spacingPx[5]}px`,
        height:     36,
        minWidth:   160,
        fontSize:   fontSizesPx.base,
        fontWeight: 600,
        cursor:     "pointer",
        userSelect: "none",
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Progress fill */}
      <Box
        style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
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

  const body = action
    ? isDelete
      ? <>
          Are you sure you want to remove{" "}
          <Text component="span" fw={600} c={colors.textPrimary}>{action.user.name}</Text>{" "}
          from your team? This action cannot be undone.
        </>
      : <>
          Change{" "}
          <Text component="span" fw={600} c={colors.textPrimary}>{action.user.name}</Text>
          {"'s role from "}
          <Text component="span" fw={600} c={colors.textPrimary} tt="capitalize">{action.user.role}</Text>
          {" to "}
          <Text component="span" fw={600} c={colors.textPrimary} tt="capitalize">{(action as Extract<PendingAction, { type: "role" }>).newRole}</Text>
          {"?"}
        </>
    : null;

  return (
    <Modal
      opened={!!action}
      onClose={onClose}
      title={<Text fw={600} style={{ fontSize: fontSizesPx.xl }}>{title}</Text>}
      centered
      size="sm"
      styles={{ header: { borderBottom: border, paddingBottom: spacingPx[4] } }}
    >
      <Text c={colors.textSecondary} style={{ fontSize: fontSizesPx.base, lineHeight: 1.6 }} mt={spacingPx[3]}>
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
  const { data, isLoading } = api.auth.listUsers.useQuery(undefined, { staleTime: 30_000 });

  const [localUsers,   setLocalUsers]   = useState<GqlUser[]>([]);
  const [filter,       setFilter]       = useState<FilterMode>("all");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  // Tracks the role shown in the Select while the modal is open
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.users) setLocalUsers(data.users as GqlUser[]);
  }, [data]);

  const filteredUsers = filter === "pending"
    ? localUsers.filter((u) => !u.isActive)
    : localUsers;

  const pendingCount = localUsers.filter((u) => !u.isActive).length;

  /* ── handlers ── */
  const handleRoleSelect = (user: GqlUser, newRole: string | null) => {
    if (!newRole || newRole === user.role) return;
    setPendingRoles((prev) => ({ ...prev, [user.id]: newRole }));
    setPendingAction({ type: "role", user, newRole });
  };

  const handleActivate = (user: GqlUser) => {
    setLocalUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: true } : u));
  };

  const handleDelete = (user: GqlUser) => {
    setPendingAction({ type: "delete", user });
  };

  const handleModalClose = () => {
    if (pendingAction?.type === "role") {
      const id = pendingAction.user.id;
      setPendingRoles((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
    setPendingAction(null);
  };

  const handleConfirm = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "role") {
      const id = pendingAction.user.id;
      setLocalUsers((prev) =>
        prev.map((u) => u.id === id ? { ...u, role: pendingAction.newRole } : u),
      );
      setPendingRoles((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } else if (pendingAction.type === "delete") {
      setLocalUsers((prev) => prev.filter((u) => u.id !== pendingAction.user.id));
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

  const adminCount  = localUsers.filter((u) => u.role === "admin" || u.role === "org_admin").length;
  const activeCount = localUsers.filter((u) => u.isActive).length;

  const stats: StatItem[] = [
    { label: "Total Users", value: String(localUsers.length) },
    { label: "Admins",      value: String(adminCount),  color: colors.accent },
    { label: "Active",      value: String(activeCount), color: colors.success },
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
                { value: "all",     label: "All users" },
                { value: "pending", label: "Pending approval" },
              ]}
              size="xs"
              variant="unstyled"
              fw={600}
              style={{ fontSize: fontSizesPx.lg, width: 160 }}
              styles={{ input: { fontWeight: 600, fontSize: fontSizesPx.lg, color: colors.textPrimary } }}
            />
            <Badge size="sm" variant="light" color={filter === "pending" && pendingCount > 0 ? "orange" : "gray"}>
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
                  <Text c={colors.textMuted} ta="center" py={24} style={{ fontSize: fontSizesPx.base }}>
                    {filter === "pending" ? "No users pending approval" : "No users found"}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredUsers.map((user) => (
                <Table.Tr key={user.id}>
                  {/* User */}
                  <Table.Td>
                    <Group gap={10}>
                      <Avatar src={user.image} size={32} radius="xl" color="accent">
                        {user.name?.[0]?.toUpperCase() ?? "?"}
                      </Avatar>
                      <Box>
                        <Text fw={500} style={{ fontSize: fontSizesPx.base, color: colors.textPrimary }}>
                          {user.name}
                        </Text>
                        <Text style={{ fontSize: fontSizesPx.sm, color: colors.textMuted }}>
                          {user.emailVerified ? "Verified" : "Unverified"}
                        </Text>
                      </Box>
                    </Group>
                  </Table.Td>

                  {/* Role — dropdown */}
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
                          color: roleColor[user.role] === "orange"
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
                    <Text style={{ fontSize: fontSizesPx.base, color: colors.textSecondary }}>
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
  const { data: features, isLoading } = api.featureFlags.getAll.useQuery(undefined, {
    staleTime: 30_000,
  });
  const { toggle } = useFeatureFlags();

  if (isLoading || !features) {
    return (
      <Box p={24} style={{ display: "flex", justifyContent: "center" }}>
        <Loader />
      </Box>
    );
  }

  const enabledCount  = features.filter((f) => f.enabled).length;
  const disabledCount = features.filter((f) => !f.enabled).length;

  const stats: StatItem[] = [
    { label: "Total Features", value: String(features.length) },
    { label: "Enabled",        value: String(enabledCount),  color: colors.success },
    { label: "Disabled",       value: String(disabledCount), color: colors.critical },
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
                  style={{ alignSelf: "stretch", background: tierColors[group.tier], borderRadius: 2 }}
                />
                <Text fw={600} c={colors.textPrimary} style={{ fontSize: fontSizesPx.lg }}>
                  {group.label}
                </Text>
                <Badge size="sm" color={tierBadgeColors[group.tier]} variant="light">
                  {group.features.length} features
                </Badge>
              </Group>
              {group.tier === 1 && (
                <Group gap={4}>
                  <IconLock size={14} style={{ color: colors.textMuted }} />
                  <Text size="xs" c={colors.textMuted}>Always enabled</Text>
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
                      borderBottom: i < group.features.length - 1 ? border : undefined,
                      opacity: isCore ? 0.7 : 1,
                    }}
                  >
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group gap={8} mb={2}>
                        <Text fw={500} c={colors.textPrimary} style={{ fontSize: fontSizesPx.lg }}>
                          {feature.label}
                        </Text>
                        {isCore && <IconLock size={14} style={{ color: colors.textMuted }} />}
                      </Group>
                      <Group gap={8}>
                        <Text c={colors.textSecondary} style={{ fontSize: fontSizesPx.md }}>
                          {feature.description}
                        </Text>
                        {feature.route && (
                          <Anchor
                            component={Link}
                            href={feature.route}
                            c={colors.textMuted}
                            style={{ fontSize: fontSizesPx.sm, display: "inline-flex", alignItems: "center", gap: 3 }}
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
                      onChange={(e) => toggle(feature.key, e.currentTarget.checked)}
                      size="md"
                      color={colors.accent}
                      styles={{ track: { cursor: isCore ? "not-allowed" : "pointer" } }}
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

/* ─── Page ────────────────────────────────────────────────── */
export default function AdminPage() {
  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Admin"
        subtitle="Platform configuration and user management"
      />

      <Tabs
        defaultValue="users"
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <Tabs.List
          px={24}
          style={{ background: colors.bgWhite, borderBottom: border, flexShrink: 0 }}
        >
          <Tabs.Tab value="users"    leftSection={<IconUsers size={16} />}      style={{ fontSize: fontSizesPx.base }}>Users</Tabs.Tab>
          <Tabs.Tab value="features" leftSection={<IconToggleLeft size={16} />} style={{ fontSize: fontSizesPx.base }}>Features</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users"    style={{ flex: 1, overflowY: "auto" }}><UsersPanel /></Tabs.Panel>
        <Tabs.Panel value="features" style={{ flex: 1, overflowY: "auto" }}><FeaturesPanel /></Tabs.Panel>
      </Tabs>
    </Box>
  );
}
