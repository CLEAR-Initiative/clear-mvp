import { Box, Text, Group, Stack, Badge, Button, CloseButton, ScrollArea } from "@mantine/core";
import Link from "next/link";
import { type CrisisMarker } from "./map-markers-data";

interface MapMarkerDetailProps {
  marker: CrisisMarker;
  onClose: () => void;
}

const severityColors: Record<string, { bg: string; color: string }> = {
  critical: { bg: "var(--color-critical-light)", color: "#DC2626" },
  high:     { bg: "var(--color-warning-light)",  color: "#D97706" },
  medium:   { bg: "var(--color-warning-light)",  color: "#D97706" },
  low:      { bg: "var(--color-success-light)",  color: "#059669" },
};

export function MapMarkerDetail({ marker, onClose }: MapMarkerDetailProps) {
  const sev = severityColors[marker.severity] ?? severityColors.medium;

  return (
    <Box
      className="absolute z-10 bg-[var(--color-bg-white)] border border-[var(--color-border)]"
      style={{ top: 80, right: 16, width: 320, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
    >
      {/* Header */}
      <Group justify="space-between" px={16} py={12} className="border-b border-[var(--color-border)]">
        <Text fw={600} size="sm" lineClamp={2} style={{ flex: 1 }}>
          {marker.title}
        </Text>
        <CloseButton size="sm" onClick={onClose} />
      </Group>

      {/* Body */}
      <ScrollArea.Autosize mah={400} type="auto">
      <Box px={16} py={12}>
        {/* Severity */}
        <Group justify="space-between" mb={12}>
          <Box>
            <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={{ fontSize: 10 }}>Severity</Text>
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
              <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={{ fontSize: 10 }}>Type</Text>
              <Text fw={600} size="sm" mt={4}>{marker.shockTypeName}</Text>
            </Box>
          )}
        </Group>

        {/* Description */}
        {marker.description && (
          <Text size="xs" c="var(--color-text-secondary)" mb={12} pb={8} className="border-b border-[var(--color-border)]">
            {marker.description}
          </Text>
        )}

        {/* Details */}
        <Stack gap={0} mb={12}>
          <DetailRow label="Location" value={marker.region ?? "-"} />
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

        {marker.eventId && (
          <Button
            size="xs"
            fullWidth
            component={Link}
            href={
              marker.markerKind === "crisis"
                ? `/crisis/${marker.eventId}`
                : marker.markerKind === "signal"
                ? `/signal/${marker.eventId}`
                : `/event/${marker.eventId}`
            }
            style={{ background: "var(--color-text-primary)" }}
          >
            View Details
          </Button>
        )}
      </Box>
      </ScrollArea.Autosize>
    </Box>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Group justify="space-between" py={6} className="border-b border-[var(--color-border)] last:border-b-0">
      <Text size="xs" c="var(--color-text-muted)">{label}</Text>
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
