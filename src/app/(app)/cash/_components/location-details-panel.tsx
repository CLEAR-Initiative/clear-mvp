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
import { IconMapPin, IconShieldCheck } from "@tabler/icons-react";
import type { LocationData } from "./distribution-wizard";

interface LocationDetailsPanelProps {
  selectedLocation: LocationData;
}

export function LocationDetailsPanel({ selectedLocation }: LocationDetailsPanelProps) {
  const [detailTab, setDetailTab] = useState<string | null>("demographics");
  const d = selectedLocation.demographics;
  const total = d.male + d.female;

  return (
    <Box style={{ flex: "0 0 35%", minWidth: 0 }}>
      <Card p={0} style={{ border: "1px solid #E5E5E5", height: 500, overflowY: "auto" }}>
        <Box px={16} py={12} className="border-b border-[#E5E5E5]" style={{ position: "sticky", top: 0, background: "white", zIndex: 5 }}>
          <Group gap={8}>
            <IconMapPin size={16} color="#A3A3A3" />
            <Text fw={600} size="sm">{selectedLocation.name}</Text>
          </Group>
        </Box>

        {/* Total Affected */}
        <Box px={20} py={16} className="border-b border-[#E5E5E5]">
          <Group justify="space-between">
            <Box>
              <Text size="xs" c="#A3A3A3" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={4}>Total Affected</Text>
              <Text size="xl" fw={700} style={{ fontFamily: "monospace" }}>{selectedLocation.affected.toLocaleString()}</Text>
            </Box>
            <Badge size="lg" style={{ background: selectedLocation.severityColor, color: "white", fontWeight: 600 }}>
              {selectedLocation.severity}
            </Badge>
          </Group>
        </Box>

        {/* Export button */}
        <Box px={20} py={12} className="border-b border-[#E5E5E5]">
          <Button fullWidth size="sm" style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}>Export Cash Assessment Report (PDF)</Button>
        </Box>

        {/* Detail Tabs */}
        <Tabs value={detailTab} onChange={setDetailTab} styles={{ tab: { fontSize: 13, fontWeight: 500 } }}>
          <Tabs.List>
            <Tabs.Tab value="demographics" style={{ flex: 1 }}>Demographics</Tabs.Tab>
            <Tabs.Tab value="market" style={{ flex: 1 }}>Market</Tabs.Tab>
            <Tabs.Tab value="field" style={{ flex: 1 }}>Field Input</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="demographics">
            <Box p={16}>
              {/* Gender */}
              <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mb={10}>Gender Distribution</Text>
              {[
                { label: "Male", value: d.male, pct: Math.round((d.male / total) * 100) },
                { label: "Female", value: d.female, pct: Math.round((d.female / total) * 100) },
              ].map((g) => (
                <Box key={g.label} mb={8}>
                  <Group justify="space-between" mb={4}>
                    <Text size="xs">{g.label}</Text>
                    <Text size="xs" style={{ fontFamily: "monospace" }}>{g.value.toLocaleString()} ({g.pct}%)</Text>
                  </Group>
                  <Box style={{ height: 6, background: "#F5F5F5" }}>
                    <Box style={{ height: "100%", width: `${g.pct}%`, background: "#525252" }} />
                  </Box>
                </Box>
              ))}

              {/* Age Distribution */}
              <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mt={20} mb={10}>Age Distribution</Text>
              <SimpleGrid cols={4} spacing={8}>
                {Object.entries(d.ages).map(([label, value]) => (
                  <Box key={label} p={10} style={{ background: "#F5F5F5", textAlign: "center" }}>
                    <Text size="xs" c="#A3A3A3" mb={4}>{label}</Text>
                    <Text size="sm" fw={600} style={{ fontFamily: "monospace" }}>{value.toLocaleString()}</Text>
                  </Box>
                ))}
              </SimpleGrid>

              {/* Vulnerability */}
              <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mt={20} mb={10}>Vulnerability Indicators (HH)</Text>
              {Object.entries(d.vulnerability).map(([label, value]) => (
                <Group key={label} justify="space-between" py={6} className="border-b border-[#E5E5E5]">
                  <Text size="xs">{label}</Text>
                  <Text size="xs" fw={500} style={{ fontFamily: "monospace" }}>{value}</Text>
                </Group>
              ))}

              {/* Housing */}
              <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mt={20} mb={10}>Housing Conditions (HH)</Text>
              {Object.entries(d.housing).map(([label, value]) => (
                <Group key={label} justify="space-between" py={6} className="border-b border-[#E5E5E5]">
                  <Text size="xs">{label}</Text>
                  <Text size="xs" fw={500} style={{ fontFamily: "monospace" }}>{value}</Text>
                </Group>
              ))}

              {/* Avg Persons/Room */}
              <Box mt={16} p={12} style={{ background: "#F5F5F5" }}>
                <Text size="xs" c="#A3A3A3" mb={4}>Avg. Persons/Room</Text>
                <Text size="lg" fw={700} style={{ fontFamily: "monospace" }}>{d.personsPerRoom}</Text>
              </Box>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="market">
            <Box p={16}>
              <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mb={10}>Market Functionality</Text>
              <Box p={12} mb={8} style={{ background: "#D1FAE5" }}>
                <Group gap={8}>
                  <Box style={{ width: 8, height: 8, background: "#059669" }} />
                  <Text size="sm" fw={500} c="#059669">Markets Operational</Text>
                </Group>
              </Box>
              <Text size="xs" c="#525252" style={{ lineHeight: 1.5 }} mb={20}>
                3 of 4 major markets in the area are functioning normally. One market has reduced hours due to security concerns.
              </Text>

              <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mb={10}>Vendor Availability</Text>
              {[
                { label: "Food vendors", value: "12 active", color: "#059669" },
                { label: "NFI vendors", value: "8 active", color: "#059669" },
                { label: "Mobile money agents", value: "3 active", color: "#F59E0B" },
              ].map((v) => (
                <Group key={v.label} justify="space-between" py={6} className="border-b border-[#E5E5E5]">
                  <Text size="xs">{v.label}</Text>
                  <Text size="xs" fw={500} c={v.color} style={{ fontFamily: "monospace" }}>{v.value}</Text>
                </Group>
              ))}

              <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mt={20} mb={10}>Price Stability</Text>
              {[
                { label: "Staple foods", value: "+12% vs baseline", color: "#F59E0B" },
                { label: "Water (20L)", value: "+28% vs baseline", color: "#DC2626" },
                { label: "Transport", value: "+5% vs baseline", color: "#059669" },
              ].map((p) => (
                <Group key={p.label} justify="space-between" py={6} className="border-b border-[#E5E5E5]">
                  <Text size="xs">{p.label}</Text>
                  <Text size="xs" c={p.color}>{p.value}</Text>
                </Group>
              ))}

              <Box mt={16} p={12} style={{ background: "#F0F9FF", borderLeft: "3px solid #3B82F6" }}>
                <Text size="xs" fw={600} c="#3B82F6" mb={4}>Recommendation</Text>
                <Text size="xs" c="#525252">Cash transfer is viable. Consider voucher restrictions for water purchases due to price inflation.</Text>
              </Box>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="field">
            <Box p={16}>
              <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mb={10}>Coordinator Notes</Text>
              <Box p={12} mb={20} style={{ background: "#F5F5F5" }}>
                <Text size="xs" c="#525252" style={{ lineHeight: 1.6 }}>
                  &ldquo;Community leaders have been consulted and are supportive of cash distribution. Women&apos;s groups prefer mobile money due to safety concerns with physical cash. Recommend morning distributions to avoid afternoon heat.&rdquo;
                </Text>
                <Text size="xs" c="#A3A3A3" mt={8}>&mdash; Ahmed M., Field Coordinator, Dec 14</Text>
              </Box>

              <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mb={10}>Accessibility</Text>
              {[
                { label: "Road access", value: "Good", color: "#059669" },
                { label: "Mobile network", value: "Intermittent", color: "#F59E0B" },
                { label: "Distribution points", value: "2 identified", color: undefined },
              ].map((a) => (
                <Group key={a.label} justify="space-between" py={6} className="border-b border-[#E5E5E5]">
                  <Text size="xs">{a.label}</Text>
                  <Text size="xs" fw={500} c={a.color}>{a.value}</Text>
                </Group>
              ))}

              {/* Security Considerations */}
              <Text size="xs" fw={600} c="#A3A3A3" tt="uppercase" mt={20} mb={10}>Security Considerations</Text>
              <Box p={12} mb={8} style={{ background: "#FEF3C7" }}>
                <Group gap={8}>
                  <IconShieldCheck size={16} color="#D97706" />
                  <Text size="sm" fw={500} c="#D97706">Moderate Risk</Text>
                </Group>
              </Box>
              <Text size="xs" c="#525252" style={{ lineHeight: 1.5 }} mb={16}>
                Avoid large gatherings. Recommend staggered distribution times and multiple smaller distribution points.
              </Text>

              <Box mt={16} p={12} style={{ background: "#F5F5F5" }}>
                <Text size="xs" c="#A3A3A3" mb={4}>Last Field Visit</Text>
                <Text size="sm" fw={600}>December 12, 2024</Text>
              </Box>
            </Box>
          </Tabs.Panel>
        </Tabs>
      </Card>
    </Box>
  );
}
