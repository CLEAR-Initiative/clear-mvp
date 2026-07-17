"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Box, Button, Group, Text } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";
import { mapFocusHref } from "~/lib/map-focus-href";
import { countryConfig } from "~/lib/constants/country-config";
import type { Situation } from "~/lib/situations";
import type { HeatmapPoint } from "~/components/map/crisis-map";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  {
    ssr: false,
    loading: () => (
      <Box w="100%" h="100%" style={{ background: "transparent" }} />
    ),
  },
);

interface OverviewGlobeProps {
  situations: Situation[];
  selectedCountry: string;
  hoveredEventId: string | null;
  onHover: (eventId: string | null) => void;
}

/**
 * Flatten situation event+signal heat points for the lava globe.
 * Weight folds attention + signal density; groupId drives hover morphing.
 */
function situationsToHeatmap(situations: Situation[]): HeatmapPoint[] {
  const scored = situations
    .map((s) => {
      const signalBoost = 1 + Math.min(s.signalCount, 12) * 0.08;
      const draftBoost = s.hasDraftAlert ? 1.15 : 1;
      const escBoost = s.isEscalating ? 1.2 : 1;
      return {
        s,
        raw: Math.max(0.15, s.attentionScore * signalBoost * draftBoost * escBoost),
      };
    })
    .filter(({ s }) => s.heatPoints.length > 0 || (s.lng != null && s.lat != null));

  if (scored.length === 0) return [];
  const max = Math.max(...scored.map((r) => r.raw), 0.01);

  const points: HeatmapPoint[] = [];
  for (const { s, raw } of scored) {
    const situationWeight = Math.max(0.2, Math.min(1, raw / max));
    const locals =
      s.heatPoints.length > 0
        ? s.heatPoints
        : s.lng != null && s.lat != null
          ? [{ lng: s.lng, lat: s.lat, weight: 1 }]
          : [];

    const localMax = Math.max(...locals.map((p) => p.weight), 0.01);
    for (const p of locals) {
      points.push({
        groupId: s.eventId,
        id: s.eventId,
        lng: p.lng,
        lat: p.lat,
        weight: situationWeight * (p.weight / localMax),
      });
    }
  }
  return points;
}

/**
 * Compact Operational Globe: sticky beside the queue.
 * Situations render as a lava-lamp heatmap (event + signal clusters).
 */
export function OverviewGlobe({
  situations,
  selectedCountry,
  hoveredEventId,
  onHover,
}: OverviewGlobeProps) {
  const t = useTranslations("dashboard.overviewGlobe");

  const heatmapPoints = useMemo(() => situationsToHeatmap(situations), [situations]);

  const center = countryConfig[selectedCountry]?.center ?? ([30, 15.5] as [number, number]);
  const zoom = 0.75;

  const focusMapHref = (() => {
    const hovered = situations.find((s) => s.eventId === hoveredEventId);
    if (hovered) return mapFocusHref("event", hovered.eventId);
    const first = situations.find((s) => s.lng != null);
    if (first) return mapFocusHref("event", first.eventId);
    return "/map";
  })();

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        background: "transparent",
      }}
    >
      <Group
        justify="space-between"
        align="center"
        gap={8}
        px={4}
        pb={10}
        style={{ flexShrink: 0 }}
      >
        <Text
          fw={700}
          tt="uppercase"
          style={{ fontSize: 12, letterSpacing: "0.1em", color: "var(--color-text-primary)" }}
        >
          {t("title")}
        </Text>
        <Button
          component={Link}
          href={focusMapHref}
          size="compact-xs"
          variant="default"
          leftSection={<IconMapPin size={12} />}
          styles={{
            root: {
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              background: "var(--color-bg-muted)",
              border: "none",
              color: "var(--color-text-secondary)",
            },
          }}
        >
          {t("openMap")}
        </Button>
      </Group>

      <Box
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          position: "relative",
          overflow: "visible",
          background: "transparent",
        }}
        onMouseLeave={() => onHover(null)}
      >
        <CrisisMap
          markers={[]}
          heatmapPoints={heatmapPoints}
          hoveredHeatmapId={hoveredEventId}
          center={center}
          zoom={zoom}
          className="w-full h-full"
          baseMapType="simple"
          projection="globe"
          showRoads={false}
          showBoundaries={false}
          showMarkers={false}
          clusterMarkers={false}
          showNavigationControl={false}
          fitBoundsOnFocus={false}
          canvasBackground="var(--color-bg-primary)"
        />
      </Box>
    </Box>
  );
}
