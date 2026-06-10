"use client";

import { useState } from "react";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Button,
  SimpleGrid,
  Tabs,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import { IconMapPin, IconShieldCheck } from "@tabler/icons-react";
import type { LocationData } from "./distribution-wizard";

interface LocationDetailsPanelProps {
  selectedLocation: LocationData;
}

export function LocationDetailsPanel({ selectedLocation }: LocationDetailsPanelProps) {
  const t = useTranslations("cash.details");
  const [detailTab, setDetailTab] = useState<string | null>("demographics");
  const d = selectedLocation.demographics;
  const total = d.male + d.female;

  return (
    <Box style={{ flex: "0 0 35%", minWidth: 0 }}>
      <Card p={0} style={{ border: "1px solid var(--color-border)", height: 500, overflowY: "auto" }}>
        <Box px={16} py={12} className="border-b border-[var(--color-border)]" style={{ position: "sticky", top: 0, background: "var(--color-bg-white)", zIndex: 5 }}>
          <Group gap={8}>
            <IconMapPin size={16} color="#A3A3A3" />
            <Text fw={600} size="sm">{selectedLocation.name}</Text>
          </Group>
        </Box>

        {/* Total Affected */}
        <Box px={20} py={16} className="border-b border-[var(--color-border)]">
          <Group justify="space-between">
            <Box>
              <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={4}>{t("totalAffected")}</Text>
              <Text size="xl" fw={700} style={{ fontFamily: "monospace" }}>{selectedLocation.affected.toLocaleString()}</Text>
            </Box>
            <Badge size="lg" style={{ background: selectedLocation.severityColor, color: "white", fontWeight: 600 }}>
              {selectedLocation.severity}
            </Badge>
          </Group>
        </Box>

        {/* Export button */}
        <Box px={20} py={12} className="border-b border-[var(--color-border)]">
          <Button fullWidth size="sm" style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}>{t("exportReport")}</Button>
        </Box>

        {/* Detail Tabs */}
        <Tabs value={detailTab} onChange={setDetailTab} styles={{ tab: { fontSize: 13, fontWeight: 500 } }}>
          <Tabs.List>
            <Tabs.Tab value="demographics" style={{ flex: 1 }}>{t("tabs.demographics")}</Tabs.Tab>
            <Tabs.Tab value="market" style={{ flex: 1 }}>{t("tabs.market")}</Tabs.Tab>
            <Tabs.Tab value="field" style={{ flex: 1 }}>{t("tabs.field")}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="demographics">
            <Box p={16}>
              {/* Gender */}
              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={10}>{t("demographics.gender")}</Text>
              {[
                { label: t("demographics.male"), value: d.male, pct: Math.round((d.male / total) * 100) },
                { label: t("demographics.female"), value: d.female, pct: Math.round((d.female / total) * 100) },
              ].map((g) => (
                <Box key={g.label} mb={8}>
                  <Group justify="space-between" mb={4}>
                    <Text size="xs">{g.label}</Text>
                    <Text size="xs" style={{ fontFamily: "monospace" }}>{g.value.toLocaleString()} ({g.pct}%)</Text>
                  </Group>
                  <Box style={{ height: 6, background: "var(--color-bg-muted)" }}>
                    <Box style={{ height: "100%", width: `${g.pct}%`, background: "#525252" }} />
                  </Box>
                </Box>
              ))}

              {/* Age Distribution */}
              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mt={20} mb={10}>{t("demographics.age")}</Text>
              <SimpleGrid cols={4} spacing={8}>
                {Object.entries(d.ages).map(([label, value]) => (
                  <Box key={label} p={10} style={{ background: "var(--color-bg-muted)", textAlign: "center" }}>
                    <Text size="xs" c="var(--color-text-muted)" mb={4}>{label}</Text>
                    <Text size="sm" fw={600} style={{ fontFamily: "monospace" }}>{value.toLocaleString()}</Text>
                  </Box>
                ))}
              </SimpleGrid>

              {/* Vulnerability */}
              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mt={20} mb={10}>{t("demographics.vulnerability")}</Text>
              {Object.entries(d.vulnerability).map(([label, value]) => (
                <Group key={label} justify="space-between" py={6} className="border-b border-[var(--color-border)]">
                  <Text size="xs">{label}</Text>
                  <Text size="xs" fw={500} style={{ fontFamily: "monospace" }}>{value}</Text>
                </Group>
              ))}

              {/* Housing */}
              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mt={20} mb={10}>{t("demographics.housing")}</Text>
              {Object.entries(d.housing).map(([label, value]) => (
                <Group key={label} justify="space-between" py={6} className="border-b border-[var(--color-border)]">
                  <Text size="xs">{label}</Text>
                  <Text size="xs" fw={500} style={{ fontFamily: "monospace" }}>{value}</Text>
                </Group>
              ))}

              {/* Avg Persons/Room */}
              <Box mt={16} p={12} style={{ background: "var(--color-bg-muted)" }}>
                <Text size="xs" c="var(--color-text-muted)" mb={4}>{t("demographics.personsPerRoom")}</Text>
                <Text size="lg" fw={700} style={{ fontFamily: "monospace" }}>{d.personsPerRoom}</Text>
              </Box>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="market">
            <Box p={16}>
              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={10}>{t("market.functionality")}</Text>
              <Box p={12} mb={8} style={{ background: "#D1FAE5" }}>
                <Group gap={8}>
                  <Box style={{ width: 8, height: 8, background: "#059669" }} />
                  <Text size="sm" fw={500} c="#059669">{t("market.operational")}</Text>
                </Group>
              </Box>
              <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }} mb={20}>
                {t("market.operationalNote")}
              </Text>

              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={10}>{t("market.vendors")}</Text>
              {[
                { label: t("market.vendorLabels.food"), value: t("market.vendorActive", { count: 12 }), color: "#059669" },
                { label: t("market.vendorLabels.nfi"), value: t("market.vendorActive", { count: 8 }), color: "#059669" },
                { label: t("market.vendorLabels.mobileMoney"), value: t("market.vendorActive", { count: 3 }), color: "#F59E0B" },
              ].map((v) => (
                <Group key={v.label} justify="space-between" py={6} className="border-b border-[var(--color-border)]">
                  <Text size="xs">{v.label}</Text>
                  <Text size="xs" fw={500} c={v.color} style={{ fontFamily: "monospace" }}>{v.value}</Text>
                </Group>
              ))}

              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mt={20} mb={10}>{t("market.prices")}</Text>
              {[
                { label: t("market.priceLabels.stapleFoods"), value: t("market.priceVsBaseline", { change: "+12%" }), color: "#F59E0B" },
                { label: t("market.priceLabels.water"), value: t("market.priceVsBaseline", { change: "+28%" }), color: "#DC2626" },
                { label: t("market.priceLabels.transport"), value: t("market.priceVsBaseline", { change: "+5%" }), color: "#059669" },
              ].map((p) => (
                <Group key={p.label} justify="space-between" py={6} className="border-b border-[var(--color-border)]">
                  <Text size="xs">{p.label}</Text>
                  <Text size="xs" c={p.color}>{p.value}</Text>
                </Group>
              ))}

              <Box mt={16} p={12} style={{ background: "#F0F9FF", borderLeft: "3px solid #3B82F6" }}>
                <Text size="xs" fw={600} c="#3B82F6" mb={4}>{t("market.recommendation")}</Text>
                <Text size="xs" c="var(--color-text-secondary)">{t("market.recommendationText")}</Text>
              </Box>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="field">
            <Box p={16}>
              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={10}>{t("field.notes")}</Text>
              <Box p={12} mb={20} style={{ background: "var(--color-bg-muted)" }}>
                <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.6 }}>
                  &ldquo;{t("field.quote")}&rdquo;
                </Text>
                <Text size="xs" c="var(--color-text-muted)" mt={8}>&mdash; {t("field.attribution")}</Text>
              </Box>

              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mb={10}>{t("field.accessibility")}</Text>
              {[
                { label: t("field.accessLabels.road"), value: t("field.accessValues.good"), color: "#059669" },
                { label: t("field.accessLabels.network"), value: t("field.accessValues.intermittent"), color: "#F59E0B" },
                { label: t("field.accessLabels.points"), value: t("field.accessValues.pointsIdentified", { count: 2 }), color: undefined },
              ].map((a) => (
                <Group key={a.label} justify="space-between" py={6} className="border-b border-[var(--color-border)]">
                  <Text size="xs">{a.label}</Text>
                  <Text size="xs" fw={500} c={a.color}>{a.value}</Text>
                </Group>
              ))}

              {/* Security Considerations */}
              <Text size="xs" fw={600} c="var(--color-text-muted)" tt="uppercase" mt={20} mb={10}>{t("field.security")}</Text>
              <Box p={12} mb={8} style={{ background: "#FEF3C7" }}>
                <Group gap={8}>
                  <IconShieldCheck size={16} color="#D97706" />
                  <Text size="sm" fw={500} c="#D97706">{t("field.moderateRisk")}</Text>
                </Group>
              </Box>
              <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }} mb={16}>
                {t("field.securityNote")}
              </Text>

              <Box mt={16} p={12} style={{ background: "var(--color-bg-muted)" }}>
                <Text size="xs" c="var(--color-text-muted)" mb={4}>{t("field.lastVisit")}</Text>
                <Text size="sm" fw={600}>December 12, 2024</Text>
              </Box>
            </Box>
          </Tabs.Panel>
        </Tabs>
      </Card>
    </Box>
  );
}
