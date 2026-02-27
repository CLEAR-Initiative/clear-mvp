"use client";

import { useState, useMemo } from "react";
import type { MapMarker } from "~/components/map/crisis-map";
import { Box, Text, Card, Group, Button, SimpleGrid } from "@mantine/core";
import { IconDownload, IconPlus, IconAlertCircle, IconMapPin } from "@tabler/icons-react";
import { PageHeader } from "~/components/ui/page-header";
import { StatsGrid, type StatItem } from "~/components/ui/stats-grid";
import { locations } from "./_components/distribution-wizard";
import { NewDistributionWizard } from "./_components/distribution-wizard";
import { CashMapSection } from "./_components/cash-map-section";
import { LocationDetailsPanel } from "./_components/location-details-panel";

const stats: StatItem[] = [
  { label: "Affected Population", value: "185,000" },
  { label: "Cash Transfer/HH", value: "580 Birr", sub: "\u2248 $10 USD" },
  { label: "Eligible HH (AI)", value: "5,000", color: "#059669" },
  { label: "Total Budget", value: "2.9M Birr" },
];

export default function CashPage() {
  const [selectedLocation, setSelectedLocation] = useState(locations[0]!);
  const [showDistributionWizard, setShowDistributionWizard] = useState(false);

  const mapMarkers: MapMarker[] = useMemo(
    () =>
      locations.map((loc) => ({
        id: loc.id.charCodeAt(0),
        lng: loc.lng,
        lat: loc.lat,
        title: loc.name,
        severity: loc.severity === "CRITICAL" ? "critical" : loc.severity === "HIGH" ? "high" : "medium",
        type: `${loc.affected.toLocaleString()} affected`,
        description: `Severity: ${loc.severity}`,
      })),
    [],
  );

  return (
    <Box>
      {/* Header */}
      <PageHeader title="Cash Assistance Targeting & Distribution">
        <Button variant="outline" color="gray" size="xs" leftSection={<IconDownload size={14} />} style={{ fontSize: 13 }}>
          Export Data
        </Button>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}
          onClick={() => setShowDistributionWizard(true)}
        >
          New Distribution
        </Button>
      </PageHeader>

      {/* Active Crisis Banner */}
      <Box px={24} py={10} style={{ background: "#FEF2E8", borderBottom: "1px solid #FDBA74" }}>
        <Group justify="space-between">
          <Group gap={12}>
            <IconAlertCircle size={18} color="#C2410C" />
            <Text size="sm" c="#171717">
              <Text span fw={700} c="#C2410C">Active Crisis:</Text> Cholera Outbreak - Somali Region {"\u2022"} Jijiga, Kebridehar
            </Text>
          </Group>
          <Text size="xs" fw={600} px={10} py={4} style={{ background: "white", border: "1px solid #E5E5E5", color: "#525252" }}>
            46h intervention window
          </Text>
        </Group>
      </Box>

      <Box p={24}>
        {/* Stats */}
        <StatsGrid stats={stats} />

        {/* Map Section Header */}
        <Group gap={8} mb={4}>
          <IconMapPin size={18} color="#171717" />
          <Text size="sm" fw={600} c="#171717">Cash Assistance Mapping & Assessment</Text>
        </Group>
        <Text size="xs" c="#A3A3A3" mb={16}>
          Click on location cards to view detailed population demographics, market analysis, and field coordinator inputs
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
        <Text size="sm" fw={600} c="#171717" mb={12}>Data Sources</Text>
        <SimpleGrid cols={2} spacing={16}>
          {[
            { title: "Rapid Assessment", org: "NRC/UNHCR", date: "10/21/2025", pct: 68, color: "#2563EB" },
            { title: "Census Projection", org: "National Statistics", date: "2024 Baseline", pct: 100, color: "#059669" },
          ].map((src) => (
            <Card key={src.title} p={16} style={{ border: "1px solid #E5E5E5" }}>
              <Group justify="space-between" mb={8}>
                <Box>
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>{src.title}</Text>
                  <Text size="xs" c="#A3A3A3">{src.org}</Text>
                  <Text size="xs" c="#A3A3A3">{src.date}</Text>
                </Box>
                <Text size="sm" fw={600} style={{ fontFamily: "monospace" }} c={src.color}>{src.pct}%</Text>
              </Group>
              <Box style={{ height: 4, background: "#F5F5F5" }}>
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
