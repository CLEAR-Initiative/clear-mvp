"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Anchor, Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { api } from "~/trpc/react";
import type { BriefSendResult } from "~/lib/brief/types";

/**
 * Send a draft Brief to a Recipient list: choose the list, confirm against
 * its name and recipient count, then see what the provider accepted.
 * clear-api freezes the Brief and sends every email; a partial failure is
 * reported, never retried.
 */
export function SendBriefModal({
  briefId,
  opened,
  onClose,
  beforeSend,
}: {
  briefId: string;
  opened: boolean;
  onClose: () => void;
  /** Saves anything still being typed, so the email carries it; false when an edit couldn't be saved. */
  beforeSend: () => Promise<boolean>;
}) {
  const t = useTranslations("brief.send");
  const utils = api.useUtils();
  const lists = api.briefs.recipientLists.useQuery(undefined, { enabled: opened, refetchOnWindowFocus: false });
  const [listId, setListId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<BriefSendResult | null>(null);
  const send = api.briefs.send.useMutation({
    onSuccess: (sent) => {
      setResult(sent);
      void utils.briefs.get.invalidate({ id: briefId });
      void utils.briefs.list.invalidate();
    },
  });
  const list = lists.data?.find((l) => l.id === listId);
  const sendable = (lists.data ?? []).filter((l) => l.recipientCount > 0);

  const close = () => {
    setConfirming(false);
    setResult(null);
    setListId(null);
    send.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={close} title={t("title")} centered>
      <Stack gap={12} data-testid="brief-send-modal">
        {result ? (
          <>
            <Text size="sm" c="var(--color-text-primary)" data-testid="brief-send-result">
              {t("result", { sent: result.sent, failed: result.failed })}
            </Text>
            {result.failed > 0 && (
              <Text size="sm" c="var(--color-warning)">
                {t("partial")}
              </Text>
            )}
            <Group justify="flex-end">
              <Button onClick={close}>{t("done")}</Button>
            </Group>
          </>
        ) : confirming && list ? (
          <>
            <Text size="sm" c="var(--color-text-primary)" data-testid="brief-send-confirm">
              {t("confirm", { list: list.name, count: list.recipientCount })}
            </Text>
            <Text size="xs" c="var(--color-text-muted)">
              {t("freezes")}
            </Text>
            {send.error && (
              <Text size="sm" c="var(--color-critical)">
                {t("error", { message: send.error.message })}
              </Text>
            )}
            <Group justify="flex-end" gap={8}>
              <Button variant="default" onClick={() => setConfirming(false)} disabled={send.isPending}>
                {t("back")}
              </Button>
              <Button
                loading={send.isPending}
                onClick={async () => {
                  if (!(await beforeSend())) return;
                  send.mutate({ id: briefId, recipientListId: list.id });
                }}
                data-testid="brief-send-submit"
              >
                {t("send")}
              </Button>
            </Group>
          </>
        ) : (
          <>
            <Select
              label={t("list")}
              placeholder={t("listPlaceholder")}
              data={sendable.map((l) => ({ value: l.id, label: t("listOption", { name: l.name, count: l.recipientCount }) }))}
              value={listId}
              onChange={setListId}
              disabled={lists.isLoading}
              nothingFoundMessage={t("noLists")}
              data-testid="brief-send-list"
            />
            {!lists.isLoading && sendable.length === 0 && (
              <Text size="sm" c="var(--color-text-muted)">
                {t("noLists")}
              </Text>
            )}
            <Anchor component={Link} href="/brief?lists=1" size="xs">
              {t("manageLists")}
            </Anchor>
            <Group justify="flex-end" gap={8}>
              <Button variant="default" onClick={close}>
                {t("cancel")}
              </Button>
              <Button disabled={!list} onClick={() => setConfirming(true)} data-testid="brief-send-next">
                {t("next")}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
