"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Anchor, Box, Card, Title } from "@mantine/core";
import { useTranslations } from "next-intl";
import { UsageNoticeBody } from "~/components/analytics/usage-notice";
import { track } from "~/lib/analytics/track";

export default function UsageAnalyticsNoticePage() {
  const t = useTranslations("usageAnalytics");
  useEffect(() => {
    track("privacy_notice.viewed", { from: "profile" });
  }, []);

  return (
    <Box p={{ base: 16, sm: 32 }} maw={760}>
      <Anchor component={Link} href="/profile" size="sm">
        {t("profile.backToProfile")}
      </Anchor>
      <Title order={2} mt={12} mb={16}>
        {t("notice.title")}
      </Title>
      <Card p="lg" style={{ border: "1px solid var(--color-border)" }}>
        <UsageNoticeBody />
      </Card>
    </Box>
  );
}
