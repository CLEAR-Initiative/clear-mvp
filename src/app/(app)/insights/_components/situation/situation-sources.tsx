"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Anchor, Box, Group, Text } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";
import type { SaSource } from "~/server/api/mappers/situation-analysis";

/**
 * Situation Analysis -> Sources: a numbered references list.
 *
 * Rendered as a bibliography rather than a card grid: the analysis can draw on
 * dozens of reports, and a reference list scans far better at that volume. The
 * number on each entry is the SAME citation index used by the in-text `[n]`
 * chips elsewhere (the mapper builds one index off this ordered list), so a
 * reader following a citation lands on the matching reference.
 */
export function SituationSources({ sources }: { sources: SaSource[] }) {
  const t = useTranslations("insights.situation");
  const format = useFormatter();

  if (sources.length === 0) {
    return (
      <Text c="var(--color-text-muted)" style={{ fontSize: 13 }}>
        {t("sources.empty")}
      </Text>
    );
  }

  return (
    <Box>
      <Text
        c="var(--color-text-muted)"
        fw={700}
        tt="uppercase"
        mb={12}
        style={{ fontSize: 11, letterSpacing: "0.06em" }}
      >
        {t("sources.count", { count: sources.length })}
      </Text>

      <Box
        component="ol"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          border: "1px solid var(--color-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {sources.map((s, i) => (
          <Reference
            key={s.id}
            n={i + 1}
            source={s}
            first={i === 0}
            publishedLabel={
              s.publishedAt
                ? format.dateTime(new Date(s.publishedAt), {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : null
            }
            visitLabel={t("sources.visit")}
          />
        ))}
      </Box>
    </Box>
  );
}

function Reference({
  n,
  source,
  first,
  publishedLabel,
  visitLabel,
}: {
  n: number;
  source: SaSource;
  first: boolean;
  publishedLabel: string | null;
  visitLabel: string;
}) {
  const publisher = publisherFromUrl(source.url);

  return (
    <Box
      component="li"
      style={{
        display: "flex",
        gap: 12,
        padding: "11px 16px",
        borderTop: first ? undefined : "1px solid var(--color-border)",
      }}
    >
      <Text
        aria-hidden
        style={{
          fontFamily: "var(--mantine-font-family-monospace, monospace)",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--color-text-muted)",
          minWidth: 28,
          textAlign: "right",
          lineHeight: 1.5,
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {n}.
      </Text>

      <Box style={{ flex: 1, minWidth: 0 }}>
        {source.url ? (
          <Anchor
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            c="var(--color-text-primary)"
            fw={600}
            style={{ fontSize: 13.5, lineHeight: 1.4 }}
          >
            {source.title}
          </Anchor>
        ) : (
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13.5, lineHeight: 1.4 }}>
            {source.title}
          </Text>
        )}

        <Group gap={7} mt={3} align="center" wrap="wrap">
          {publisher && (
            <Text c="var(--color-text-secondary)" style={{ fontSize: 11.5 }}>
              {publisher}
            </Text>
          )}
          {publisher && publishedLabel && (
            <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
              &middot;
            </Text>
          )}
          {publishedLabel && (
            <Text c="var(--color-text-secondary)" style={{ fontSize: 11.5 }}>
              {publishedLabel}
            </Text>
          )}
          {source.url && (
            <>
              <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                &middot;
              </Text>
              <Anchor
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                c="var(--color-accent)"
                style={{ fontSize: 11.5 }}
              >
                <Group gap={3} align="center" wrap="nowrap" component="span">
                  <IconArrowUpRight size={12} />
                  <Box component="span">{visitLabel}</Box>
                </Group>
              </Anchor>
            </>
          )}
        </Group>
      </Box>
    </Box>
  );
}

/** Bare host as a publisher proxy (e.g. "reliefweb.int"). The pipeline carries
 *  no explicit publisher field, so this is derived from the source URL. */
function publisherFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
