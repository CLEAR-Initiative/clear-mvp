"use client";

import { Group, Text, Tooltip } from "@mantine/core";
import { useTranslations } from "next-intl";
import type { SaSource } from "~/server/api/mappers/situation-analysis";

/**
 * Component-level source attribution: the reports a whole component (the AI
 * summary, a context-risk domain, a sector) drew on.
 *
 * NOT per-fact citation - the pipeline attributes at the component level today
 * (coarse model; see the pipeline's rag_helper). So this renders one row of
 * numbered chips per component, each resolving to a report in the Sources tab,
 * rather than a superscript next to every number. Per-fact superscripts arrive
 * with the pipeline's per-bullet citation work.
 */
export function Citations({
  refs,
  sources,
  onOpen,
}: {
  refs: number[];
  sources: SaSource[];
  onOpen?: () => void;
}) {
  const t = useTranslations("insights.situation");
  if (refs.length === 0) return null;

  return (
    <Group gap={6} align="center" mt={8} wrap="wrap">
      <Text c="var(--color-text-muted)" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
        {t("citations.label")}
      </Text>
      {refs.map((n) => {
        const src = sources[n - 1];
        const label = src?.title ?? t("citations.report", { n });
        return (
          <Tooltip key={n} label={label} withArrow multiline w={260} openDelay={200}>
            <Text
              component={onOpen ? "button" : "span"}
              onClick={onOpen}
              aria-label={label}
              style={{
                fontFamily: "var(--mantine-font-family-monospace, monospace)",
                fontSize: 10.5,
                fontWeight: 700,
                color: "var(--color-info)",
                background: "var(--color-info-light)",
                border: 0,
                borderRadius: 4,
                padding: "1px 6px",
                cursor: onOpen ? "pointer" : "help",
              }}
            >
              {n}
            </Text>
          </Tooltip>
        );
      })}
    </Group>
  );
}
