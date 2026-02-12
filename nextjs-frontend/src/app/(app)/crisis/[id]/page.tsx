"use client";

import { use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { MapMarker } from "~/components/map/crisis-map";
import {
  Box,
  Text,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Card,
  Table,
  Progress,
  Stack,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconDownload,
  IconCircleCheck,
  IconAlertTriangle,
  IconFile,
  IconPointFilled,
} from "@tabler/icons-react";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h={300} bg="#F5F5F5" /> },
);

// -- Static data per crisis ID --

interface CrisisData {
  name: string;
  severity: "critical" | "high" | "medium";
  region: string;
  areas: string;
  badge: string;
  alertTitle: string;
  alertMessage: string;
  stats: { label: string; value: string; color?: string; sub: string; subColor?: string }[];
  overview: { label: string; value: string }[];
  confidence: number;
  timeline: { title: string; meta: string; color: string }[];
  mapCenter: [number, number];
  mapZoom: number;
  mapMarkers: MapMarker[];
  responses: { name: string; status: string; statusBg: string; statusColor: string; detail: string }[];
  recommendations: { priority: string; priorityColor: string; borderColor: string; title: string; detail: string }[];
  documents: { name: string; type: string; updated: string; author: string }[];
}

const crisisDataMap: Record<string, CrisisData> = {
  "1": {
    name: "Cholera Outbreak",
    severity: "critical",
    region: "Somali Region",
    areas: "Jijiga, Kebridehar, Gode",
    badge: "Critical",
    alertTitle: "Critical Action Window: 46 hours remaining",
    alertMessage: "Early intervention can prevent regional spread. WASH and health teams deploying to affected areas.",
    stats: [
      { label: "Confirmed Cases", value: "247", color: "#DC2626", sub: "\u2191 34 in last 24h", subColor: "#DC2626" },
      { label: "Population at Risk", value: "45,000", sub: "3 woredas" },
      { label: "Case Fatality Rate", value: "1.2%", color: "#D97706", sub: "3 deaths reported" },
      { label: "Response Teams", value: "8", color: "#059669", sub: "All deployed", subColor: "#059669" },
    ],
    overview: [
      { label: "Detection Source", value: "MOH PHEM Surveillance + WHO EWARN" },
      { label: "First Detection", value: "October 27, 2025 (8 days ago)" },
      { label: "Suspected Origin", value: "Contaminated water source - Jijiga town well cluster" },
      { label: "Transmission Pattern", value: "Waterborne, secondary household spread" },
    ],
    confidence: 94,
    timeline: [
      { title: "WASH teams deployed to Jijiga", meta: "Today, 08:30 \u2022 Operations", color: "#059669" },
      { title: "Response activated - Critical", meta: "Today, 06:00 \u2022 System", color: "#E85D3D" },
      { title: "Alert escalated from High to Critical", meta: "Yesterday, 22:15 \u2022 Detection", color: "#D97706" },
      { title: "Spread to Kebridehar confirmed", meta: "Yesterday, 14:00 \u2022 Analysis", color: "#E5E5E5" },
      { title: "Initial cluster detected in Jijiga", meta: "Oct 27, 2025 \u2022 Detection", color: "#E5E5E5" },
    ],
    mapCenter: [43.5, 8.0],
    mapZoom: 6.5,
    mapMarkers: [
      { id: 1, lng: 42.79, lat: 9.35, title: "Jijiga Cluster", severity: "critical", type: "Cases", description: "158 confirmed cases" },
      { id: 2, lng: 44.2, lat: 6.73, title: "Kebridehar", severity: "critical", type: "Cases", description: "89 cases \u2022 Spreading" },
      { id: 3, lng: 43.45, lat: 5.95, title: "Gode (watch)", severity: "high", type: "Cases", description: "12 early cases" },
    ],
    responses: [
      { name: "WASH Response", status: "Active", statusBg: "#D1FAE5", statusColor: "#059669", detail: "4 teams deployed \u2022 Water testing at 12 sources \u2022 ORS distribution ongoing" },
      { name: "Health Response", status: "Active", statusBg: "#D1FAE5", statusColor: "#059669", detail: "2 CTCs established \u2022 156 patients treated \u2022 Community surveillance active" },
      { name: "Cash Assistance", status: "Planning", statusBg: "#FEF3C7", statusColor: "#D97706", detail: "2,847 households targeted \u2022 Verification in progress" },
      { name: "Community Engagement", status: "Active", statusBg: "#D1FAE5", statusColor: "#059669", detail: "Hygiene promotion in 8 kebeles \u2022 Radio messaging active" },
    ],
    recommendations: [
      { priority: "Urgent", priorityColor: "#DC2626", borderColor: "#DC2626", title: "Isolate contaminated water sources", detail: "Close 3 identified contaminated wells and establish alternative water points within 6 hours." },
      { priority: "High Priority", priorityColor: "#D97706", borderColor: "#D97706", title: "Scale up ORS distribution", detail: "Pre-position additional 10,000 ORS sachets in Kebridehar and Gode health facilities." },
      { priority: "Recommended", priorityColor: "#E85D3D", borderColor: "#E85D3D", title: "Activate cash assistance", detail: "Begin emergency cash transfers to enable affected households to access safe water and food." },
    ],
    documents: [
      { name: "Cholera Situation Report #3", type: "SitRep", updated: "Today, 06:00", author: "AI Generated" },
      { name: "NRC Cholera Response Protocol", type: "Protocol", updated: "Oct 28, 2025", author: "Operations Team" },
      { name: "Initial Rapid Assessment", type: "Assessment", updated: "Oct 27, 2025", author: "Field Team" },
    ],
  },
  "2": {
    name: "Flooding Risk",
    severity: "high",
    region: "Oromia Region",
    areas: "Bale, West Arsi",
    badge: "High",
    alertTitle: "Flood Warning: 36 hours until projected impact",
    alertMessage: "Seasonal rainfall patterns indicate elevated flood risk. Pre-positioning recommended.",
    stats: [
      { label: "Risk Level", value: "High", color: "#D97706", sub: "Elevated" },
      { label: "Population at Risk", value: "28,000", sub: "2 woredas" },
      { label: "Warning Window", value: "36h", color: "#D97706", sub: "Active monitoring" },
      { label: "Pre-positioned", value: "4", color: "#059669", sub: "Teams ready", subColor: "#059669" },
    ],
    overview: [
      { label: "Detection Source", value: "FEWS NET + Satellite Imagery" },
      { label: "First Detection", value: "February 8, 2026 (3 days ago)" },
      { label: "Risk Area", value: "River basins in Bale and West Arsi zones" },
      { label: "Projected Impact", value: "Riverside communities, agricultural zones" },
    ],
    confidence: 87,
    timeline: [
      { title: "Pre-positioning teams deployed", meta: "Today, 10:00 \u2022 Operations", color: "#059669" },
      { title: "Alert raised to High", meta: "Yesterday, 16:00 \u2022 Detection", color: "#D97706" },
      { title: "Satellite imagery confirms risk", meta: "Feb 9, 2026 \u2022 Analysis", color: "#E85D3D" },
      { title: "Early warning issued", meta: "Feb 8, 2026 \u2022 Detection", color: "#E5E5E5" },
    ],
    mapCenter: [39.76, 7.0],
    mapZoom: 7,
    mapMarkers: [
      { id: 1, lng: 39.76, lat: 7.0, title: "Flood Risk Zone", severity: "high", type: "Natural Disaster", description: "36h warning \u2022 Oromia" },
    ],
    responses: [
      { name: "Pre-positioning", status: "Active", statusBg: "#D1FAE5", statusColor: "#059669", detail: "Shelter materials and food stocks deployed to forward locations" },
      { name: "Early Warning", status: "Active", statusBg: "#D1FAE5", statusColor: "#059669", detail: "Community alerts issued in 6 kebeles" },
      { name: "Shelter Planning", status: "Planning", statusBg: "#FEF3C7", statusColor: "#D97706", detail: "Evacuation routes identified \u2022 Shelter sites assessed" },
    ],
    recommendations: [
      { priority: "High Priority", priorityColor: "#D97706", borderColor: "#D97706", title: "Complete pre-positioning", detail: "Finalize deployment of shelter kits and food stocks to forward locations before projected impact." },
      { priority: "Recommended", priorityColor: "#E85D3D", borderColor: "#E85D3D", title: "Activate community alert systems", detail: "Ensure all riverside communities have received early warning messaging." },
    ],
    documents: [
      { name: "Flood Risk Assessment", type: "Assessment", updated: "Feb 9, 2026", author: "Analysis Team" },
      { name: "Pre-positioning Plan", type: "Plan", updated: "Feb 10, 2026", author: "Operations Team" },
    ],
  },
  "3": {
    name: "Drought Monitoring",
    severity: "medium",
    region: "Afar Region",
    areas: "Zone 1, Zone 3",
    badge: "Medium",
    alertTitle: "Drought Early Warning: Monitoring phase",
    alertMessage: "Below-average rainfall patterns detected. Continued monitoring recommended.",
    stats: [
      { label: "Risk Level", value: "Medium", color: "#D97706", sub: "Monitoring" },
      { label: "Population at Risk", value: "15,000", sub: "2 zones" },
      { label: "Rainfall Deficit", value: "35%", color: "#D97706", sub: "Below average" },
      { label: "Monitoring Teams", value: "2", color: "#059669", sub: "Active", subColor: "#059669" },
    ],
    overview: [
      { label: "Detection Source", value: "FEWS NET + Ground Reports" },
      { label: "First Detection", value: "January 15, 2026" },
      { label: "Affected Area", value: "Pastoral zones in Afar Region" },
      { label: "Projected Impact", value: "Livestock, water availability" },
    ],
    confidence: 78,
    timeline: [
      { title: "Ground assessment completed", meta: "Feb 5, 2026 \u2022 Field Team", color: "#059669" },
      { title: "Satellite data confirms deficit", meta: "Jan 28, 2026 \u2022 Analysis", color: "#D97706" },
      { title: "Early warning issued", meta: "Jan 15, 2026 \u2022 Detection", color: "#E5E5E5" },
    ],
    mapCenter: [40.0, 11.5],
    mapZoom: 7,
    mapMarkers: [
      { id: 1, lng: 40.0, lat: 11.5, title: "Drought Zone", severity: "medium", type: "Natural Disaster", description: "Monitoring \u2022 Afar" },
    ],
    responses: [
      { name: "Monitoring", status: "Active", statusBg: "#D1FAE5", statusColor: "#059669", detail: "Regular ground assessments and satellite monitoring" },
      { name: "Contingency Planning", status: "Planning", statusBg: "#FEF3C7", statusColor: "#D97706", detail: "Water trucking and livestock feed plans prepared" },
    ],
    recommendations: [
      { priority: "Recommended", priorityColor: "#E85D3D", borderColor: "#E85D3D", title: "Continue monitoring", detail: "Maintain regular ground assessments and coordinate with FEWS NET for updated projections." },
    ],
    documents: [
      { name: "Drought Early Warning Report", type: "Report", updated: "Feb 5, 2026", author: "Analysis Team" },
    ],
  },
};

const severityColors = {
  critical: { bg: "#FEE2E2", text: "#DC2626" },
  high: { bg: "#FEF3C7", text: "#D97706" },
  medium: { bg: "#FEF3C7", text: "#D97706" },
};

export default function CrisisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const data = crisisDataMap[id];

  if (!data) {
    return (
      <Box p={48} style={{ textAlign: "center" }}>
        <Text size="lg" fw={600} c="#171717">Crisis not found</Text>
        <Text size="sm" c="#737373" mt={8}>The requested crisis could not be found.</Text>
        <Button component={Link} href="/dashboard" mt={16} variant="outline" color="gray">
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const sev = severityColors[data.severity];

  return (
    <Box>
      {/* Header */}
      <Box px={24} py={12} className="border-b border-[#E5E5E5]" style={{ background: "#FFFFFF" }}>
        <Group justify="space-between">
          <Group gap={16}>
            <Text
              component={Link}
              href="/dashboard"
              c="#737373"
              size="sm"
              className="no-underline flex items-center gap-1 hover:text-[#171717] transition-colors"
              style={{ fontSize: 13 }}
            >
              <IconArrowLeft size={16} />
              Back
            </Text>
            <Box>
              <Group gap={8}>
                <Text fw={600} c="#171717" style={{ fontSize: 16 }}>{data.name}</Text>
                <Badge
                  size="xs"
                  tt="uppercase"
                  style={{ fontSize: 9, fontWeight: 700, background: sev.bg, color: sev.text }}
                >
                  {data.badge}
                </Badge>
              </Group>
              <Text size="xs" c="#737373" mt={4}>{data.region} \u2022 {data.areas}</Text>
            </Box>
          </Group>
          <Group gap={8}>
            <Button
              variant="outline"
              color="gray"
              size="xs"
              leftSection={<IconDownload size={14} />}
              style={{ fontSize: 13 }}
            >
              Export
            </Button>
            <Button
              size="xs"
              leftSection={<IconCircleCheck size={14} />}
              style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}
            >
              Update Status
            </Button>
          </Group>
        </Group>
      </Box>

      <Box p={24}>
        {/* Alert Banner */}
        <Box
          p={16}
          mb={24}
          className="flex items-center gap-12"
          style={{
            background: "#FEF3C7",
            borderBottom: "1px solid #FCD34D",
          }}
        >
          <IconAlertTriangle size={20} color="#D97706" />
          <Box style={{ flex: 1 }}>
            <Text fw={600} c="#171717" style={{ fontSize: 13 }}>{data.alertTitle}</Text>
            <Text c="#525252" style={{ fontSize: 13 }}>{data.alertMessage}</Text>
          </Box>
          <Button
            variant="unstyled"
            style={{
              background: "white",
              border: `1px solid white`,
              color: "#DC2626",
              fontSize: 13,
              fontWeight: 500,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            View Recommendations
          </Button>
        </Box>

        {/* Key Stats */}
        <SimpleGrid cols={4} spacing={16} mb={24}>
          {data.stats.map((stat, i) => (
            <Card
              key={stat.label}
              p="lg"
              style={{
                border: "1px solid #E5E5E5",
                borderLeft: i === 0 ? `4px solid ${sev.text}` : "1px solid #E5E5E5",
              }}
            >
              <Text c="#737373" fw={600} tt="uppercase" mb={8} style={{ fontSize: 11, letterSpacing: "0.5px" }}>
                {stat.label}
              </Text>
              <Text fw={700} c={stat.color ?? "#171717"} style={{ fontSize: 28, lineHeight: 1 }}>
                {stat.value}
              </Text>
              <Text mt={8} style={{ fontSize: 11, color: stat.subColor ?? "#737373" }}>
                {stat.sub}
              </Text>
            </Card>
          ))}
        </SimpleGrid>

        {/* Two Column: Overview + Timeline */}
        <SimpleGrid cols={2} spacing={16} mb={24}>
          {/* Crisis Overview */}
          <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={20} py={16} className="border-b border-[#E5E5E5]">
              <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Crisis Overview</Text>
            </Box>
            <Box p={20}>
              <Stack gap={16}>
                {data.overview.map((item) => (
                  <Box key={item.label}>
                    <Text c="#737373" tt="uppercase" mb={4} style={{ fontSize: 11 }}>{item.label}</Text>
                    <Text c="#171717" style={{ fontSize: 14 }}>{item.value}</Text>
                  </Box>
                ))}
                <Box>
                  <Text c="#737373" tt="uppercase" mb={4} style={{ fontSize: 11 }}>AI Confidence</Text>
                  <Group gap={8}>
                    <Progress
                      value={data.confidence}
                      size={6}
                      color="#059669"
                      style={{ flex: 1 }}
                    />
                    <Text fw={600} c="#171717">{data.confidence}%</Text>
                  </Group>
                </Box>
              </Stack>
            </Box>
          </Card>

          {/* Event Timeline */}
          <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={20} py={16} className="border-b border-[#E5E5E5]">
              <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Event Timeline</Text>
            </Box>
            <Box p={20} pl={44} style={{ position: "relative" }}>
              {/* Timeline line */}
              <Box
                style={{
                  position: "absolute",
                  left: 31,
                  top: 20,
                  bottom: 20,
                  width: 2,
                  background: "#E5E5E5",
                }}
              />
              <Stack gap={20}>
                {data.timeline.map((event, i) => (
                  <Box key={i} style={{ position: "relative" }}>
                    <Box
                      w={10}
                      h={10}
                      style={{
                        position: "absolute",
                        left: -17,
                        top: 4,
                        background: event.color,
                        border: event.color === "#E5E5E5" ? "2px solid #D4D4D4" : "none",
                      }}
                    />
                    <Text fw={600} style={{ fontSize: 13 }}>{event.title}</Text>
                    <Text c="#737373" style={{ fontSize: 12 }}>{event.meta}</Text>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Card>
        </SimpleGrid>

        {/* Affected Areas Map */}
        <Card p={0} mb={24} style={{ border: "1px solid #E5E5E5" }}>
          <Box px={20} py={16} className="border-b border-[#E5E5E5]">
            <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Affected Areas</Text>
          </Box>
          <Box style={{ height: 300 }}>
            <CrisisMap
              markers={data.mapMarkers}
              center={data.mapCenter}
              zoom={data.mapZoom}
              className="w-full h-full"
            />
          </Box>
        </Card>

        {/* Two Column: Response Status + AI Recommendations */}
        <SimpleGrid cols={2} spacing={16} mb={24}>
          {/* Response Status */}
          <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={20} py={16} className="border-b border-[#E5E5E5]">
              <Group justify="space-between">
                <Box>
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Response Status</Text>
                  <Text size="xs" c="#737373">Current activities</Text>
                </Box>
                <Text
                  component={Link}
                  href="/operations"
                  size="xs"
                  c="#E85D3D"
                  className="no-underline"
                >
                  View Operations &rarr;
                </Text>
              </Group>
            </Box>
            <Box p={16}>
              <Stack gap={8}>
                {data.responses.map((resp) => (
                  <Box key={resp.name} p={12}>
                    <Group justify="space-between" mb={8}>
                      <Text fw={600} style={{ fontSize: 13 }}>{resp.name}</Text>
                      <Text
                        size="xs"
                        px={8}
                        py={2}
                        style={{ background: resp.statusBg, color: resp.statusColor, fontSize: 11 }}
                      >
                        {resp.status}
                      </Text>
                    </Group>
                    <Text c="#525252" style={{ fontSize: 12 }}>{resp.detail}</Text>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Card>

          {/* AI Recommendations */}
          <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={20} py={16} className="border-b border-[#E5E5E5]">
              <Box>
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>AI Recommendations</Text>
                <Text size="xs" c="#737373">Priority actions</Text>
              </Box>
            </Box>
            <Box p={16}>
              <Stack gap={8}>
                {data.recommendations.map((rec) => (
                  <Box
                    key={rec.title}
                    p={12}
                    style={{ borderLeft: `3px solid ${rec.borderColor}` }}
                  >
                    <Text
                      fw={600}
                      tt="uppercase"
                      mb={8}
                      style={{ fontSize: 11, color: rec.priorityColor }}
                    >
                      {rec.priority}
                    </Text>
                    <Text fw={600} c="#171717" mb={4}>{rec.title}</Text>
                    <Text c="#525252" style={{ fontSize: 12 }}>{rec.detail}</Text>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Card>
        </SimpleGrid>

        {/* Related Documents */}
        <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
          <Box px={20} py={16} className="border-b border-[#E5E5E5]">
            <Group justify="space-between">
              <Box>
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Related Documents</Text>
                <Text size="xs" c="#737373">Reports and protocols</Text>
              </Box>
              <Button size="xs" variant="outline" color="gray">+ Upload</Button>
            </Group>
          </Box>
          <Table>
            <Table.Thead>
              <Table.Tr style={{ background: "#F5F5F5" }}>
                <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Document</Table.Th>
                <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Type</Table.Th>
                <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Updated</Table.Th>
                <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Author</Table.Th>
                <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.documents.map((doc) => (
                <Table.Tr key={doc.name}>
                  <Table.Td>
                    <Group gap={8}>
                      <IconFile size={16} color="#E85D3D" />
                      <Text fw={600} style={{ fontSize: 13 }}>{doc.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{doc.type}</Text></Table.Td>
                  <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{doc.updated}</Text></Table.Td>
                  <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{doc.author}</Text></Table.Td>
                  <Table.Td><Text c="#E85D3D" style={{ fontSize: 12, cursor: "pointer" }}>View</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Box>
    </Box>
  );
}
