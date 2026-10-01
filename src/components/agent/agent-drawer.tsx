"use client";

/**
 * The Agent drawer: the CLEAR Agent in a right-hand slide-out on every page
 * of the app, plus the button that opens it. Hidden entirely unless the
 * `agent` flag is on and the user is approved to read content. Logical
 * (inline-start/end) placement so it mirrors under right-to-left locales.
 */

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ActionIcon, Affix, Button, Drawer, Group, Tooltip } from "@mantine/core";
import { IconArrowsMaximize, IconMessageCircle, IconPlus } from "@tabler/icons-react";
import { useAgent } from "~/components/agent/agent-provider";
import { AgentThread } from "~/components/agent/agent-thread";
import { isLocale, localeDirection } from "~/i18n/config";

export function AgentDrawer() {
  const { available, open, setOpen, chat, newThread } = useAgent();
  const pathname = usePathname();
  const t = useTranslations("agent");
  const locale = useLocale();
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

      <Drawer
        opened={open && !onAgentPage}
        onClose={() => setOpen(false)}
        position="right"
        size="md"
        title={t("name")}
        lockScroll={false}
        withOverlay={false}
        closeButtonProps={{ "aria-label": t("drawer.close") }}
      >
        <Group justify="space-between" mb={16}>
          <Button size="xs" variant="subtle" leftSection={<IconPlus size={14} />} onClick={newThread}>
            {t("drawer.newThread")}
          </Button>
          <Button
            size="xs"
            variant="subtle"
            component={Link}
            href="/agent"
            leftSection={<IconArrowsMaximize size={14} />}
            onClick={() => setOpen(false)}
          >
            {t("drawer.openPage")}
          </Button>
        </Group>
        <AgentThread key={chat.id} chat={chat} />
      </Drawer>
    </>
  );
}
