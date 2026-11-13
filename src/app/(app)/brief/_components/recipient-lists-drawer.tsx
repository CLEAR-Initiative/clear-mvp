"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ActionIcon, Badge, Box, Button, Card, Drawer, Group, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconX } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { RecipientList } from "~/lib/brief/types";

/**
 * Recipient lists: create a list, add or remove addresses. Addresses need
 * not belong to CLEAR users. clear-api lower-cases and validates them and
 * refuses a duplicate list name.
 */
export function RecipientListsDrawer({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const t = useTranslations("brief.lists");
  const utils = api.useUtils();
  const lists = api.briefs.recipientLists.useQuery(undefined, { enabled: opened, refetchOnWindowFocus: false });
  const [name, setName] = useState("");
  const create = api.briefs.createRecipientList.useMutation({
    onSuccess: () => {
      setName("");
      void utils.briefs.recipientLists.invalidate();
    },
  });

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="md" title={t("title")}>
      <Stack gap={16} data-testid="recipient-lists">
        <Text size="sm" c="var(--color-text-secondary)">
          {t("intro")}
        </Text>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate({ name: name.trim() });
          }}
        >
          <Group gap={8} align="flex-start" wrap="nowrap">
            <TextInput
              style={{ flex: 1 }}
              size="xs"
              value={name}
              onChange={(e) => {
                setName(e.currentTarget.value);
                create.reset();
              }}
              placeholder={t("newName")}
              aria-label={t("newName")}
              error={create.error?.message}
              data-testid="recipient-list-name"
            />
            <Button size="xs" type="submit" loading={create.isPending} disabled={!name.trim()} leftSection={<IconPlus size={12} />}>
              {t("create")}
            </Button>
          </Group>
        </form>

        {lists.isLoading ? (
          <Text size="sm" c="var(--color-text-muted)">
            {t("loading")}
          </Text>
        ) : lists.error ? (
          <Text size="sm" c="var(--color-critical)">
            {t("loadError")}
          </Text>
        ) : (lists.data ?? []).length === 0 ? (
          <Text size="sm" c="var(--color-text-muted)">
            {t("empty")}
          </Text>
        ) : (
          (lists.data ?? []).map((list) => <ListCard key={list.id} list={list} />)
        )}
      </Stack>
    </Drawer>
  );
}

function ListCard({ list }: { list: RecipientList }) {
  const t = useTranslations("brief.lists");
  const utils = api.useUtils();
  const [email, setEmail] = useState("");
  const add = api.briefs.addRecipientListMember.useMutation({
    onSuccess: () => {
      setEmail("");
      void utils.briefs.recipientLists.invalidate();
    },
  });
  const remove = api.briefs.removeRecipientListMember.useMutation({
    onSuccess: () => utils.briefs.recipientLists.invalidate(),
    onError: (err) => notifications.show({ color: "red", message: t("removeError", { message: err.message }) }),
  });

  return (
    <Card p={12} style={{ border: "1px solid var(--color-border)" }} data-testid="recipient-list" data-name={list.name}>
      <Stack gap={8}>
        <Group justify="space-between" gap={8}>
          <Text fw={600} size="sm" c="var(--color-text-primary)">
            {list.name}
          </Text>
          <Text size="xs" c="var(--color-text-muted)">
            {t("recipients", { count: list.recipientCount })}
          </Text>
        </Group>
        {list.members.map((m) => (
          <Group key={m.id} justify="space-between" gap={8} wrap="nowrap">
            <Box style={{ minWidth: 0 }}>
              <Text size="sm" c="var(--color-text-secondary)" truncate>
                {m.email}
              </Text>
            </Box>
            <Group gap={4} wrap="nowrap">
              {m.unsubscribedAt && (
                <Badge size="xs" variant="light" style={{ background: "var(--color-bg-muted)", color: "var(--color-text-muted)" }}>
                  {t("unsubscribed")}
                </Badge>
              )}
              <Tooltip label={t("remove")}>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  aria-label={t("removeLabel", { email: m.email })}
                  loading={remove.isPending && remove.variables?.memberId === m.id}
                  onClick={() => remove.mutate({ memberId: m.id })}
                >
                  <IconX size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) add.mutate({ listId: list.id, email: email.trim() });
          }}
        >
          <Group gap={8} align="flex-start" wrap="nowrap">
            <TextInput
              style={{ flex: 1 }}
              size="xs"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.currentTarget.value);
                add.reset();
              }}
              placeholder={t("addEmail")}
              aria-label={t("addEmailLabel", { list: list.name })}
              error={add.error?.message}
              data-testid="recipient-list-email"
            />
            <Button size="xs" variant="default" type="submit" loading={add.isPending} disabled={!email.trim()}>
              {t("add")}
            </Button>
          </Group>
        </form>
      </Stack>
    </Card>
  );
}
