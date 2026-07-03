import { useTranslations } from "next-intl";
import { Box, Text, Stack, Checkbox, Group, Radio, Divider } from "@mantine/core";
import { IconLayersLinked } from "@tabler/icons-react";

export type DataView = "none" | "crisis" | "alert" | "event";

interface MapLayersPanelProps {
  dataView: DataView;
  onDataViewChange: (view: DataView) => void;
  showPopulation: boolean;
  onShowPopulationChange: (show: boolean) => void;
  showBoundaries: boolean;
  onShowBoundariesChange: (show: boolean) => void;
  showMarkers: boolean;
  onShowMarkersChange: (show: boolean) => void;
  showRoads: boolean;
  onShowRoadsChange: (show: boolean) => void;
  showSatellite: boolean;
  onShowSatelliteChange: (show: boolean) => void;
}

export function MapLayersPanel({
  dataView,
  onDataViewChange,
  showPopulation,
  onShowPopulationChange,
  showBoundaries,
  onShowBoundariesChange,
  showMarkers,
  onShowMarkersChange,
  showRoads,
  onShowRoadsChange,
  showSatellite,
  onShowSatelliteChange,
}: MapLayersPanelProps) {
  const t = useTranslations("map");
  return (
    <Box
      className="absolute z-10 bg-[var(--color-bg-white)] border border-[var(--color-border)]"
      style={{ top: 80, left: 16, width: 220 }} /* intentionally physical: map overlay */
    >
      <Group gap={8} px={12} py={10} className="border-b border-[var(--color-border)]">
        <IconLayersLinked size={14} color="#737373" />
        <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 10, letterSpacing: "0.05em" }}>
          {t("panels.layers")}
        </Text>
      </Group>

      <Stack gap={0} px={12} py={8}>
        {/* Data Layers Section */}
        <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={8}>
          {t("panels.dataLayers")}
        </Text>
        <Radio.Group value={dataView} onChange={(v) => onDataViewChange(v as DataView)}>
          <Stack gap={0}>
            {(["crisis", "alert", "event"] as const).map((view) => (
              <Group
                key={view}
                gap={8}
                py={6}
                px={4}
                className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
                onClick={() => onDataViewChange(view)}
                style={{ userSelect: "none" }}
              >
                <Radio
                  size="xs"
                  value={view}
                  styles={{ radio: { cursor: "pointer" } }}
                  onClick={(e) => e.stopPropagation()}
                />
                <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12, textTransform: "capitalize" }}>
                  {t(`dataViews.${view}`)}
                </Text>
              </Group>
            ))}
          </Stack>
        </Radio.Group>

        <Divider color="var(--color-border)" my={8} />

        {/* Boundaries & Markers Section */}
        <Group
          gap={8}
          py={6}
          px={4}
          className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
          onClick={() => onShowBoundariesChange(!showBoundaries)}
          style={{ userSelect: "none" }}
        >
          <Checkbox
            size="xs"
            checked={showBoundaries}
            onChange={(e) => onShowBoundariesChange(e.currentTarget.checked)}
            styles={{ input: { cursor: "pointer" } }}
            onClick={(e) => e.stopPropagation()}
          />
          <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
            {t("panels.boundaries")}
          </Text>
        </Group>

        <Group
          gap={8}
          py={6}
          px={4}
          className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
          onClick={() => onShowMarkersChange(!showMarkers)}
          style={{ userSelect: "none" }}
        >
          <Checkbox
            size="xs"
            checked={showMarkers}
            onChange={(e) => onShowMarkersChange(e.currentTarget.checked)}
            styles={{ input: { cursor: "pointer" } }}
            onClick={(e) => e.stopPropagation()}
          />
          <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
            {t("panels.markers")}
          </Text>
        </Group>

        <Group
          gap={8}
          py={6}
          px={4}
          className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
          onClick={() => onShowPopulationChange(!showPopulation)}
          style={{ userSelect: "none" }}
        >
          <Checkbox
            size="xs"
            checked={showPopulation}
            onChange={(e) => onShowPopulationChange(e.currentTarget.checked)}
            styles={{ input: { cursor: "pointer" } }}
            onClick={(e) => e.stopPropagation()}
          />
          <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
            {t("panels.population")}
          </Text>
        </Group>

        <Divider color="var(--color-border)" my={8} />

        {/* Base Map Section */}
        <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={8}>
          {t("panels.baseMap")}
        </Text>

        <Group
          gap={8}
          py={6}
          px={4}
          className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
          onClick={() => onShowRoadsChange(!showRoads)}
          style={{ userSelect: "none" }}
        >
          <Checkbox
            size="xs"
            checked={showRoads}
            onChange={(e) => onShowRoadsChange(e.currentTarget.checked)}
            styles={{ input: { cursor: "pointer" } }}
            onClick={(e) => e.stopPropagation()}
          />
          <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
            {t("panels.roads")}
          </Text>
        </Group>

        <Group
          gap={8}
          py={6}
          px={4}
          className="cursor-pointer hover:bg-[var(--color-bg-muted)] -mx-1"
          onClick={() => onShowSatelliteChange(!showSatellite)}
          style={{ userSelect: "none" }}
        >
          <Checkbox
            size="xs"
            checked={showSatellite}
            onChange={(e) => onShowSatelliteChange(e.currentTarget.checked)}
            styles={{ input: { cursor: "pointer" } }}
            onClick={(e) => e.stopPropagation()}
          />
          <Text size="xs" c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
            {t("panels.satellite")}
          </Text>
        </Group>
      </Stack>
    </Box>
  );
}
