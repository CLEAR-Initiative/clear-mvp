"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ActionIcon, Button, Group, Popover, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMailForward, IconSettings } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { Brief } from "~/lib/brief/types";
import { normaliseTestRecipient, readTestRecipient, writeTestRecipient } from "~/lib/brief/test-recipient";

/**
 * "Send test": emails the Brief to the admin, or to the address they set
 * with the gear beside it. That address is kept in this browser only, per
 * user (see ~/lib/brief/test-recipient).
 */
export function BriefTestButton({
  briefId,
  beforeSend,
}: {
  briefId: string;
  beforeSend: () => Promise<Brief | null>;
}) {
  const t = useTranslations("brief.send");
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const userId = me.data?.authenticated ? (me.data.user?.id ?? null) : null;
  const [recipient, setRecipient] = useState<string | null>(null);
  // Read after mount: localStorage doesn't exist during the server render.
  useEffect(() => {
    setRecipient(userId ? readTestRecipient(userId) : null);
  }, [userId]);

  const sendTest = api.briefs.sendTest.useMutation({
    onSuccess: (accepted, vars) =>
      notifications.show(
        accepted
          ? { color: "green", message: vars.to ? t("testSentTo", { email: vars.to }) : t("testSent") }
          : { color: "red", message: t("testRefused") },
      ),
    onError: (err) => notifications.show({ color: "red", message: t("testError", { message: err.message }) }),
  });

  function save(email: string | null) {
    setRecipient(email);
    if (userId && !writeTestRecipient(userId, email)) {
      notifications.show({ color: "yellow", message: t("testRecipient.notStored") });
    }
  }

  return (
    <Group gap={4} wrap="nowrap">
      <Tooltip label={t("testRecipient.tooltip", { email: recipient ?? "" })} disabled={!recipient}>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconMailForward size={14} />}
          loading={sendTest.isPending}
          onClick={() =>
            void beforeSend().then(
              (saved) => saved && sendTest.mutate(recipient ? { id: briefId, to: recipient } : { id: briefId }),
            )
          }
          data-testid="brief-send-test"
          data-recipient={recipient ?? undefined}
        >
          {recipient ? t("testToAddress") : t("test")}
        </Button>
      </Tooltip>
      <TestRecipientPopover recipient={recipient} onSave={save} disabled={!userId} />
    </Group>
  );
}

function TestRecipientPopover({
  recipient,
  onSave,
  disabled,
}: {
  recipient: string | null;
  onSave: (email: string | null) => void;
  disabled: boolean;
}) {
  const t = useTranslations("brief.send.testRecipient");
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open() {
    setDraft(recipient ?? "");
    setError(null);
    setOpened(true);
  }

  function submit() {
    if (!draft.trim()) {
      onSave(null);
      setOpened(false);
      return;
    }
    const email = normaliseTestRecipient(draft);
    if (!email) {
      setError(t("invalid"));
      return;
    }
    onSave(email);
    setOpened(false);
  }

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" shadow="md" width={300} withinPortal trapFocus>
      <Popover.Target>
        <ActionIcon
          size="input-xs"
          variant="default"
          aria-label={t("open")}
          title={t("open")}
          disabled={disabled}
          onClick={() => (opened ? setOpened(false) : open())}
          data-testid="brief-test-recipient-open"
        >
          <IconSettings size={14} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Stack gap={8}>
            <TextInput
              size="xs"
              type="email"
              autoComplete="email"
              label={t("label")}
              placeholder={t("placeholder")}
              value={draft}
              onChange={(e) => {
                setDraft(e.currentTarget.value);
                setError(null);
              }}
              error={error}
              data-testid="brief-test-recipient-input"
            />
            <Text size="xs" c="var(--color-text-secondary)">
              {t("hint")}
            </Text>
            <Group justify="space-between" gap={8}>
              <Button
                size="xs"
                variant="subtle"
                disabled={!recipient}
                onClick={() => {
                  onSave(null);
                  setOpened(false);
                }}
                data-testid="brief-test-recipient-reset"
              >
                {t("reset")}
              </Button>
              <Button size="xs" type="submit" data-testid="brief-test-recipient-save">
                {t("save")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Popover.Dropdown>
    </Popover>
  );
}
