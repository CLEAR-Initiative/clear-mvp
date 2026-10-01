"use client";

/**
 * The Agent drawer's context row: the Current view the next turn will send,
 * by name — the team, the app section, the Event/Signal/Crisis on screen and
 * the filters. Read-only: it changes when what the user is looking at
 * changes. Hidden while no Current view is sent at all.
 */

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge, Group, Text, Tooltip } from "@mantine/core";
import {
  IconAlertOctagon,
  IconAntenna,
  IconBolt,
  IconBuilding,
  IconFilter,
  IconLayoutDashboard,
} from "@tabler/icons-react";
import { useShownCurrentView } from "~/components/agent/use-shown-current-view";
import { sectionOf } from "~/lib/agent-current-view";
import type {
  CurrentViewFilterKey,
  CurrentViewFilters,
  CurrentViewFilterValue,
} from "~/lib/agent-current-view-contract";
import { useOptionalTeam } from "~/providers/team-provider";

/** App sections with a name in the nav, by their first path segment. */
const SECTIONS: Record<string, "overview" | "detection" | "inbox" | "map" | "insights" | "operations" | "cash" | "knowledge"> = {
  dashboard: "overview",
  detection: "detection",
  inbox: "inbox",
  map: "map",
  insights: "insights",
  operations: "operations",
  cash: "cash",
  knowledge: "knowledge",
};

const ENTITY_ICONS = { event: IconBolt, signal: IconAntenna, crisis: IconAlertOctagon } as const;

/** Filter keys shown as filters: the team has its own chip, and the sort isn't a filter. */
type ShownFilterKey = Exclude<CurrentViewFilterKey, "teamId" | "orderBy">;

/** Filters that narrow what is shown, leaving out "any" (null or empty). */
function shownFilters(filters: CurrentViewFilters | undefined): Array<[ShownFilterKey, CurrentViewFilterValue]> {
  return Object.entries(filters ?? {}).filter(
    (entry): entry is [ShownFilterKey, CurrentViewFilterValue] => {
      const [key, value] = entry;
      if (key === "teamId" || key === "orderBy") return false;
      if (value === null || value === undefined || value === "") return false;
      return !Array.isArray(value) || value.length > 0;
    },
  );
}

export function AgentContextRow() {
  const t = useTranslations("agent.context");
  const tNav = useTranslations("nav.items");
  const view = useShownCurrentView();
  const team = useOptionalTeam()?.activeTeam ?? null;
  if (!view) return null;

  const section = SECTIONS[sectionOf(view.route)];
  const entity = view.entity;
  const filters = shownFilters(view.filters);

  const chips: ReactNode[] = [];
  if (team) chips.push(<ContextChip key="team" icon={<IconBuilding size={12} />} label={team.name} />);
  if (section) chips.push(<ContextChip key="page" icon={<IconLayoutDashboard size={12} />} label={tNav(section)} />);
  if (entity) {
    const Icon = ENTITY_ICONS[entity.kind];
    chips.push(
      <ContextChip
        key="entity"
        icon={<Icon size={12} />}
        label={entity.label ?? t(`kinds.${entity.kind}`)}
        tooltip={entity.label ? t(`kinds.${entity.kind}`) : undefined}
      />,
    );
  }
  if (filters.length > 0) {
    chips.push(
      <ContextChip
        key="filters"
        icon={<IconFilter size={12} />}
        label={t("filters", { count: filters.length })}
        // Names only: the values are codes and ids, not something to read.
        tooltip={filters.map(([key]) => t(`filterKeys.${key}`)).join(", ")}
      />,
    );
  }
  if (chips.length === 0) return null;

  return (
    <Group
      gap={6}
      px={16}
      py={8}
      data-testid="agent-context"
      style={{ borderBottom: "1px solid var(--color-border)", flexShrink: 0, background: "var(--color-bg-muted)" }}
    >
      <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.06em" }} me={4}>
        {t("label")}
      </Text>
      {chips}
    </Group>
  );
}

function ContextChip({ icon, label, tooltip }: { icon: ReactNode; label: string; tooltip?: ReactNode }) {
  const chip = (
    <Badge
      variant="default"
      radius="xl"
      size="lg"
      tt="none"
      fw={500}
      leftSection={icon}
      maw={240}
      styles={{ label: { overflow: "hidden", textOverflow: "ellipsis" } }}
    >
      {label}
    </Badge>
  );
  return tooltip ? (
    <Tooltip label={tooltip} multiline maw={280}>
      {chip}
    </Tooltip>
  ) : (
    chip
  );
}
