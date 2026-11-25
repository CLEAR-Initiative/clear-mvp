"use client";

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { ActionIcon, Button, Group, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { MapMarkerPanelHeader } from "~/app/(app)/map/_components/map-marker-panel-header";
import type { PanelGeometry } from "~/app/(app)/map/_components/map-panel-connectors";
import { clampToParent, PANEL_MARGIN, placeDetectionPreview } from "~/app/(app)/map/_components/map-panel-placement";
import type { MarkerScreenPoint } from "~/components/map/crisis-map";
import { SeverityBadge } from "~/components/ui";
import { useAgentCurrentView } from "~/lib/agent-current-view";
import type { FeedItem } from "../../_lib/detection-model";
import css from "./detection-marker-preview.module.css";

interface PreviewProps {
  item: FeedItem;
  cardRef: RefObject<HTMLElement | null>;
  /** Undefined while the map is finding the selected marker or its cluster. */
  anchor?: MarkerScreenPoint | null;
  hasMarker: boolean;
  timelineOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  navigationPosition?: string;
  onGeometryChange?: (geometry: PanelGeometry | null) => void;
}

export function DetectionMarkerPreview({
  item, cardRef, anchor, hasMarker, timelineOpen, onClose, onPrev, onNext, navigationPosition, onGeometryChange,
}: PreviewProps) {
  const titleId = useId();
  const t = useTranslations();
  const format = useFormatter();
  const areaRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<{
    x: number; y: number;
    area: { width: number; height: number };
    card: { width: number; height: number };
  } | null>(null);
  const openingItem = useRef({ id: item.id, kind: item.kind });
  const isOpeningItem = item.id === openingItem.current.id && item.kind === openingItem.current.kind;
  const [fixed, setFixed] = useState<Pick<PanelGeometry, "left" | "top" | "height"> | null>(null);

  // The Agent's context row describes the same record as View details. An
  // alert opens its event, so pass the event's id rather than the alert id.
  useAgentCurrentView({
    entity: { kind: item.eventId ? "event" : "signal", id: item.eventId ?? item.id, label: item.title },
  });

  useLayoutEffect(() => {
    const area = areaRef.current;
    const card = cardRef.current;
    if (!area || !card) return;
    const measure = () => setBounds({
      x: area.offsetLeft, y: area.offsetTop,
      area: { width: area.clientWidth, height: area.clientHeight },
      card: { width: card.offsetWidth, height: card.offsetHeight },
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    observer.observe(card);
    return () => observer.disconnect();
  }, [cardRef]);

  let position = { left: PANEL_MARGIN, top: PANEL_MARGIN };
  if (bounds) {
    const pin = isOpeningItem && anchor ? { x: anchor.x - bounds.x, y: anchor.y - bounds.y } : null;
    position = fixed
      ? clampToParent(fixed.left, fixed.top, { width: bounds.card.width, height: fixed.height }, bounds.area)
      : placeDetectionPreview(pin, bounds.area, bounds.card);
  }
  const { left, top } = position;

  // Place once, after the first marker or cluster resolves. Keep the card and
  // its navigation buttons stationary and focused as the analyst browses.
  useLayoutEffect(() => {
    if (!bounds || fixed || (isOpeningItem && hasMarker && anchor === undefined)) return;
    setFixed({ left, top, height: bounds.card.height });
  }, [bounds, fixed, isOpeningItem, hasMarker, anchor, left, top]);

  useLayoutEffect(() => {
    if (bounds) onGeometryChange?.({ left: bounds.x + left, top: bounds.y + top, ...bounds.card });
  }, [bounds, left, top, onGeometryChange]);
  useLayoutEffect(() => () => onGeometryChange?.(null), [onGeometryChange]);

  const nav = item.kind === "signal" ? "signalDetail.nav" : "eventDetail.nav";
  const dateLabel = item.kind === "signal" ? "published" : "activity";
  const timestamp = Date.parse(item.lastAt);

  return (
    <div ref={areaRef} className={css.area} data-timeline-open={timelineOpen}>
      <section
        ref={cardRef}
        className={css.card}
        style={{ left, top, "--preview-top": `${top}px` } as CSSProperties}
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="detection-marker-preview"
      >
        <MapMarkerPanelHeader
          title={item.title}
          titleId={titleId}
          x={position.left}
          y={position.top}
          onMove={(x, y) => {
            if (bounds) setFixed({ ...clampToParent(x, y, bounds.card, bounds.area), height: bounds.card.height });
          }}
          onClose={onClose}
        />
        <div className={css.body}>
          <Group gap={6}>
            <SeverityBadge severity={item.severity} label={t(`map.severities.${item.severity}`)} />
            {item.source && <Text component="span" size="xs" dir="auto">{item.source}</Text>}
          </Group>
          {item.place && <Text size="xs" dir="auto">{item.place}</Text>}
          {Number.isFinite(timestamp) && (
            <Text size="xs">
              {t(`detection.mapFirst.time.${dateLabel}`)} · <time dateTime={item.lastAt}>{format.dateTime(timestamp, { dateStyle: "medium", timeStyle: "short" })}</time>
            </Text>
          )}
          {item.description && item.description !== item.title && <Text size="sm" lineClamp={3} dir="auto">{item.description}</Text>}
          {!hasMarker && <Text size="xs">{t("detection.mapFirst.noMapPoint")}</Text>}
        </div>
        <footer className={css.footer}>
          {navigationPosition && (
            <Group gap={2} wrap="nowrap">
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t(`${nav}.previous`)} disabled={!onPrev} onClick={onPrev}>
                <IconChevronLeft size={16} />
              </ActionIcon>
              <Text size="xs">{navigationPosition}</Text>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t(`${nav}.next`)} disabled={!onNext} onClick={onNext}>
                <IconChevronRight size={16} />
              </ActionIcon>
            </Group>
          )}
          <Button component={Link} href={item.href} prefetch={false} size="compact-xs" color="accent">
            {t("map.detail.viewDetails")}
          </Button>
        </footer>
      </section>
    </div>
  );
}
