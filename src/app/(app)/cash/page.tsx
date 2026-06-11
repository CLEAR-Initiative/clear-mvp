"use client";

import { useState, useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { MapMarker } from "~/components/map/crisis-map";
import { Box, Text, Card, Group, Button, SimpleGrid } from "@mantine/core";
import { IconDownload, IconPlus, IconAlertCircle, IconMapPin } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui/page-header";
import { StatsGrid, type StatItem } from "~/components/ui/stats-grid";
import { locations } from "./_components/distribution-wizard";
import { NewDistributionWizard } from "./_components/distribution-wizard";
import { CashMapSection } from "./_components/cash-map-section";
import { LocationDetailsPanel } from "./_components/location-details-panel";

export default function CashPage() {
  const t = useTranslations("cash");
  const format = useFormatter();
  const [selectedLocation, setSelectedLocation] = useState(locations[0]!);
  const [showDistributionWizard, setShowDistributionWizard] = useState(false);

  const stats: StatItem[] = [
    { label: t("stats.affectedPopulation"), value: "185,000" },
    { label: t("stats.cashTransferPerHh"), value: "580 Birr", sub: "\u2248 $10 USD" },
    { label: t("stats.eligibleHh"), value: "5,000", color: "#059669" },
    { label: t("stats.totalBudget"), value: "2.9M Birr" },
  ];

  const mapMarkers: MapMarker[] = useMemo(
    () =>
      locations.map((loc) => ({
        id: loc.id.charCodeAt(0),
        lng: loc.lng,
        lat: loc.lat,
        title: loc.name,
        severity: loc.severity === "CRITICAL" ? "critical" : loc.severity === "HIGH" ? "high" : "medium",
        type: t("mapping.markerAffected", { count: format.number(loc.affected) }),
        description: t("mapping.markerSeverity", { severity: loc.severity }),
      })),
    [t, format],
  );

  return (
    <Box>
      {/* Header */}
      <PageHeader title={t("header.title")}>
        <Button variant="outline" color="gray" size="xs" leftSection={<IconDownload size={14} />} style={{ fontSize: 13 }}>
          {t("header.exportData")}
        </Button>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}
          onClick={() => setShowDistributionWizard(true)}
        >
          {t("header.newDistribution")}
        </Button>
      </PageHeader>

      {/* Active Crisis Banner */}
      <Box px={24} py={10} style={{ background: "#FEF2E8", borderBottom: "1px solid #FDBA74" }}>
        <Group justify="space-between">
          <Group gap={12}>
            <IconAlertCircle size={18} color="#C2410C" />
            <Text size="sm" c="var(--color-text-primary)">
              <Text span fw={700} c="var(--color-warning)">{t("banner.label")}</Text> {t("banner.crisis")}
            </Text>
          </Group>
          <Text size="xs" fw={600} px={10} py={4} style={{ background: "var(--color-bg-white)", border: "1px solid var(--color-border)", color: "#525252" }}>
            {t("banner.window")}
          </Text>
        </Group>
      </Box>

      <Box p={24}>
        {/* Stats */}
        <StatsGrid stats={stats} />

        {/* Map Section Header */}
        <Group gap={8} mb={4}>
          <IconMapPin size={18} color="#171717" />
          <Text size="sm" fw={600} c="var(--color-text-primary)">{t("mapping.title")}</Text>
        </Group>
        <Text size="xs" c="var(--color-text-muted)" mb={16}>
          {t("mapping.subtitle")}
        </Text>

        {/* Map + Details Panel */}
        <Group align="flex-start" gap={16} mb={24} style={{ flexWrap: "nowrap" }}>
          <CashMapSection
            mapMarkers={mapMarkers}
            center={[selectedLocation.lng, selectedLocation.lat]}
            onMarkerClick={(m) => {
              const loc = locations.find((l) => l.name === m.title);
              if (loc) setSelectedLocation(loc);
            }}
          />
          <LocationDetailsPanel selectedLocation={selectedLocation} />
        </Group>

        {/* Data Sources */}
        <Text size="sm" fw={600} c="var(--color-text-primary)" mb={12}>{t("sources.title")}</Text>
        <SimpleGrid cols={2} spacing={16}>
          {([
            { key: "rapidAssessment", pct: 68, color: "#2563EB" },
            { key: "censusProjection", pct: 100, color: "#059669" },
          ] as const).map((src) => (
            <Card key={src.key} p={16} style={{ border: "1px solid var(--color-border)" }}>
              <Group justify="space-between" mb={8}>
                <Box>
                  <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>{t(`sources.${src.key}.title`)}</Text>
                  <Text size="xs" c="var(--color-text-muted)">{t(`sources.${src.key}.org`)}</Text>
                  <Text size="xs" c="var(--color-text-muted)">{t(`sources.${src.key}.date`)}</Text>
                </Box>
                <Text size="sm" fw={600} style={{ fontFamily: "monospace" }} c={src.color}>{src.pct}%</Text>
              </Group>
              <Box style={{ height: 4, background: "var(--color-bg-muted)" }}>
                <Box style={{ height: "100%", width: `${src.pct}%`, background: src.color }} />
              </Box>
            </Card>
          ))}
        </SimpleGrid>
      </Box>

      {/* Distribution Wizard Modal */}
      <NewDistributionWizard
        opened={showDistributionWizard}
        onClose={() => setShowDistributionWizard(false)}
      />
    </Box>
  );
}
