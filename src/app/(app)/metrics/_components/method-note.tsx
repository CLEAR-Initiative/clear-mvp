"use client";

import { useTranslations } from "next-intl";
import { List, Text } from "@mantine/core";
import { CardSection } from "~/components/ui";

/** How time to detection is measured, in plain language (clear-api ADR-0011). */
export function MethodNote() {
  const t = useTranslations("metrics.method");
  const items = ["counted", "excluded", "wholeDays", "definition"] as const;

  return (
    <CardSection title={t("title")}>
      <Text size="sm" c="var(--color-text-secondary)" mb={8}>
        {t("intro")}
      </Text>
      <List size="sm" spacing={6} c="var(--color-text-secondary)">
        {items.map((key) => (
          <List.Item key={key}>{t(`points.${key}`)}</List.Item>
        ))}
      </List>
    </CardSection>
  );
}
