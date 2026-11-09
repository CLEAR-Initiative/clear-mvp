"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Anchor, Button, Group, List, Modal, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { isPlatformAdmin } from "~/lib/roles";
import { readUmamiConfig } from "~/lib/analytics/gating";
import { track } from "~/lib/analytics/track";

/** Fired by the product tour host when a user finishes onboarding for the first time. */
export const ONBOARDING_FINISHED_EVENT = "clear-onboarding-finished";

const SEEN_PREFIX = "clear-usage-notice-seen";

/** The privacy notice body: what, why, who sees it, retention. */
export function UsageNoticeBody() {
  const t = useTranslations("usageAnalytics.notice");
  return (
    <Stack gap={12}>
      <Text size="sm">{t("intro")}</Text>
      <div>
        <Text size="sm" fw={600}>{t("whatTitle")}</Text>
        <List size="sm" spacing={4}>
          <List.Item>{t("whatPages")}</List.Item>
          <List.Item>{t("whatActions")}</List.Item>
          <List.Item>{t("whatIdentity")}</List.Item>
        </List>
        <Text size="sm" mt={4}>{t("whatNot")}</Text>
      </div>
      <div>
        <Text size="sm" fw={600}>{t("whyTitle")}</Text>
        <Text size="sm">{t("why")}</Text>
      </div>
      <div>
        <Text size="sm" fw={600}>{t("whoTitle")}</Text>
        <Text size="sm">{t("who")}</Text>
      </div>
      <div>
        <Text size="sm" fw={600}>{t("retentionTitle")}</Text>
        <Text size="sm">{t("retention")}</Text>
      </div>
      <div>
        <Text size="sm" fw={600}>{t("optOutTitle")}</Text>
        <Text size="sm">{t("optOut")}</Text>
      </div>
    </Stack>
  );
}

/**
 * Shows the privacy notice once, right after a user first finishes
 * onboarding — only in builds where the tracker is configured, and never
 * for global admins (who are never tracked).
 */
export function UsageNoticeAfterOnboarding() {
  const t = useTranslations("usageAnalytics");
  const me = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const user = me.data?.authenticated ? me.data.user : null;
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!user || isPlatformAdmin(user.role) || !readUmamiConfig()) return;
    const key = `${SEEN_PREFIX}:${user.id}`;
    const onFinished = () => {
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, new Date().toISOString());
      } catch {
        // Storage blocked: still show it this once.
      }
      setOpened(true);
      track("privacy_notice.viewed", { from: "onboarding" });
    };
    window.addEventListener(ONBOARDING_FINISHED_EVENT, onFinished);
    return () => window.removeEventListener(ONBOARDING_FINISHED_EVENT, onFinished);
  }, [user]);

  return (
    <Modal opened={opened} onClose={() => setOpened(false)} title={t("notice.title")} size="lg">
      <UsageNoticeBody />
      <Group justify="space-between" mt={20}>
        <Anchor component={Link} href="/profile" size="sm" onClick={() => setOpened(false)}>
          {t("notice.manageInProfile")}
        </Anchor>
        <Button color="orange" onClick={() => setOpened(false)}>
          {t("notice.gotIt")}
        </Button>
      </Group>
    </Modal>
  );
}
