"use client";

import { Box, Group, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { SEVERITY_BUCKETS, SEVERITY_TOKENS } from "./severity-tokens";

export function SignalsLegend() {
  const t = useTranslations("common.severities");

  return (
    <Stack gap={4}>
      {SEVERITY_BUCKETS.map((bucket) => (
        <Group key={bucket} gap={8} wrap="nowrap">
          <Box
            w={10}
            h={10}
            style={{ borderRadius: "50%", background: `var(${SEVERITY_TOKENS[bucket]})` }}
          />
          <Text size="xs">{t(bucket)}</Text>
        </Group>
      ))}
    </Stack>
  );
}
