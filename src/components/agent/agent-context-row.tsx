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
import { narrowingFilters } from "~/lib/agent-current-view";
import { navItemForRoute } from "~/lib/nav-routes";
import { useOptionalTeam } from "~/providers/team-provider";

const ENTITY_ICONS = { event: IconBolt, signal: IconAntenna, crisis: IconAlertOctagon } as const;

export function AgentContextRow() {
  const t = useTranslations("agent.context");
  const tNav = useTranslations("nav.items");
  const view = useShownCurrentView();
  const team = useOptionalTeam()?.activeTeam ?? null;
  if (!view) return null;

  const section = navItemForRoute(view.route);
  const entity = view.entity;
  const filters = narrowingFilters(view.filters);

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
