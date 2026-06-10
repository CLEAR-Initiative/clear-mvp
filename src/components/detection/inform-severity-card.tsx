"use client";

import { Box, Text, Group, Skeleton, Modal, Anchor, List } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChartBar, IconInfoCircle, IconExternalLink } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

const INFORM_COLORS = {
  5: { accent: "#DC2626", badge: "#FEF2F2", badgeBorder: "#FECACA", badgeText: "#DC2626" },
  4: { accent: "#EA580C", badge: "#FFF7ED", badgeBorder: "#FED7AA", badgeText: "#EA580C" },
  3: { accent: "#D97706", badge: "#FFFBEB", badgeBorder: "#FDE68A", badgeText: "#D97706" },
  2: { accent: "#16A34A", badge: "#F0FDF4", badgeBorder: "#BBF7D0", badgeText: "#16A34A" },
  1: { accent: "#16A34A", badge: "#F0FDF4", badgeBorder: "#BBF7D0", badgeText: "#16A34A" },
} as const;

function ScoreBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  return (
    <Box style={{ height: 3, background: "var(--color-bg-muted)", borderRadius: 2, overflow: "hidden" }}>
      <Box style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: 2 }} />
    </Box>
  );
}

interface InformSeverityCardProps {
  country: string;
}

export function InformSeverityCard({ country }: InformSeverityCardProps) {
  const t = useTranslations("detection");
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
  const informQuery = api.inform.getSeverity.useQuery(
    { country },
    { staleTime: 1000 * 60 * 60 * 12 },
  );
  const [infoOpened, { open: openInfo, close: closeInfo }] = useDisclosure(false);

  const cardLabel = (
    <Group gap={6} mb={16}>
      <Box style={{ color: "#A3A3A3" }}><IconChartBar size={13} /></Box>
      <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A3A3A3" }}>
        {t("kpi.inform.title")}
      </Text>
    </Group>
  );

  if (informQuery.isLoading) {
    return (
      <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {cardLabel}
        <Skeleton height={40} mb={8} radius={4} />
        <Skeleton height={12} width="60%" mb={16} radius={4} />
        <Box style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={20} radius={4} />)}
        </Box>
      </Box>
    );
  }

  const inform = informQuery.data;

  if (!inform) {
    return (
      <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {cardLabel}
        <Box style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 11, color: "#737373" }}>{t("kpi.inform.noData", { country })}</Text>
        </Box>
      </Box>
    );
  }

  const catNum = (inform.categoryNumeric ?? 3) as keyof typeof INFORM_COLORS;
  const colors = INFORM_COLORS[catNum] ?? INFORM_COLORS[3];

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {cardLabel}

      {/* score + category */}
      <Group align="flex-end" gap={8} mb={4}>
        <Text style={{
          fontSize: 34, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums", color: colors.accent,
        }}>
          {inform.score.toFixed(1)}
        </Text>
        <Box mb={4}>
          <Box style={{
            background: colors.badge, border: `1px solid ${colors.badgeBorder}`,
            borderRadius: 4, padding: "2px 7px",
          }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: colors.badgeText, letterSpacing: "0.04em" }}>
              {inform.category}
            </Text>
          </Box>
        </Box>
      </Group>

      <Text style={{ fontSize: 10, color: "#737373", fontWeight: 500, marginBottom: 14, lineHeight: 1.3 }}
        lineClamp={2}>
        {inform.crisisName}
      </Text>

      {/* sub-dimension bars */}
      <Box style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { label: t("kpi.inform.impact"),     value: inform.impact },
          { label: t("kpi.inform.conditions"), value: inform.conditions },
          { label: t("kpi.inform.complexity"), value: inform.complexity },
        ].map(({ label, value }) => (
          <Box key={label}>
            <Group justify="space-between" mb={3}>
              <Text style={{ fontSize: 10, color: "#737373", fontWeight: 500 }}>{label}</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#525252", fontVariantNumeric: "tabular-nums" }}>
                {value.toFixed(1)}
              </Text>
            </Group>
            <ScoreBar value={value} color={colors.accent} />
          </Box>
        ))}
      </Box>

      {/* footer */}
      <Group justify="space-between" mt={12} align="center">
        <Text style={{ fontSize: 9, color: "#A3A3A3" }}>
          {t("kpi.inform.updated", { date: inform.lastUpdated })}
        </Text>
        <Group gap={6} align="center">
          <Text style={{ fontSize: 9, color: "#A3A3A3", fontWeight: 600 }}>
            {t("kpi.inform.acapsLine", { month: inform.month })}
          </Text>
          <Box
            onClick={openInfo}
            style={{ cursor: "pointer", color: "#A3A3A3", display: "flex", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#525252")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3A3")}
          >
            <IconInfoCircle size={13} />
          </Box>
        </Group>
      </Group>

      <Modal
        opened={infoOpened}
        onClose={closeInfo}
        title={t("kpi.inform.modal.title")}
        size="md"
        styles={{
          title: { fontSize: 14, fontWeight: 700, color: "#171717" },
          body: { paddingTop: 4 },
        }}
      >
        <Text style={{ fontSize: 13, color: "#525252", marginBottom: 12, lineHeight: 1.6 }}>
          {t.rich("kpi.inform.modal.intro", { strong })}
        </Text>

        <Text style={{ fontSize: 12, fontWeight: 600, color: "#171717", marginBottom: 6 }}>{t("kpi.inform.modal.dimensionsHeading")}</Text>
        <List spacing={4} mb={14} styles={{ item: { fontSize: 12, color: "#525252", lineHeight: 1.6 } }}>
          <List.Item>{t.rich("kpi.inform.modal.dimImpact", { strong })}</List.Item>
          <List.Item>{t.rich("kpi.inform.modal.dimConditions", { strong })}</List.Item>
          <List.Item>{t.rich("kpi.inform.modal.dimComplexity", { strong })}</List.Item>
        </List>

        <Text style={{ fontSize: 12, fontWeight: 600, color: "#171717", marginBottom: 6 }}>{t("kpi.inform.modal.categoriesHeading")}</Text>
        <List spacing={4} mb={14} styles={{ item: { fontSize: 12, color: "#525252", lineHeight: 1.6 } }}>
          <List.Item>{t.rich("kpi.inform.modal.cat1", { strong })}</List.Item>
          <List.Item>{t.rich("kpi.inform.modal.cat2", { strong })}</List.Item>
          <List.Item>{t.rich("kpi.inform.modal.cat3", { strong })}</List.Item>
          <List.Item>{t.rich("kpi.inform.modal.cat4", { strong })}</List.Item>
          <List.Item>{t.rich("kpi.inform.modal.cat5", { strong })}</List.Item>
        </List>

        <Text style={{ fontSize: 12, fontWeight: 600, color: "#171717", marginBottom: 6 }}>{t("kpi.inform.modal.limitationsHeading")}</Text>
        <List spacing={4} mb={14} styles={{ item: { fontSize: 12, color: "#525252", lineHeight: 1.6 } }}>
          <List.Item>{t("kpi.inform.modal.limitationJudgement")}</List.Item>
          <List.Item>{t("kpi.inform.modal.limitationCoverage")}</List.Item>
        </List>

        <Text style={{ fontSize: 12, fontWeight: 600, color: "#171717", marginBottom: 6 }}>{t("kpi.inform.modal.sourceHeading")}</Text>
        <Group gap={6} align="center" mb={6}>
          <Anchor
            href="https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Severity"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#E85D3D" }}
          >
            {t("kpi.inform.modal.sourceJrc")}
          </Anchor>
          <IconExternalLink size={11} color="#E85D3D" />
        </Group>
        <Group gap={6} align="center">
          <Anchor
            href="https://www.acaps.org/en/thematics/all-topics/inform-severity-index"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#E85D3D" }}
          >
            {t("kpi.inform.modal.sourceAcaps")}
          </Anchor>
          <IconExternalLink size={11} color="#E85D3D" />
        </Group>
        <Text style={{ fontSize: 11, color: "#A3A3A3", marginTop: 6 }}>
          {t("kpi.inform.modal.sourceNote")}
        </Text>
      </Modal>
    </Box>
  );
}
