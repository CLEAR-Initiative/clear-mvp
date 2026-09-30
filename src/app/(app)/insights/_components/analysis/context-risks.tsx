"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Grid, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";
import type { SaContextRisk, SaSource } from "~/server/api/mappers/situation-analysis";
import { Citations } from "../situation/citations";
import { CollapsibleSection } from "./collapsible-section";

/** Contexts: categories on the left, the selected category's findings as cards on the right. */
export function ContextRisks({
  risks,
  sources,
  onOpenSources,
}: {
  risks: SaContextRisk[];
  sources: SaSource[];
  onOpenSources?: () => void;
}) {
  const t = useTranslations("analysis.contexts");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  if (risks.length === 0) return null;
  const selected = risks.find((r) => r.key === selectedKey) ?? risks[0]!;
  const hasLineRefs = Object.keys(selected.lineRefs).length > 0;
  const findings = risks.reduce((n, r) => n + r.items.length, 0);

  return (
    <CollapsibleSection
      icon={IconWorld}
      title={t("title")}
      meta={t("meta", { categories: risks.length, findings })}
      testId="analysis-section-contexts"
    >
      <Grid gutter={0}>
        <Grid.Col
          span={{ base: 12, md: 4 }}
          style={{ borderInlineEnd: "1px solid var(--color-border)", background: "var(--color-bg-muted)" }}
        >
          <Stack gap={0} role="tablist" aria-orientation="vertical">
            {risks.map((r) => {
              const active = r.key === selected.key;
              return (
                <UnstyledButton
                  key={r.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedKey(r.key)}
                  data-testid={`analysis-risk-${r.key}`}
                  px={16}
                  py={12}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--color-border)",
                    borderInlineStart: `3px solid ${active ? "var(--color-accent)" : "transparent"}`,
                    background: active ? "var(--color-bg-white)" : "transparent",
                  }}
                >
                  <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>
                    {r.label}
                  </Text>
                  <Text c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
                    {r.items.length}
                  </Text>
                </UnstyledButton>
              );
            })}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }} p={20} role="tabpanel">
          <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: 17 }}>
            {selected.label}
          </Text>
          <Text c="var(--color-text-secondary)" mb={14} style={{ fontSize: 12 }}>
            {t("findings", { count: selected.items.length })}
          </Text>
          <Grid gutter={12}>
            {selected.items.map((item, i) => {
              const refs = selected.lineRefs[item.trim()] ?? (hasLineRefs ? [] : selected.refs);
              return (
                <Grid.Col key={i} span={{ base: 12, lg: 6 }}>
                  <Box
                    p={14}
                    h="100%"
                    style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}
                  >
                    <Text c="var(--color-text-primary)" style={{ fontSize: 13, lineHeight: 1.55 }}>
                      {item}
                      {refs.length > 0 && (
                        <>
                          {" "}
                          <Citations refs={refs} sources={sources} onOpen={onOpenSources} variant="inline" />
                        </>
                      )}
                    </Text>
                  </Box>
                </Grid.Col>
              );
            })}
          </Grid>
        </Grid.Col>
      </Grid>
    </CollapsibleSection>
  );
}
