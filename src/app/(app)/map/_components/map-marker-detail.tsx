import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Text, Group, Stack, Badge, Button, CloseButton, ScrollArea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconGripHorizontal } from "@tabler/icons-react";
import Link from "next/link";
import { type CrisisMarker } from "./map-markers-data";
import type { MarkerScreenPoint } from "~/components/map/crisis-map";

interface MapMarkerDetailProps {
  marker: CrisisMarker;
  onClose: () => void;
  /** Marker pixel position inside the map overlay parent. Desktop only. */
  anchor?: MarkerScreenPoint | null;
  /** Fired when the drag chrome is hovered or actively dragged — use to pulse the map pin. */
  onChromeActiveChange?: (active: boolean) => void;
  /** Bring this panel above siblings when the user interacts with it. */
  onActivate?: () => void;
  /** Stacking order when multiple marker detail panels are open. */
  stackZIndex?: number;
}

const PANEL_WIDTH = 320;
/** Half of typical map pin (~14–18px); gap is measured from pin edge, not center. */
const MARKER_RADIUS = 10;
/** Clear air between pin edge and panel — same for every marker. */
const CLEARANCE = 24;
const PANEL_GAP = MARKER_RADIUS + CLEARANCE;
const PANEL_MARGIN = 8;
const FALLBACK_HEIGHT = 320;

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

/** Place the panel beside the marker: left markers → right side, and vice versa. */
function placeNearMarker(
  anchor: MarkerScreenPoint,
  parent: { width: number; height: number },
  panel: { width: number; height: number },
): { left: number; top: number } {
  const placeOnRight = anchor.x < parent.width / 2;
  let left = placeOnRight
    ? anchor.x + PANEL_GAP
    : anchor.x - panel.width - PANEL_GAP;
  // Keep the header near the pin vertically without covering it.
  let top = anchor.y - Math.min(56, panel.height * 0.28);

  left = Math.min(Math.max(left, PANEL_MARGIN), Math.max(PANEL_MARGIN, parent.width - panel.width - PANEL_MARGIN));
  top = Math.min(Math.max(top, PANEL_MARGIN), Math.max(PANEL_MARGIN, parent.height - panel.height - PANEL_MARGIN));

  return { left, top };
}

export function MapMarkerDetail({
  marker,
  onClose,
  anchor,
  onChromeActiveChange,
  onActivate,
  stackZIndex = 10,
}: MapMarkerDetailProps) {
  const t = useTranslations("map");
  const format = useFormatter();
  const isMobile = useMediaQuery("(max-width: 48em)");
  const sev = severityColors[marker.severity] ?? severityColors.medium;

  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const swipeRef = useRef<{ pointerId: number; startY: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [swipeY, setSwipeY] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);
  const [basePos, setBasePos] = useState({ left: 16, top: 80 });

  const emphasized = dragging || headerHovered;

  // Pulse the matching map pin while the panel chrome is hovered or dragged.
  useEffect(() => {
    onChromeActiveChange?.(emphasized);
    return () => onChromeActiveChange?.(false);
  }, [emphasized, onChromeActiveChange]);

  // Reset the dragged position whenever a different marker is selected so the
  // window snaps back to its anchored spot instead of lingering where it was.
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
    setSwipeY(0);
    setDismissing(false);
  }, [marker.id]);

  useLayoutEffect(() => {
    if (isMobile) return;
    const el = boxRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;

    const panelHeight = el.offsetHeight || FALLBACK_HEIGHT;
    const parentSize = { width: parent.clientWidth, height: parent.clientHeight };

    if (anchor) {
      setBasePos(placeNearMarker(anchor, parentSize, { width: PANEL_WIDTH, height: panelHeight }));
      return;
    }

    // Fallback when no screen anchor is provided: top-right corner.
    setBasePos({
      left: Math.max(PANEL_MARGIN, parentSize.width - PANEL_WIDTH - 16),
      top: 80,
    });
  }, [marker.id, anchor, isMobile]);

  // Keep the window inside its positioned container as the offset changes.
  const clampOffset = useCallback((nextX: number, nextY: number) => {
    const el = boxRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return { x: nextX, y: nextY };

    const box = el.getBoundingClientRect();
    const bounds = parent.getBoundingClientRect();
    const margin = PANEL_MARGIN;

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

    onActivate?.();

    dragRef.current = {
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }, [isMobile, offset.x, offset.y, onActivate]);

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

  // Mobile: swipe-down from the sheet header to dismiss.
  const handleSwipeDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, a, [data-no-drag]")) return;
    swipeRef.current = { pointerId: e.pointerId, startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isMobile]);

  const handleSwipeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== e.pointerId) return;
    setSwipeY(Math.max(0, e.clientY - swipe.startY));
  }, []);

  const handleSwipeEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== e.pointerId) return;
    swipeRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (swipeY > 80) {
      setDismissing(true);
      setSwipeY(420);
      window.setTimeout(() => onClose(), 180);
      return;
    }
    setSwipeY(0);
  }, [onClose, swipeY]);

  return (
    <Box
      ref={boxRef}
      className="absolute z-10 bg-[var(--color-bg-white)]"
      style={isMobile ? {
        // Mobile: bottom sheet — above timeline (z-20)
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        maxHeight: "45vh",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 12px rgba(0,0,0,0.15)",
        border: "1px solid var(--color-border)",
        borderBottom: "none",
        zIndex: Math.max(stackZIndex, 40),
        transform: `translateY(${swipeY}px)`,
        transition: dismissing || swipeY === 0 ? "transform 180ms ease-out" : "none",
        touchAction: "none",
      } : {
        // Desktop: beside the marker, draggable via grip / header
        top: basePos.top,
        left: basePos.left,
        width: PANEL_WIDTH,
        borderRadius: 8,
        border: emphasized
          ? "1px solid var(--color-border-dark)"
          : "1px solid var(--color-border)",
        boxShadow: dragging
          ? "0 12px 28px rgba(0,0,0,0.18)"
          : headerHovered
            ? "0 8px 20px rgba(0,0,0,0.12)"
            : "0 4px 12px rgba(0,0,0,0.1)",
        outline: dragging ? "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)" : undefined,
        outlineOffset: dragging ? 0 : undefined,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: dragging ? "none" : "box-shadow 140ms ease, border-color 140ms ease, outline 140ms ease",
        touchAction: "none",
        zIndex: dragging ? Math.max(stackZIndex, 30) : stackZIndex,
      }}
    >
      {/* Desktop: drag chrome — grip + title row */}
      {!isMobile && (
        <Box
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onMouseEnter={() => setHeaderHovered(true)}
          onMouseLeave={() => setHeaderHovered(false)}
          style={{
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
            touchAction: "none",
            background: emphasized
              ? "color-mix(in srgb, var(--color-bg-muted) 70%, var(--color-bg-white))"
              : "transparent",
            transition: dragging ? "none" : "background 140ms ease",
            borderRadius: "8px 8px 0 0",
          }}
        >
          {/* Six-dot grip — signals the panel is movable */}
          <Box
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              paddingTop: 6,
              paddingBottom: 2,
            }}
            aria-hidden
          >
            <IconGripHorizontal
              size={16}
              stroke={1.5}
              style={{
                color: emphasized ? "var(--color-text-secondary)" : "var(--color-text-muted)",
                opacity: emphasized ? 0.9 : 0.55,
                transition: "opacity 140ms ease, color 140ms ease",
              }}
            />
          </Box>

          <Group
            justify="space-between"
            px={16}
            pb={12}
            pt={4}
            className="border-b border-[var(--color-border)]"
          >
            <Text fw={600} size="sm" lineClamp={2} style={{ flex: 1 }}>
              {marker.title}
            </Text>
            <CloseButton size="sm" onClick={onClose} data-no-drag />
          </Group>
        </Box>
      )}

      {/* Mobile header — swipe down to dismiss */}
      {isMobile && (
        <Box
          onPointerDown={handleSwipeDown}
          onPointerMove={handleSwipeMove}
          onPointerUp={handleSwipeEnd}
          onPointerCancel={handleSwipeEnd}
          style={{ touchAction: "none", cursor: "grab" }}
        >
          <Box py={8} style={{ display: "flex", justifyContent: "center" }}>
            <Box
              style={{
                width: 36,
                height: 4,
                borderRadius: 999,
                background: "var(--color-border-dark)",
                opacity: 0.7,
              }}
            />
          </Box>
          <Group
            justify="space-between"
            px={16}
            pb={12}
            className="border-b border-[var(--color-border)]"
          >
            <Text fw={600} size="sm" lineClamp={2} style={{ flex: 1 }}>
              {marker.title}
            </Text>
            <CloseButton size="sm" onClick={onClose} data-no-drag />
          </Group>
        </Box>
      )}

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
