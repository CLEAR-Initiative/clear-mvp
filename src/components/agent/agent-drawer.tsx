"use client";

/**
 * The Agent drawer: the CLEAR Agent in a right-hand slide-out on every page
 * of the app, plus the button that opens it. Hidden entirely unless the
 * `agent` flag is on and the user is approved to read content. Logical
 * (inline-start/end) placement so it mirrors under right-to-left locales.
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ActionIcon, Affix, Button, Drawer, Group, Tooltip } from "@mantine/core";
import { IconArrowsMaximize, IconMessageCircle, IconPlus } from "@tabler/icons-react";
import { useAgent } from "~/components/agent/agent-provider";
import { AgentThread } from "~/components/agent/agent-thread";

export function AgentDrawer() {
  const { available, open, setOpen, chat, newThread } = useAgent();
  const pathname = usePathname();
  if (!available) return null;
  // The Agent page shows the Thread full-screen already.
  const onAgentPage = pathname === "/agent";

  return (
    <>
      {!onAgentPage && !open && (
        <Affix position={{ bottom: 88, right: 24 }} zIndex={150} style={{ insetInlineStart: "auto" }}>
          <Tooltip label="Ask the CLEAR Agent" position="left">
            <ActionIcon
              size={48}
              radius="xl"
              variant="filled"
              aria-label="Open the Agent drawer"
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
        title="CLEAR Agent"
        lockScroll={false}
        withOverlay={false}
        closeButtonProps={{ "aria-label": "Close the Agent drawer" }}
      >
        <Group justify="space-between" mb={16}>
          <Button size="xs" variant="subtle" leftSection={<IconPlus size={14} />} onClick={newThread}>
            New thread
          </Button>
          <Button
            size="xs"
            variant="subtle"
            component={Link}
            href="/agent"
            leftSection={<IconArrowsMaximize size={14} />}
            onClick={() => setOpen(false)}
          >
            Open Agent page
          </Button>
        </Group>
        <AgentThread key={chat.id} chat={chat} />
      </Drawer>
    </>
  );
}
