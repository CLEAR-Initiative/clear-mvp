"use client";

import Link from "next/link";
import { Anchor, Card, Group, Switch, Text } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useAnalyticsOptOut } from "~/components/analytics/usage-tracker";
import { isPlatformAdmin } from "~/lib/roles";

/**
 * Profile toggle for usage analytics. Off sets the account-wide opt-out
 * (clear-api `User.analyticsOptOut`), so it holds in every browser; the
 * tracker then isn't loaded at all. Global admins are never tracked, so they
 * see a note instead of the toggle.
 */
export function UsageAnalyticsSection({ role }: { role: string }) {
  const t = useTranslations("usageAnalytics.profile");
  const { optedOut, known, setOptedOut, saving } = useAnalyticsOptOut();
  const admin = isPlatformAdmin(role);

  return (
    <Card p={{ base: 12, sm: "lg" }} mb={16} mx={{ base: 8, sm: 0 }} style={{ border: "1px solid var(--color-border)" }}>
      <Group gap={8} mb={12}>
        <IconChartBar size={18} color="var(--color-accent)" />
        <Text fw={700} size="sm" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
          {t("title")}
        </Text>
      </Group>
      {admin ? (
        <Text size="sm" c="var(--color-text-muted)">{t("adminNote")}</Text>
      ) : (
        <Switch
          checked={!optedOut}
          onChange={(e) => setOptedOut(!e.currentTarget.checked)}
          disabled={!known || saving}
          label={t("toggleLabel")}
          description={t("toggleDescription")}
          color="orange"
        />
      )}
      <Anchor component={Link} href="/profile/usage-analytics" size="sm" mt={12} display="inline-block">
        {t("noticeLink")}
      </Anchor>
    </Card>
  );
}
