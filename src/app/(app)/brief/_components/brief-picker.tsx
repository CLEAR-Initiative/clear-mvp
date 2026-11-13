"use client";

import { useTranslations } from "next-intl";
import { Box, Stack } from "@mantine/core";
import { FilterBar, RegionPicker } from "~/components/ui";
import type { Brief } from "~/lib/brief/types";
import { HistoryTab } from "../../detection/_components/history-tab";
import { DetectionFilterPopover } from "../../detection/_components/detection-filter-popover";
import { useDetectionFilters } from "../../detection/_hooks/use-detection-filters";
import { useHistoryFeed } from "../../detection/_hooks/use-history-feed";
import type { BriefItemsApi } from "../_hooks/use-brief-items";
import { rowPreviewTarget, type PreviewTarget } from "../_lib/preview-target";
import { BriefDateFilter } from "./brief-date-filter";

/** Where /brief keeps its list filters, apart from /detection's. */
export const BRIEF_FILTERS_STORAGE_KEY = "brief-filters";

const NO_SOURCES: string[] = [];

/**
 * The right half of the composer: Detection's History list (Alerts, Events
 * and Signals merged) with its filters, starting on the Brief's area and
 * window, and a checkbox on every row that picks it into the Brief.
 */
export function BriefPicker({
  brief,
  items,
  onPreview,
}: {
  brief: Brief;
  items: BriefItemsApi;
  onPreview: (target: PreviewTarget) => void;
}) {
  const t = useTranslations("detection");
  const readOnly = brief.status === "sent";
  const filters = useDetectionFilters({
    initial: { locationId: brief.locationId, from: brief.windowStart, to: brief.windowEnd },
    persistKey: BRIEF_FILTERS_STORAGE_KEY,
  });
  // The Brief is about an area, not a team: the list is scoped by the area
  // alone, the same scope as the Brief's counts.
  const feed = useHistoryFeed(
    { ...filters.filter, teamId: undefined },
    { enabled: filters.locationsReady, resetKey: filters.filterKey },
  );

  return (
    <Stack gap={12} data-testid="brief-picker">
      <FilterBar
        country={filters.country}
        onCountryChange={filters.onCountryChange}
        countries={filters.countryOptions}
        regionsContent={
          <RegionPicker
            states={filters.regionStates}
            value={filters.regionId}
            onChange={filters.onRegionChange}
            label={t("filters.region")}
          />
        }
      >
        <BriefDateFilter filters={filters} windowStart={brief.windowStart} windowEnd={brief.windowEnd} />
        <DetectionFilterPopover
          severities={filters.severities}
          onSeveritiesChange={filters.setSeverities}
          typeFilters={filters.typeFilters}
          onTypeFiltersChange={filters.setTypeFilters}
          hierarchy={filters.hierarchy}
          // The History list filters sources itself; the popover's would do nothing here.
          sourceOptions={NO_SOURCES}
          sources={filters.sources}
          onSourcesChange={filters.setSources}
        />
      </FilterBar>
      <Box>
        <HistoryTab
          {...feed}
          selection={readOnly ? undefined : { selectedKeys: items.pickedKeys, onToggle: items.toggle }}
          onOpenRow={(row) => onPreview(rowPreviewTarget(row))}
        />
      </Box>
    </Stack>
  );
}
