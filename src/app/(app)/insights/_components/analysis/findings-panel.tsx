"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowBarRight,
  IconClock,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import type { SaBullet, SaSource } from "~/server/api/mappers/situation-analysis";
import type { Analysis } from "~/server/api/mappers/analysis";
import { BulletRow } from "../situation/bullet-row";
import { Citations } from "../situation/citations";
import { CollapsibleSection } from "./collapsible-section";

const COLLAPSED = 3;

function BulletList({
  items,
  sources,
  onOpenSources,
  color,
}: {
  items: SaBullet[];
  sources: SaSource[];
  onOpenSources?: () => void;
  color?: string;
}) {
  const t = useTranslations("analysis.findings");
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, COLLAPSED);
  return (
    <Box>
      {shown.map((b, i) => (
        <BulletRow key={i} color={color} last={i === shown.length - 1}>
          {b.text}
          {b.refs.length > 0 && (
            <>
              {" "}
              <Citations refs={b.refs} sources={sources} onOpen={onOpenSources} variant="inline" />
            </>
          )}
        </BulletRow>
      ))}
      {items.length > COLLAPSED && (
        <UnstyledButton mt={10} onClick={() => setExpanded((v) => !v)}>
          <Group gap={4}>
            <Text fw={600} c="var(--color-accent)" style={{ fontSize: 13 }}>
              {expanded ? t("showLess") : t("showAll", { count: items.length })}
            </Text>
            {expanded ? (
              <IconChevronUp size={14} color="var(--color-accent)" />
            ) : (
              <IconChevronDown size={14} color="var(--color-accent)" />
            )}
          </Group>
        </UnstyledButton>
      )}
    </Box>
  );
}

function Block({ title, tag, children }: { title: string; tag?: string; children: ReactNode }) {
  return (
    <Box>
      <Group gap={8} mb={8}>
        <Text fw={700} tt="uppercase" c="var(--color-text-secondary)" style={{ fontSize: 11, letterSpacing: "0.08em" }}>
          {title}
        </Text>
        {tag && (
          <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
            {tag}
          </Text>
        )}
      </Group>
      {children}
    </Box>
  );
}

type SectionProps = { data: Analysis; onOpenSources?: () => void };

/** Current hazards and pre-crisis vulnerabilities. */
export function HazardsSection({ data, onOpenSources }: SectionProps) {
  const t = useTranslations("analysis.findings");
  const { hazards, vulnerabilities } = data.hazards;
  if (hazards.length === 0 && vulnerabilities.length === 0) return null;
  return (
    <CollapsibleSection
      icon={IconAlertTriangle}
      tone="critical"
      title={t("hazardsTitle")}
      meta={t("hazardsMeta", { hazards: hazards.length, vulnerabilities: vulnerabilities.length })}
      testId="analysis-section-hazards"
    >
      <Stack gap={20} p={20}>
        {hazards.length > 0 && (
          <Block title={t("hazards")}>
            <BulletList items={hazards} sources={data.sources} onOpenSources={onOpenSources} color="var(--color-critical)" />
          </Block>
        )}
        {vulnerabilities.length > 0 && (
          <Block title={t("vulnerabilities")} tag={t("vulnerabilitiesTag")}>
            <BulletList items={vulnerabilities} sources={data.sources} onOpenSources={onOpenSources} color="var(--color-warning)" />
          </Block>
        )}
      </Stack>
    </CollapsibleSection>
  );
}

/** Push factors and return intentions. */
export function DisplacementSection({ data, onOpenSources }: SectionProps) {
  const t = useTranslations("analysis.findings");
  const { push, return: ret } = data.displacement;
  if (push.length === 0 && ret.length === 0) return null;
  return (
    <CollapsibleSection
      icon={IconArrowBarRight}
      tone="info"
      title={t("displacement")}
      tag={t("displacementTag")}
      meta={t("count", { count: push.length + ret.length })}
      testId="analysis-section-displacement"
    >
      <Stack gap={20} p={20}>
        {push.length > 0 && (
          <Block title={t("push")}>
            <BulletList items={push} sources={data.sources} onOpenSources={onOpenSources} color="var(--color-info)" />
          </Block>
        )}
        {ret.length > 0 && (
          <Block title={t("return")}>
            <BulletList items={ret} sources={data.sources} onOpenSources={onOpenSources} color="var(--color-info)" />
          </Block>
        )}
      </Stack>
    </CollapsibleSection>
  );
}

/** Scenarios: projections, kept apart from observed facts. */
export function ForecastSection({ data, onOpenSources }: SectionProps) {
  const t = useTranslations("analysis.findings");
  const s = data.scenarios;
  if (!s) return null;
  const cases = (
    [
      ["mostLikely", s.mostLikely],
      ["bestCase", s.bestCase],
      ["worstCase", s.worstCase],
    ] as const
  ).filter(([, text]) => text);
  return (
    <CollapsibleSection
      icon={IconClock}
      tone="ai"
      title={t("forecast")}
      tag={t("forecastTag")}
      meta={t("forecastNote")}
      testId="analysis-section-forecast"
    >
      <Stack gap={16} p={20} style={{ background: "var(--color-ai-light)" }}>
        {s.description && (
          <Text c="var(--color-text-primary)" style={{ fontSize: 13, lineHeight: 1.6 }}>
            {s.description}
          </Text>
        )}
        {cases.map(([key, text]) => (
          <Block key={key} title={t(key)}>
            <Text c="var(--color-text-primary)" style={{ fontSize: 13, lineHeight: 1.6 }}>
              {text}
            </Text>
          </Block>
        ))}
        {s.refs.length > 0 && <Citations refs={s.refs} sources={data.sources} onOpen={onOpenSources} />}
      </Stack>
    </CollapsibleSection>
  );
}
