"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Group, Text, UnstyledButton } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { SituationAnalysis } from "~/server/api/mappers/situation-analysis";
import { leadSentences, planSentenceSegments, planSummaryParagraphs } from "./summary-citations";
import { Citations } from "./citations";

/** The AI summary with per-sentence citations, falling back to block-level ones. */
export function AiSummaryCard({
  data,
  onOpenSources,
  previewSentences,
}: {
  data: Pick<SituationAnalysis, "summary" | "summaryRefs" | "summaryLineRefs" | "sources">;
  onOpenSources?: () => void;
  /** Show only this many lead sentences until the reader expands. */
  previewSentences?: number;
}) {
  const t = useTranslations("insights.situation");
  const [expanded, setExpanded] = useState(false);
  const { sources } = data;
  if (!data.summary) return null;
  const preview = previewSentences ? leadSentences(data.summary, previewSentences) : null;
  const collapsed = !!preview?.truncated && !expanded;
  const summary = collapsed ? preview.lead : data.summary;
  const hasPerSentenceCitations = Object.keys(data.summaryLineRefs).length > 0;

  return (
    <Card
      p={16}
      style={{
        border: "1px solid var(--color-ai-border)",
        background: "var(--color-ai-light)",
      }}
    >
      <Group gap={8} mb={8} align="center">
        <IconSparkles size={14} color="var(--color-ai)" />
        <Text
          fw={700}
          tt="uppercase"
          c="var(--color-ai)"
          style={{ fontSize: 11, letterSpacing: "0.5px" }}
        >
          {t("summary.title")}
        </Text>
      </Group>
      {planSummaryParagraphs(summary, data.summaryLineRefs).map((para, i, arr) => {
        const segments = planSentenceSegments(para, data.summaryLineRefs);
        return (
          <Text
            key={i}
            c="var(--color-text-primary)"
            mb={i === arr.length - 1 ? 0 : 12}
            style={{ fontSize: 13, lineHeight: 1.65 }}
          >
            {segments
              ? segments.map((seg, j) =>
                  seg.kind === "text" ? (
                    seg.text
                  ) : (
                    <Citations
                      key={j}
                      refs={seg.refs}
                      sources={sources}
                      onOpen={onOpenSources}
                      variant="inline"
                    />
                  ),
                )
              : para.trim()}
            {/* Block-level fallback only when no sentence in the whole
                summary carried its own citation - otherwise the trailing
                list duplicates what is now shown inline. */}
            {i === arr.length - 1 && !collapsed && !hasPerSentenceCitations && (
              <Citations
                refs={data.summaryRefs}
                sources={sources}
                onOpen={onOpenSources}
                variant="inline"
              />
            )}
          </Text>
        );
      })}
      {preview?.truncated && (
        <UnstyledButton mt={10} onClick={() => setExpanded((v) => !v)} data-testid="summary-toggle">
          <Text fw={600} c="var(--color-ai)" style={{ fontSize: 12 }}>
            {expanded ? t("summary.showLess") : t("summary.readMore")}
          </Text>
        </UnstyledButton>
      )}
    </Card>
  );
}
