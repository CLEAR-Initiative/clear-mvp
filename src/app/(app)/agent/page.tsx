"use client";

/**
 * The Agent page: your past Conversations with the CLEAR Agent beside the
 * open Thread. It shares the active Thread with the Agent drawer.
 */

import { useFormatter, useTranslations } from "next-intl";
import { Alert, Box, Button, Group, Loader, NavLink, ScrollArea, Stack, Text } from "@mantine/core";
import { IconMessageCircle, IconPlus } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui";
import { useAgent } from "~/components/agent/agent-provider";
import { AgentThread } from "~/components/agent/agent-thread";
import { api } from "~/trpc/react";

export default function AgentPage() {
  const t = useTranslations("agent");
  const format = useFormatter();
  const { available, chat, threadId, openThread, newThread } = useAgent();
  const history = api.agent.listConversations.useInfiniteQuery(
    {},
    { enabled: available, getNextPageParam: (page) => page.nextCursor },
  );
  const conversations = history.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    // Exactly the viewport (less the mobile top bar and bottom nav, whose
    // height includes the safe-area inset), so the Thread scrolls inside it
    // and its input box stays on screen above the nav.
    <Box
      h={{ base: "calc(100dvh - 128px - env(safe-area-inset-bottom, 0px))", sm: "100dvh" }}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <PageHeader
        title={t("page.title")}
        subtitle={t("page.subtitle")}
        breadcrumbs={["CLEAR", t("page.title")]}
      />
      {!available ? (
        <Box p={24}>
          <Alert color="gray">{t("page.unavailable")}</Alert>
        </Box>
      ) : (
        <Group align="stretch" gap={0} wrap="nowrap" style={{ flex: 1, minHeight: 0 }}>
          <Box
            component="nav"
            aria-label={t("page.historyLabel")}
            visibleFrom="sm"
            style={{ width: 280, flexShrink: 0, borderInlineEnd: "1px solid var(--color-border, #E5E5E5)" }}
          >
            <Stack gap={8} p={16}>
              <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={newThread}>
                {t("drawer.newThread")}
              </Button>
              <ScrollArea.Autosize mah="calc(100dvh - 220px)">
                {history.isLoading && <Loader size="sm" />}
                {conversations.map((c) => (
                  <NavLink
                    key={c.id}
                    label={c.title || t("page.untitled")}
                    description={format.dateTime(new Date(c.updatedAt), { dateStyle: "medium", timeStyle: "short" })}
                    leftSection={<IconMessageCircle size={14} />}
                    active={c.id === threadId}
                    onClick={() => openThread(c.id)}
                  />
                ))}
                {history.isSuccess && conversations.length === 0 && (
                  <Text size="sm" c="dimmed">
                    {t("page.empty")}
                  </Text>
                )}
                {history.hasNextPage && (
                  <Button
                    size="xs"
                    variant="subtle"
                    loading={history.isFetchingNextPage}
                    onClick={() => void history.fetchNextPage()}
                  >
                    {t("page.loadMore")}
                  </Button>
                )}
              </ScrollArea.Autosize>
            </Stack>
          </Box>
          {/* The Thread fills the height: its turns scroll, its input box stays at the bottom. */}
          <Box p={24} style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <Box style={{ maxWidth: 820, width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <Group justify="flex-end" mb={16} hiddenFrom="sm">
                <Button size="xs" variant="subtle" leftSection={<IconPlus size={14} />} onClick={newThread}>
                  {t("drawer.newThread")}
                </Button>
              </Group>
              <AgentThread key={chat.id} chat={chat} />
            </Box>
          </Box>
        </Group>
      )}
    </Box>
  );
}
