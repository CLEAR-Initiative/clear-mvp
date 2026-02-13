"use client";

import { use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Box, Text, Button, Group, SimpleGrid, Progress, Stack } from "@mantine/core";
import { IconArrowLeft, IconDownload, IconCircleCheck, IconAlertTriangle, IconFile } from "@tabler/icons-react";
import { CardSection, StatsGrid, DataTable, Table, SeverityBadge, Timeline } from "~/components/ui";
import { severityColors } from "~/lib/constants/severity";
import { crisisDataMap } from "~/lib/data/crisis-data";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h={300} bg="#F5F5F5" /> },
);

export default function CrisisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const data = crisisDataMap[id];

  if (!data) {
    return (
      <Box p={48} style={{ textAlign: "center" }}>
        <Text size="lg" fw={600} c="#171717">Crisis not found</Text>
        <Text size="sm" c="#737373" mt={8}>The requested crisis could not be found.</Text>
        <Button component={Link} href="/dashboard" mt={16} variant="outline" color="gray">Back to Dashboard</Button>
      </Box>
    );
  }

  const sev = severityColors[data.severity]!;

  return (
    <Box>
      {/* Header — kept inline for custom back-button behavior */}
      <Box px={24} py={12} className="border-b border-[#E5E5E5]" style={{ background: "#FFFFFF" }}>
        <Group justify="space-between">
          <Group gap={16}>
            <Text component={Link} href="/dashboard" c="#737373" size="sm" className="no-underline flex items-center gap-1 hover:text-[#171717] transition-colors" style={{ fontSize: 13 }}>
              <IconArrowLeft size={16} /> Back
            </Text>
            <Box>
              <Group gap={8}>
                <Text fw={600} c="#171717" style={{ fontSize: 16 }}>{data.name}</Text>
                <SeverityBadge severity={data.severity} label={data.badge} style={{ fontSize: 9 }} />
              </Group>
              <Text size="xs" c="#737373" mt={4}>{data.region} &bull; {data.areas}</Text>
            </Box>
          </Group>
          <Group gap={8}>
            <Button variant="outline" color="gray" size="xs" leftSection={<IconDownload size={14} />} style={{ fontSize: 13 }}>Export</Button>
            <Button size="xs" leftSection={<IconCircleCheck size={14} />} style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}>Update Status</Button>
          </Group>
        </Group>
      </Box>

      <Box p={24}>
        {/* Alert Banner */}
        <Box p={16} mb={24} className="flex items-center gap-12" style={{ background: "#FEF3C7", borderBottom: "1px solid #FCD34D" }}>
          <IconAlertTriangle size={20} color="#D97706" />
          <Box style={{ flex: 1 }}>
            <Text fw={600} c="#171717" style={{ fontSize: 13 }}>{data.alertTitle}</Text>
            <Text c="#525252" style={{ fontSize: 13 }}>{data.alertMessage}</Text>
          </Box>
          <Button variant="unstyled" style={{ background: "white", border: "1px solid white", color: "#DC2626", fontSize: 13, fontWeight: 500, padding: "6px 12px", cursor: "pointer" }}>
            View Recommendations
          </Button>
        </Box>

        {/* Key Stats */}
        <StatsGrid stats={data.stats} cardStyle={(_s, i) => (i === 0 ? { borderLeft: `4px solid ${sev.text}` } : {})} />

        {/* Overview + Timeline */}
        <SimpleGrid cols={2} spacing={16} mb={24}>
          <CardSection title="Crisis Overview">
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
                  <Progress value={data.confidence} size={6} color="#059669" style={{ flex: 1 }} />
                  <Text fw={600} c="#171717">{data.confidence}%</Text>
                </Group>
              </Box>
            </Stack>
          </CardSection>

          <CardSection title="Event Timeline">
            <Timeline items={data.timeline} />
          </CardSection>
        </SimpleGrid>

        {/* Affected Areas Map */}
        <CardSection title="Affected Areas" noPadding style={{ marginBottom: 24 }}>
          <Box style={{ height: 300 }}>
            <CrisisMap markers={data.mapMarkers} center={data.mapCenter} zoom={data.mapZoom} className="w-full h-full" />
          </Box>
        </CardSection>

        {/* Response Status + AI Recommendations */}
        <SimpleGrid cols={2} spacing={16} mb={24}>
          <CardSection title="Response Status" subtitle="Current activities" action={<Text component={Link} href="/operations" size="xs" c="#E85D3D" className="no-underline">View Operations &rarr;</Text>}>
            <Stack gap={8}>
              {data.responses.map((resp) => (
                <Box key={resp.name} p={12}>
                  <Group justify="space-between" mb={8}>
                    <Text fw={600} style={{ fontSize: 13 }}>{resp.name}</Text>
                    <Text size="xs" px={8} py={2} style={{ background: resp.statusBg, color: resp.statusColor, fontSize: 11 }}>{resp.status}</Text>
                  </Group>
                  <Text c="#525252" style={{ fontSize: 12 }}>{resp.detail}</Text>
                </Box>
              ))}
            </Stack>
          </CardSection>

          <CardSection title="AI Recommendations" subtitle="Priority actions">
            <Stack gap={8}>
              {data.recommendations.map((rec) => (
                <Box key={rec.title} p={12} style={{ borderLeft: `3px solid ${rec.borderColor}` }}>
                  <Text fw={600} tt="uppercase" mb={8} style={{ fontSize: 11, color: rec.priorityColor }}>{rec.priority}</Text>
                  <Text fw={600} c="#171717" mb={4}>{rec.title}</Text>
                  <Text c="#525252" style={{ fontSize: 12 }}>{rec.detail}</Text>
                </Box>
              ))}
            </Stack>
          </CardSection>
        </SimpleGrid>

        {/* Related Documents */}
        <CardSection title="Related Documents" subtitle="Reports and protocols" action={<Button size="xs" variant="outline" color="gray">+ Upload</Button>} noPadding>
          <DataTable
            columns={[{ label: "Document" }, { label: "Type" }, { label: "Updated" }, { label: "Author" }, { label: "" }]}
            data={data.documents}
            renderRow={(doc) => (
              <Table.Tr key={doc.name}>
                <Table.Td><Group gap={8}><IconFile size={16} color="#E85D3D" /><Text fw={600} style={{ fontSize: 13 }}>{doc.name}</Text></Group></Table.Td>
                <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{doc.type}</Text></Table.Td>
                <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{doc.updated}</Text></Table.Td>
                <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{doc.author}</Text></Table.Td>
                <Table.Td><Text c="#E85D3D" style={{ fontSize: 12, cursor: "pointer" }}>View</Text></Table.Td>
              </Table.Tr>
            )}
          />
        </CardSection>
      </Box>
    </Box>
  );
}
