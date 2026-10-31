"use client";

import { useTranslations } from "next-intl";
import { List, Text } from "@mantine/core";
import { CardSection } from "~/components/ui";

/** How location precision is measured, in plain language (clear-api ADR-0012). */
export function PrecisionMethodNote() {
  const t = useTranslations("metrics.precision.method");
  const items = ["counted", "level", "week", "correctness", "definition"] as const;

  return (
    <CardSection title={t("title")}>
      <Text size="sm" c="var(--color-text-secondary)" mb={8}>
        {t("intro")}
      </Text>
      <List size="sm" spacing={6} listStyleType="disc" c="var(--color-text-secondary)">
        {items.map((key) => (
          <List.Item key={key}>{t(`points.${key}`)}</List.Item>
        ))}
      </List>
    </CardSection>
  );
}
