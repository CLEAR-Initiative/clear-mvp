import { useRef, useState, type PointerEvent } from "react";
import { Box, CloseButton, Group, Text } from "@mantine/core";
import { IconGripHorizontal } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { BidiTitle } from "~/components/ui/bidi-title";

interface DragState {
  pointerId: number;
  originX: number;
  originY: number;
  startOffsetX: number;
  startOffsetY: number;
}

interface MapMarkerPanelHeaderProps {
  title: string;
  titleId?: string;
  x: number;
  y: number;
  onMove: (x: number, y: number) => void;
  onClose: () => void;
  onActivate?: () => void;
  onDragChange?: (dragging: boolean) => void;
  onHoverChange?: (hovered: boolean) => void;
}

/** Desktop: drag chrome — grip + title row. */
export function MapMarkerPanelHeader({
  title, titleId, x, y, onMove, onClose, onActivate, onDragChange, onHoverChange,
}: MapMarkerPanelHeaderProps) {
  const t = useTranslations("common.actions");
  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragState] = useState(false);
  const [hovered, setHoverState] = useState(false);
  const emphasized = dragging || hovered;

  function setDragging(value: boolean) {
    setDragState(value);
    onDragChange?.(value);
  }

  function setHovered(value: boolean) {
    setHoverState(value);
    onHoverChange?.(value);
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    // Desktop-only drag; ignore secondary buttons and interactive controls.
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, a, input, [data-no-drag]")) return;

    onActivate?.();

    dragRef.current = {
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      startOffsetX: x,
      startOffsetY: y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const nextX = drag.startOffsetX + (e.clientX - drag.originX);
    const nextY = drag.startOffsetY + (e.clientY - drag.originY);
    onMove(nextX, nextY);
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  return (
    <Box
      data-testid="map-marker-panel-grip"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        <Text id={titleId} fw={600} size="sm" lineClamp={2} style={{ flex: 1 }}>
          <BidiTitle>{title}</BidiTitle>
        </Text>
        <CloseButton size="sm" aria-label={t("close")} onClick={onClose} data-no-drag />
      </Group>
    </Box>
  );
}
