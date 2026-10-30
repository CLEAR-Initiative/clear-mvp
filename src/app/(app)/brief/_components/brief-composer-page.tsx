"use client";

import { useCallback, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { Box, Button, Center, Grid, Group, Loader, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMailForward, IconSend } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui";
import { api } from "~/trpc/react";
import type { Brief } from "~/lib/brief/types";
import { useBriefItems } from "../_hooks/use-brief-items";
import { useBriefAutosave } from "../_hooks/use-brief-autosave";
import { useSaveTracker, type SaveStatus } from "../_hooks/use-save-tracker";
import { BriefStatusBadge } from "./brief-status-badge";
import { BriefComposer } from "./brief-composer";
import { BriefPicker } from "./brief-picker";
import { EventDetailDrawer } from "~/components/event-detail";
import type { PreviewTarget } from "../_lib/preview-target";
import { SendBriefModal } from "./send-brief-modal";

const NO_RETRY = new Set(["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED", "NOT_FOUND"]);

/** /brief/[id]: loads the Brief and lays out the composer and the History list. */
export function BriefComposerPage({ briefId }: { briefId: string }) {
  const t = useTranslations("brief");
  const query = api.briefs.get.useQuery(
    { id: briefId },
    {
      refetchOnWindowFocus: false,
      retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
    },
  );

  if (query.isLoading) {
    return (
      <Center py={80}>
        <Loader size="sm" />
      </Center>
    );
  }
  if (query.error || !query.data) {
    return (
      <Box>
        <PageHeader title={t("page.title")} breadcrumbs={["CLEAR", t("page.breadcrumb")]} />
        <Stack p={24} gap={8} align="flex-start">
          <Text c="var(--color-text-primary)">{query.error ? t("composer.loadError") : t("composer.notFound")}</Text>
          <Button component={Link} href="/brief" variant="default" size="xs">
            {t("composer.back")}
          </Button>
        </Stack>
      </Box>
    );
  }
  return <Composer brief={query.data} />;
}

function Composer({ brief }: { brief: Brief }) {
  const t = useTranslations("brief");
  const { status: saveStatus, track, settled } = useSaveTracker();
  const items = useBriefItems(brief, { track });
  const { text, setField, flush } = useBriefAutosave(brief, track);
  const [sending, setSending] = useState(false);
  // Whatever is still being typed goes into the email.
  const saveAll = useCallback(async () => {
    flush();
    await settled();
  }, [flush, settled]);
  const editable = brief.status === "draft";
  // Events open in the drawer so the Brief stays on screen; Signals have no
  // drawer and open their page in a new tab.
  const [previewEventId, setPreviewEventId] = useState<string | null>(null);
  const onPreview = useCallback((target: PreviewTarget) => {
    if (target.kind === "event") setPreviewEventId(target.eventId);
    else window.open(`/signal/${encodeURIComponent(target.signalId)}`, "_blank", "noopener");
  }, []);
  const sendTest = api.briefs.sendTest.useMutation({
    onSuccess: (accepted) =>
      notifications.show(
        accepted
          ? { color: "green", message: t("send.testSent") }
          : { color: "red", message: t("send.testRefused") },
      ),
    onError: (err) => notifications.show({ color: "red", message: t("send.testError", { message: err.message }) }),
  });

  return (
    <Box>
      <PageHeader title={text.title.trim() || brief.title} breadcrumbs={["CLEAR", t("page.breadcrumb")]}>
        <BriefStatusBadge status={brief.status} />
        {editable && <SaveIndicator status={saveStatus} />}
        <Button
          size="xs"
          variant="default"
          leftSection={<IconMailForward size={14} />}
          loading={sendTest.isPending}
          onClick={() => void saveAll().then(() => sendTest.mutate({ id: brief.id }))}
          data-testid="brief-send-test"
        >
          {t("send.test")}
        </Button>
        {editable && (
          <Button size="xs" leftSection={<IconSend size={14} />} onClick={() => setSending(true)} data-testid="brief-send">
            {t("send.open")}
          </Button>
        )}
      </PageHeader>
      {brief.status === "sent" && <SentNotice brief={brief} />}
      <Grid p={{ base: 16, sm: 24 }} gutter={24}>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <BriefComposer
            brief={brief}
            items={items}
            text={text}
            onTextChange={setField}
            track={track}
            onPreview={onPreview}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <BriefPicker brief={brief} items={items} onPreview={onPreview} />
        </Grid.Col>
      </Grid>
      <SendBriefModal briefId={brief.id} opened={sending} onClose={() => setSending(false)} beforeSend={saveAll} />
      <EventDetailDrawer eventId={previewEventId} opened={previewEventId !== null} onClose={() => setPreviewEventId(null)} />
    </Box>
  );
}

/** "Saving…", "Saved" or "Not saved" for the composer's writes. */
function SaveIndicator({ status }: { status: SaveStatus }) {
  const t = useTranslations("brief");
  if (status === "idle") return null;
  const tone = status === "error" ? "var(--color-critical)" : "var(--color-text-muted)";
  return (
    <Group gap={6} data-testid="brief-save-status" data-status={status}>
      {status === "saving" && <Loader size={10} color="gray" />}
      <Text size="xs" c={tone}>
        {t(`save.${status}`)}
      </Text>
    </Group>
  );
}

/** A sent Brief: when, to which list, and what the provider accepted. Read-only from here on. */
function SentNotice({ brief }: { brief: Brief }) {
  const t = useTranslations("brief.send");
  const format = useFormatter();
  const lists = api.briefs.recipientLists.useQuery(undefined, { refetchOnWindowFocus: false, staleTime: 60_000 });
  const listName = lists.data?.find((l) => l.id === brief.sentToListId)?.name ?? t("unknownList");
  return (
    <Box
      mx={{ base: 16, sm: 24 }}
      mt={16}
      p={12}
      style={{ background: "var(--color-success-light)", borderInlineStart: "3px solid var(--color-success)", borderRadius: 4 }}
      data-testid="brief-sent-notice"
    >
      <Text size="sm" c="var(--color-text-primary)">
        {t("sentNotice", {
          date: brief.sentAt ? format.dateTime(new Date(brief.sentAt), { dateStyle: "medium", timeStyle: "short" }) : "-",
          list: listName,
          sent: brief.sentCount ?? 0,
          failed: brief.failedCount ?? 0,
        })}
      </Text>
      <Text size="xs" c="var(--color-text-secondary)">
        {t("frozen")}
      </Text>
    </Box>
  );
}
