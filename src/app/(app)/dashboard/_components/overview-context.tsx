"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Anchor,
  Box,
  Group,
  List,
  Modal,
  Select,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useLocations } from "~/hooks/use-locations";

function riskScoreColor(score: number): string {
  if (score >= 7) return "#DC2626";
  if (score >= 5) return "#F59E0B";
  return "#059669";
}

interface OverviewSituationChipsProps {
  escalatingCount: number;
  draftCount: number;
}

/** Escalating / Drafts chips — placed above the Operational Globe on desktop. */
export function OverviewSituationChips({
  escalatingCount,
  draftCount,
}: OverviewSituationChipsProps) {
  const t = useTranslations("dashboard");

  return (
    <Group gap={6} wrap="wrap" data-overview-situation-chips="">
      <Box
        component={Link}
        href="/detection?tab=events"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: 9999,
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        <Box
          style={{
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: "#EF4444",
            flexShrink: 0,
          }}
          className="animate-pulse"
        />
        <Text fw={700} style={{ fontSize: 11, color: "#EF4444" }}>
          {t("situationStrip.escalatingChip", { count: escalatingCount })}
        </Text>
      </Box>
      <Box
        component={Link}
        href="/detection?tab=live&status=draft"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 8px",
          borderRadius: 9999,
          background: "var(--color-bg-muted)",
          border: "1px solid var(--color-border)",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        <Text fw={700} c="var(--color-text-secondary)" style={{ fontSize: 11 }}>
          {t("situationStrip.draftsChip", { count: draftCount })}
        </Text>
      </Box>
    </Group>
  );
}

interface OverviewContextProps {
  selectedCountry: string;
  onCountryChange: (country: string) => void;
}

/**
 * Selected Context + compact INFORM scores.
 * Lives below the Operational Globe on desktop (right rail).
 */
export function OverviewContext({
  selectedCountry,
  onCountryChange,
}: OverviewContextProps) {
  const t = useTranslations("dashboard");
  const { countries } = useLocations();
  const [informInfoOpened, { open: openInformInfo, close: closeInformInfo }] = useDisclosure(false);

  const riskQuery = api.inform.getRisk.useQuery(
    { country: selectedCountry },
    { retry: false, staleTime: 86400_000 },
  );

  const pillars = [
    { short: "H", score: riskQuery.data?.pillars.hazard ?? null },
    { short: "V", score: riskQuery.data?.pillars.vulnerability ?? null },
    { short: "C", score: riskQuery.data?.pillars.coping ?? null },
  ];

  return (
    <Box data-overview-context="" w="100%" pb={4}>
      <Text
        fw={700}
        tt="uppercase"
        c="var(--color-text-muted)"
        mb={8}
        style={{ fontSize: 10, letterSpacing: "0.06em" }}
      >
        {t("situationStrip.selectedContext")}
      </Text>

      <Select
        value={selectedCountry}
        onChange={(v) => v && onCountryChange(v)}
        data={countries.length > 0 ? countries : [selectedCountry]}
        allowDeselect={false}
        searchable
        w="100%"
        size="sm"
        mb={10}
        styles={{
          root: { width: "100%" },
          wrapper: { width: "100%" },
          input: {
            fontWeight: 700,
            fontSize: 14,
            background: "var(--color-bg-white)",
            borderColor: "var(--color-border)",
          },
        }}
      />

      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          width: "100%",
          alignItems: "end",
        }}
      >
        {pillars.map((pillar) => (
          <Box key={pillar.short} style={{ minWidth: 0 }}>
            <Text
              fw={700}
              tt="uppercase"
              c="var(--color-text-muted)"
              style={{ fontSize: 9, letterSpacing: "0.05em" }}
            >
              {pillar.short}
            </Text>
            <Text
              fw={700}
              style={{
                fontSize: 18,
                lineHeight: "22px",
                color: pillar.score != null ? riskScoreColor(pillar.score) : "var(--color-text-muted)",
              }}
            >
              {pillar.score != null ? pillar.score.toFixed(1) : "—"}
            </Text>
          </Box>
        ))}
        <Box
          pl={10}
          style={{
            borderLeft: "1px solid var(--color-border)",
            minWidth: 0,
          }}
        >
          <Group gap={4} align="center" wrap="nowrap">
            <Text
              fw={700}
              tt="uppercase"
              c="var(--color-text-muted)"
              style={{ fontSize: 9, letterSpacing: "0.05em" }}
            >
              INFORM
            </Text>
            <Box
              component="button"
              type="button"
              onClick={openInformInfo}
              aria-label={t("rightPanel.informModal.title")}
              style={{
                cursor: "pointer",
                color: "var(--color-text-muted)",
                display: "flex",
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              <IconInfoCircle size={11} />
            </Box>
          </Group>
          <Group gap={4} align="baseline" wrap="nowrap">
            <Text
              fw={700}
              style={{
                fontSize: 20,
                lineHeight: "24px",
                color:
                  riskQuery.data?.score != null
                    ? riskScoreColor(riskQuery.data.score)
                    : "var(--color-text-muted)",
              }}
            >
              {riskQuery.data?.score?.toFixed(1) ?? "—"}
            </Text>
            <Text c="var(--color-text-muted)" style={{ fontSize: 10 }}>
              / 10
            </Text>
          </Group>
        </Box>
      </Box>

      <Modal
        opened={informInfoOpened}
        onClose={closeInformInfo}
        title={t("rightPanel.informModal.title")}
        size="md"
        styles={{
          title: { fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" },
          body: { paddingTop: 4 },
        }}
      >
        <Text style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12, lineHeight: 1.6 }}>
          {t.rich("rightPanel.informModal.intro", { strong: (chunks) => <strong>{chunks}</strong> })}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
          {t("rightPanel.informModal.pillarsHeading")}
        </Text>
        <List spacing={4} mb={14} styles={{ item: { fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 } }}>
          <List.Item>{t.rich("rightPanel.informModal.pillarHazard", { strong: (chunks) => <strong>{chunks}</strong> })}</List.Item>
          <List.Item>{t.rich("rightPanel.informModal.pillarVulnerability", { strong: (chunks) => <strong>{chunks}</strong> })}</List.Item>
          <List.Item>{t.rich("rightPanel.informModal.pillarCoping", { strong: (chunks) => <strong>{chunks}</strong> })}</List.Item>
        </List>
        <Text style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          {t("rightPanel.informModal.sourceLabel")}{" "}
          <Anchor href="https://drmkc.jrc.ec.europa.eu/inform-index" target="_blank" rel="noopener noreferrer" size="xs">
            {t("rightPanel.informModal.sourceLink")}
          </Anchor>{" "}
          {t("rightPanel.informModal.updatedAnnually")}
        </Text>
      </Modal>
    </Box>
  );
}
