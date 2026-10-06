"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Badge, Box, Menu, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { bellRows, bellUnreadCount, isUnread, safeActionPath } from "~/lib/notifications";
import { colors, fontSizesPx, spacingPx } from "~/lib/tokens";
import type { GqlNotification } from "~/lib/types/graphql";

interface NotificationsBellProps {
  /** Desktop sidebar: labels hide when collapsed, the menu opens to the
   * right. Mobile drawer: full-width row, the menu opens above. */
  variant: "sidebar" | "drawer";
  collapsed?: boolean;
  /** Mobile: close the drawer when a notification is opened. */
  onNavigate?: () => void;
}

/**
 * The notifications bell (clear-api ADR-0010, V2): the signed-in user's
 * Task outcome notifications ("Impact prior proposed — review it", "…
 * failed"), each opening its Event. Opening one marks it read. Behind the
 * `impact_prior_review` flag with the rest of the Review flow; clear-api
 * writes the rows and sends any email, clear-mvp only shows them.
 */
export function NotificationsBell({ variant, collapsed = false, onNavigate }: NotificationsBellProps) {
  const enabled = useFeatureEnabled("impact_prior_review");
  const t = useTranslations("nav.notifications");
  const format = useFormatter();
  const router = useRouter();
  const utils = api.useUtils();

  const query = api.notifications.list.useQuery(undefined, {
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const markRead = api.notifications.markRead.useMutation({
    onSuccess: () => void utils.notifications.list.invalidate(),
  });

  if (!enabled) return null;

  const rows = bellRows(query.data ?? []);
  const unread = bellUnreadCount(query.data ?? []);
  const labelStyle = collapsed ? { opacity: 0, width: 0, overflow: "hidden" as const, whiteSpace: "nowrap" as const } : {};

  const open = (n: GqlNotification) => {
    if (isUnread(n)) markRead.mutate({ id: n.id });
    const path = safeActionPath(n.actionUrl);
    onNavigate?.();
    if (path) router.push(path);
  };

  const target = (
    <UnstyledButton
      aria-label={unread > 0 ? t("unread", { count: unread }) : t("title")}
      data-testid="notifications-bell"
      data-unread={unread}
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacingPx[3],
        padding: spacingPx[3],
        width: "100%",
        borderRadius: 6,
        background: "transparent",
        color: colors.textSecondary,
        transition: "background 150ms",
        marginBottom: spacingPx[1],
        minHeight: variant === "drawer" ? 44 : undefined,
        position: "relative",
      }}
      className="hover:bg-[var(--color-bg-muted)] transition-colors"
    >
      <Box style={{ position: "relative", display: "flex", flexShrink: 0 }}>
        <IconBell size={18} style={{ opacity: 0.7 }} />
        {unread > 0 && collapsed && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: 999,
              background: colors.accent,
            }}
          />
        )}
      </Box>
      <Text fw={500} style={{ fontSize: fontSizesPx.lg, flex: 1, ...labelStyle }}>
        {t("title")}
      </Text>
      {unread > 0 && (
        <Badge
          size="xs"
          variant="filled"
          color="accent"
          circle
          data-testid="notifications-unread"
          style={{ fontSize: fontSizesPx["2xs"], fontWeight: 600, flexShrink: 0, ...labelStyle }}
        >
          {unread}
        </Badge>
      )}
    </UnstyledButton>
  );

  return (
    <Menu position={variant === "sidebar" ? "right-end" : "top"} offset={8} withArrow width={320} shadow="md">
      <Menu.Target>
        <Box>{collapsed ? <Tooltip label={t("title")} position="right" withArrow>{target}</Tooltip> : target}</Box>
      </Menu.Target>
      <Menu.Dropdown data-testid="notifications-menu">
        <Menu.Label>{t("title")}</Menu.Label>
        {query.isError ? (
          <Text size="xs" c="var(--color-critical)" px={12} py={8} data-testid="notifications-error">
            {t("loadError")}
          </Text>
        ) : rows.length === 0 ? (
          <Text size="xs" c="var(--color-text-muted)" px={12} py={8} data-testid="notifications-empty">
            {t("empty")}
          </Text>
        ) : (
          rows.map((n) => {
            const path = safeActionPath(n.actionUrl);
            const unreadRow = isUnread(n);
            const body = (
              <Box style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <Text size="xs" fw={unreadRow ? 600 : 400} c="var(--color-text-primary)" style={{ whiteSpace: "normal" }}>
                  {n.message}
                </Text>
                <Text size="xs" c="var(--color-text-muted)">
                  {format.relativeTime(new Date(n.createdAt))}
                  {path && n.actionText ? ` · ${n.actionText}` : ""}
                </Text>
              </Box>
            );
            return path ? (
              <Menu.Item
                key={n.id}
                component={Link}
                href={path}
                onClick={(e) => {
                  // A modifier click opens a new tab or window: let the
                  // link do that, only mark the row read.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                    if (isUnread(n)) markRead.mutate({ id: n.id });
                    return;
                  }
                  e.preventDefault();
                  open(n);
                }}
                onAuxClick={(e) => {
                  // A middle click never reaches onClick (it is an auxclick).
                  if (e.button === 1 && isUnread(n)) markRead.mutate({ id: n.id });
                }}
                data-testid="notification-row"
                data-unread={unreadRow}
              >
                {body}
              </Menu.Item>
            ) : (
              <Menu.Item key={n.id} onClick={() => open(n)} data-testid="notification-row" data-unread={unreadRow}>
                {body}
              </Menu.Item>
            );
          })
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
