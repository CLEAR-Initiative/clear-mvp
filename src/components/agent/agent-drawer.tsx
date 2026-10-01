"use client";

/**
 * The Agent drawer: the CLEAR Agent in a right-hand slide-out on every page
 * of the app, plus the button that opens it. Hidden entirely unless the
 * `agent` flag is on and the user is approved to read content. Logical
 * (inline-start/end) placement so it mirrors under right-to-left locales.
 *
 * Above the Thread: a header (the Agent, the Thread's title, width, recent
 * Conversations, new Thread, the Agent page, close) and the context row.
 */

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import Link from "next/link";
import {
  ActionIcon,
  Affix,
  Box,
  Drawer,
  Group,
  Menu,
  SegmentedControl,
  Text,
  ThemeIcon,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowsMaximize,
  IconHistory,
  IconMessageCircle,
  IconPlus,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { AgentContextRow } from "~/components/agent/agent-context-row";
import { useAgent } from "~/components/agent/agent-provider";
import { AgentThread } from "~/components/agent/agent-thread";
import { isLocale, localeDirection } from "~/i18n/config";
import { api } from "~/trpc/react";

// ── Width ────────────────────────────────────────────────────────────────

const WIDTH_KEY = "agent-drawer-width";
const WIDTHS = { s: 380, m: 480, l: 720 } as const;
type Width = keyof typeof WIDTHS;
const isWidth = (v: unknown): v is Width => typeof v === "string" && v in WIDTHS;

/** The user's chosen width, remembered per browser (a preference, not part of the Thread). */
function useDrawerWidth(): [Width, (w: Width) => void] {
  const [width, setWidth] = useState<Width>("m");
  // After mount, so server and client render the same first frame.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WIDTH_KEY);
      if (isWidth(saved)) setWidth(saved);
    } catch {
      /* private mode */
    }
  }, []);
  const choose = (w: Width) => {
    setWidth(w);
    try {
      localStorage.setItem(WIDTH_KEY, w);
    } catch {
      /* private mode / quota */
    }
  };
  return [width, choose];
}

// ── Drawer ───────────────────────────────────────────────────────────────

export function AgentDrawer() {
  const { available, open, setOpen, chat } = useAgent();
  const pathname = usePathname();
  const t = useTranslations("agent");
  const locale = useLocale();
  const [width, setWidth] = useDrawerWidth();
  const isMobile = useMediaQuery("(max-width: 48em)") === true;
  if (!available) return null;
  // The inline-end side: right in left-to-right locales, left under Arabic.
  // Affix positions physically, so it flips here; Mantine's Drawer already
  // lays `position="right"` out on the inline-end side under rtl.
  const rtl = isLocale(locale) && localeDirection[locale] === "rtl";
  const endSide = rtl ? "left" : "right";
  // The Agent page shows the Thread full-screen already.
  const onAgentPage = pathname === "/agent";

  return (
    <>
      {!onAgentPage && !open && (
        <Affix position={{ bottom: 88, [endSide]: 24 }} zIndex={150}>
          <Tooltip label={t("drawer.launcherTooltip")} position={rtl ? "right" : "left"}>
            <ActionIcon
              size={48}
              radius="xl"
              variant="filled"
              aria-label={t("drawer.open")}
              onClick={() => setOpen(true)}
            >
              <IconMessageCircle size={24} />
            </ActionIcon>
          </Tooltip>
        </Affix>
      )}

      <Drawer.Root
        opened={open && !onAgentPage}
        onClose={() => setOpen(false)}
        position="right"
        // Never wider than the screen; full width on a phone.
        size={isMobile ? "100%" : `min(${WIDTHS[width]}px, 100vw)`}
        lockScroll={false}
      >
        <Drawer.Content style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <DrawerHeader width={width} onWidth={setWidth} showWidth={!isMobile} />
          <AgentContextRow />
          <Drawer.Body
            style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
            pt={16}
          >
            <AgentThread key={chat.id} chat={chat} />
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </>
  );
}

// ── Header ───────────────────────────────────────────────────────────────

const HISTORY_SIZE = 10;

function DrawerHeader({
  width,
  onWidth,
  showWidth,
}: {
  width: Width;
  onWidth: (w: Width) => void;
  showWidth: boolean;
}) {
  const t = useTranslations("agent");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { threadId, loadedTitle, openThread, newThread, setOpen } = useAgent();
  // Mounted only while the drawer is open, so this runs only then.
  const recent = api.agent.listConversations.useQuery({});
  const conversations = recent.data?.items ?? [];
  const listed = conversations.find((c) => c.id === threadId);
  // A Thread older than the recent list falls back to the title it was loaded with.
  const title = listed?.title || loadedTitle || t("drawer.newThread");

  const widthLabels: Record<Width, string> = {
    s: t("drawer.widthSmall"),
    m: t("drawer.widthMedium"),
    l: t("drawer.widthLarge"),
  };

  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      gap={12}
      px={16}
      py={12}
      data-testid="agent-drawer-header"
      style={{ borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}
    >
      <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
        <ThemeIcon size={36} radius="md" color="var(--color-accent)" aria-hidden>
          <IconSparkles size={20} />
        </ThemeIcon>
        <Box style={{ minWidth: 0 }}>
          <Drawer.Title fz="md" fw={600} lh={1.3}>
            {t("name")}
          </Drawer.Title>
          <Text size="sm" c="dimmed" truncate="end" lh={1.3}>
            {title}
          </Text>
        </Box>
      </Group>

      <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
        {showWidth && (
          <SegmentedControl
            size="xs"
            aria-label={t("drawer.width")}
            value={width}
            onChange={(v) => isWidth(v) && onWidth(v)}
            data={(Object.keys(WIDTHS) as Width[]).map((w) => ({
              value: w,
              label: (
                <>
                  <span aria-hidden>{w.toUpperCase()}</span>
                  <VisuallyHidden>{widthLabels[w]}</VisuallyHidden>
                </>
              ),
            }))}
            me={4}
          />
        )}

        <Menu position="bottom-end" width={300} withinPortal>
          <Menu.Target>
            <Tooltip label={t("drawer.history")}>
              <ActionIcon variant="subtle" color="gray" size={32} aria-label={t("drawer.history")}>
                <IconHistory size={18} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            {conversations.length === 0 && <Menu.Label>{t("drawer.historyEmpty")}</Menu.Label>}
            {conversations.slice(0, HISTORY_SIZE).map((c) => (
              <Menu.Item
                key={c.id}
                onClick={() => openThread(c.id)}
                aria-current={c.id === threadId ? "true" : undefined}
                fw={c.id === threadId ? 600 : undefined}
                rightSection={
                  <Text size="xs" c="dimmed">
                    {format.relativeTime(new Date(c.updatedAt), now)}
                  </Text>
                }
              >
                <Text size="sm" truncate="end">
                  {c.title || t("page.untitled")}
                </Text>
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Item component={Link} href="/agent" onClick={() => setOpen(false)}>
              {t("drawer.allConversations")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <HeaderIcon label={t("drawer.newThread")} onClick={newThread}>
          <IconPlus size={18} />
        </HeaderIcon>
        <Tooltip label={t("drawer.openPage")}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size={32}
            component={Link}
            href="/agent"
            aria-label={t("drawer.openPage")}
            onClick={() => setOpen(false)}
          >
            <IconArrowsMaximize size={18} />
          </ActionIcon>
        </Tooltip>
        <HeaderIcon label={t("drawer.close")} onClick={() => setOpen(false)}>
          <IconX size={18} />
        </HeaderIcon>
      </Group>
    </Group>
  );
}

function HeaderIcon({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip label={label}>
      <ActionIcon variant="subtle" color="gray" size={32} aria-label={label} onClick={onClick}>
        {children}
      </ActionIcon>
    </Tooltip>
  );
}
