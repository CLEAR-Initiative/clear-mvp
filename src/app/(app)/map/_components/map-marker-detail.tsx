import { useCallback, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Text, Group, Stack, Badge, Button, CloseButton, ScrollArea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
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

interface DragState {
  pointerId: number;
  originX: number;
  originY: number;
  startOffsetX: number;
  startOffsetY: number;
}

export function MapMarkerDetail({ marker, onClose }: MapMarkerDetailProps) {
  const t = useTranslations("map");
  const format = useFormatter();
  const isMobile = useMediaQuery("(max-width: 48em)");
  const sev = severityColors[marker.severity] ?? severityColors.medium;

  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // Reset the dragged position whenever a different marker is selected so the
  // window snaps back to its anchored spot instead of lingering where it was.
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [marker.id]);

  // Keep the window inside its positioned container as the offset changes.
  const clampOffset = useCallback((nextX: number, nextY: number) => {
    const el = boxRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return { x: nextX, y: nextY };

    const box = el.getBoundingClientRect();
    const bounds = parent.getBoundingClientRect();
    const margin = 8;

    // Current top-left of the element without the pending delta.
    const baseLeft = box.left - offset.x;
    const baseTop = box.top - offset.y;

    const minX = bounds.left + margin - baseLeft;
    const maxX = bounds.right - margin - box.width - baseLeft;
    const minY = bounds.top + margin - baseTop;
    const maxY = bounds.bottom - margin - box.height - baseTop;

    return {
      x: Math.min(Math.max(nextX, minX), Math.max(minX, maxX)),
      y: Math.min(Math.max(nextY, minY), Math.max(minY, maxY)),
    };
  }, [offset.x, offset.y]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Desktop-only drag; ignore secondary buttons and interactive controls.
    if (isMobile || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, a, input, [data-no-drag]")) return;

    dragRef.current = {
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }, [isMobile, offset.x, offset.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const nextX = drag.startOffsetX + (e.clientX - drag.originX);
    const nextY = drag.startOffsetY + (e.clientY - drag.originY);
    setOffset(clampOffset(nextX, nextY));
  }, [clampOffset]);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  return (
    <Box
      ref={boxRef}
      className="absolute z-10 bg-[var(--color-bg-white)] border border-[var(--color-border)]"
      style={isMobile ? {
        // Mobile: bottom sheet
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        maxHeight: "45vh",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 12px rgba(0,0,0,0.15)",
        borderBottom: "none",
      } : {
        // Desktop: top-right overlay, draggable via header
        top: 80,
        right: 16,
        width: 320,
        boxShadow: dragging ? "0 10px 24px rgba(0,0,0,0.18)" : "0 4px 12px rgba(0,0,0,0.1)",
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: dragging ? "none" : "box-shadow 120ms ease",
        touchAction: "none",
      }}
    >
      {/* Header — drag handle on desktop */}
      <Group
        justify="space-between"
        px={16}
        py={12}
        className="border-b border-[var(--color-border)]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          cursor: isMobile ? undefined : dragging ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: isMobile ? undefined : "none",
        }}
      >
        <Text fw={600} size="sm" lineClamp={2} style={{ flex: 1 }}>
          {marker.title}
        </Text>
        <CloseButton size="sm" onClick={onClose} data-no-drag />
      </Group>

      {/* Body */}
      <ScrollArea.Autosize mah={isMobile ? "calc(45vh - 60px)" : 400} type="auto">
      <Box px={16} py={12}>
        {/* Severity */}
        <Group justify="space-between" mb={12}>
          <Box>
            <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={{ fontSize: 10 }}>{t("detail.severity")}</Text>
            <Badge
              size="sm"
              mt={4}
              style={{ background: sev.bg, color: sev.color, fontSize: 10, textTransform: "uppercase" }}
            >
              {t(`severities.${marker.severity}`)}
            </Badge>
          </Box>
          {marker.shockTypeName && (
            <Box style={{ textAlign: "end" }}>
              <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={{ fontSize: 10 }}>{t("detail.type")}</Text>
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
          <DetailRow label={t("detail.location")} value={marker.region ?? "-"} />
          {marker.dataSource && <DetailRow label={t("detail.dataSource")} value={marker.dataSource} />}
          {marker.shockDate && (
            <DetailRow
              label={t("detail.shockDate")}
              value={format.dateTime(new Date(marker.shockDate), "short")}
            />
          )}
          <DetailRow
            label={t("detail.coordinates")}
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
                ? `/crisis/${marker.eventId}?from=map`
                : marker.markerKind === "signal"
                ? `/signal/${marker.eventId}?from=map`
                : `/event/${marker.eventId}?from=map`
            }
            className="btn-accent"
            styles={{
              root: {
                background: "var(--color-accent)",
                borderColor: "var(--color-accent)",
                color: "#FFFFFF",
                fontWeight: 600,
                "&:hover": { background: "var(--color-accent-hover)" },
              },
            }}
          >
            {t("detail.viewDetails")}
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
