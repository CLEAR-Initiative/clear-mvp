"use client";

import { tagEventPath } from "~/lib/analytics/event-source";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Badge, Box, Menu, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useFeatureEnabled } from "~/components/feature-flags-provider";
import { isUnread, markBellRead, safeActionPath } from "~/lib/notifications";
import { canReadContent } from "~/lib/roles";
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
 * Task outcome notifications ("Web search: 3 proposed signals to review",
 * "Web search failed", …), each opening its Event. Opening one marks it
 * read. Behind the `impact_prior_review` flag with the rest of the Review
 * flow, and only for
 * approved roles: clear-api sends Task outcomes to requesters (any team
 * content writer, so a global viewer too), admins and team analysts, never
 * to a pending account. clear-api writes the rows and sends any email,
 * clear-mvp only shows them.
 */
export function NotificationsBell({ variant, collapsed = false, onNavigate }: NotificationsBellProps) {
  const flagOn = useFeatureEnabled("impact_prior_review");
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000, enabled: flagOn });
  const enabled = flagOn && canReadContent(authData?.user?.role);
  const t = useTranslations("nav.notifications");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const router = useRouter();
  const utils = api.useUtils();

  const [menuOpen, setMenuOpen] = useState(false);
  const query = api.notifications.bell.useQuery(undefined, {
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const markRead = api.notifications.markRead.useMutation({
    onMutate: async ({ id }) => {
      await utils.notifications.bell.cancel();
      const previous = utils.notifications.bell.getData();
      utils.notifications.bell.setData(undefined, (current) => markBellRead(current, id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) utils.notifications.bell.setData(undefined, context.previous);
    },
    onSettled: () => {
      void utils.notifications.bell.invalidate();
    },
  });

  // The menu is portaled and, left uncapped, grows past the viewport. Wheel
  // events then scroll the page and the menu jumps with it. While it is
  // open the page stays put; the menu itself scrolls.
  useEffect(() => {
    if (!menuOpen) return;
    const blockPageScroll = (event: Event) => {
      const menu = document.querySelector("[data-testid='notifications-menu']");
      if (menu && event.target instanceof Node && menu.contains(event.target)) return;
      event.preventDefault();
    };
    document.addEventListener("wheel", blockPageScroll, { passive: false });
    document.addEventListener("touchmove", blockPageScroll, { passive: false });
    return () => {
      document.removeEventListener("wheel", blockPageScroll);
      document.removeEventListener("touchmove", blockPageScroll);
    };
  }, [menuOpen]);

  if (!enabled) return null;

  const rows = query.data?.rows ?? [];
  const unread = query.data?.unread ?? 0;
  const labelStyle = collapsed ? { opacity: 0, width: 0, overflow: "hidden" as const, whiteSpace: "nowrap" as const } : {};

  const open = (n: GqlNotification) => {
    if (isUnread(n)) markRead.mutate({ id: n.id });
    const path = safeActionPath(n.actionUrl);
    onNavigate?.();
    if (path) router.push(tagEventPath(path, "inbox"));
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
    <Menu
      position={variant === "sidebar" ? "right-end" : "top"}
      offset={8}
      withArrow
      width={320}
      shadow="md"
      floatingStrategy="fixed"
      onChange={setMenuOpen}
      middlewares={{
        size: {
          padding: 8,
          apply({ availableHeight, elements }) {
            // React owns max-height; the middleware only publishes how much
            // room is left, so a later render does not wipe the cap.
            elements.floating.style.setProperty(
              "--notifications-menu-max-h",
              `${Math.max(120, Math.floor(availableHeight))}px`,
            );
          },
        },
      }}
    >
      <Menu.Target>
        <Box>{collapsed ? <Tooltip label={t("title")} position="right" withArrow>{target}</Tooltip> : target}</Box>
      </Menu.Target>
      <Menu.Dropdown
        data-testid="notifications-menu"
        style={{
          maxHeight: "var(--notifications-menu-max-h, calc(100dvh - 16px))",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
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
            const actionPath = safeActionPath(n.actionUrl);
            const path = actionPath && tagEventPath(actionPath, "inbox");
            const unreadRow = isUnread(n);
            const body = (
              <Box style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <Text size="xs" fw={unreadRow ? 600 : 400} c="var(--color-text-primary)" style={{ whiteSpace: "normal" }}>
                  {n.message}
                </Text>
                <Text size="xs" c="var(--color-text-muted)">
                  {format.relativeTime(new Date(n.createdAt), now)}
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
