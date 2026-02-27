import { Box, Text, Group, Stack, Badge, Button, CloseButton } from "@mantine/core";
import { type CrisisMarker } from "./map-markers-data";

interface MapMarkerDetailProps {
  marker: CrisisMarker;
  onClose: () => void;
}

const severityColors: Record<string, { bg: string; color: string }> = {
  critical: { bg: "#FEE2E2", color: "#DC2626" },
  high: { bg: "#FEF3C7", color: "#D97706" },
  medium: { bg: "#FEF9C3", color: "#A16207" },
  low: { bg: "#DCFCE7", color: "#059669" },
};

export function MapMarkerDetail({ marker, onClose }: MapMarkerDetailProps) {
  const sev = severityColors[marker.severity] ?? severityColors.medium;

  return (
    <Box
      className="absolute z-10 bg-white border border-[#E5E5E5]"
      style={{ top: 80, right: 16, width: 320, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
    >
      {/* Header */}
      <Group justify="space-between" px={16} py={12} className="border-b border-[#E5E5E5]">
        <Text fw={600} size="sm" lineClamp={2} style={{ flex: 1 }}>
          {marker.title}
        </Text>
        <CloseButton size="sm" onClick={onClose} />
      </Group>

      {/* Body */}
      <Box px={16} py={12}>
        {/* Severity */}
        <Group justify="space-between" mb={12}>
          <Box>
            <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10 }}>Severity</Text>
            <Badge
              size="sm"
              mt={4}
              style={{ background: sev.bg, color: sev.color, fontSize: 10, textTransform: "uppercase" }}
            >
              {marker.severity}
            </Badge>
          </Box>
          {marker.shockTypeName && (
            <Box style={{ textAlign: "right" }}>
              <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10 }}>Type</Text>
              <Text fw={600} size="sm" mt={4}>{marker.shockTypeName}</Text>
            </Box>
          )}
        </Group>

        {/* Description */}
        {marker.description && (
          <Text size="xs" c="#525252" mb={12} pb={8} className="border-b border-[#F5F5F5]" lineClamp={4}>
            {marker.description}
          </Text>
        )}

        {/* Details */}
        <Stack gap={0} mb={12}>
          <DetailRow label="Location" value={marker.region ?? "—"} />
          {marker.dataSource && <DetailRow label="Data Source" value={marker.dataSource} />}
          {marker.shockDate && (
            <DetailRow
              label="Shock Date"
              value={new Date(marker.shockDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            />
          )}
          <DetailRow
            label="Coordinates"
            value={`${marker.lat.toFixed(2)}, ${marker.lng.toFixed(2)}`}
            mono
          />
        </Stack>

        <Group gap={8}>
          <Button size="xs" style={{ flex: 1, background: "#171717" }}>View Details</Button>
          <Button size="xs" variant="outline" color="gray" style={{ flex: 1 }}>Add to Report</Button>
        </Group>
      </Box>
    </Box>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Group justify="space-between" py={6} className="border-b border-[#F5F5F5] last:border-b-0">
      <Text size="xs" c="#737373">{label}</Text>
      <Text
        size="xs"
        fw={500}
        style={{
          fontFamily: mono ? "monospace" : undefined,
          fontSize: mono ? 11 : undefined,
        }}
      >
        {value}
      </Text>
    </Group>
  );
}
