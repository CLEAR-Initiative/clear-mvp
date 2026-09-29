"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Box, SimpleGrid, Text, Tooltip } from "@mantine/core";
import { IconTimeline } from "@tabler/icons-react";
import { severityColor } from "~/lib/types/graphql";
import { timelineLayout } from "~/lib/analysis-view";
import type { AnalysisEvent } from "~/server/api/routers/analysis";
import { CollapsibleSection } from "./collapsible-section";

/**
 * Horizontal month axis from the analysis window start to today, one dot per
 * event. For sub-national scopes only: at country level the event volume
 * makes a timeline noise.
 */
export function EventsTimeline({
  events,
  totalCount,
  start,
}: {
  events: AnalysisEvent[];
  totalCount: number;
  start: string;
}) {
  const t = useTranslations("analysis");
  const format = useFormatter();
  const layout = useMemo(() => timelineLayout(events, new Date(start), new Date()), [events, start]);
  const day = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short" });

  return (
    <CollapsibleSection
      icon={IconTimeline}
      title={t("timeline.title")}
      meta={t("map.areaEvents", { count: totalCount })}
      testId="analysis-section-timeline"
    >
      <Box p={20}>
        {layout.dots.length === 0 ? (
          <Text c="var(--color-text-muted)" style={{ fontSize: 13 }}>
            {t("timeline.empty")}
          </Text>
        ) : (
          <>
            {totalCount > events.length && (
              <Text c="var(--color-text-muted)" mb={10} style={{ fontSize: 12 }}>
                {t("timeline.sample", { count: events.length })}
              </Text>
            )}
            {/* The axis is a chart: it reads left-to-right in every locale. */}
            <Box dir="ltr" style={{ position: "relative", height: 56, marginInline: 8 }} data-testid="analysis-timeline">
              <Box style={{ position: "absolute", left: 0, right: 0, top: 18, height: 1, background: "var(--color-border-dark)" }} />
              {layout.months.map((m) => (
                <Text
                  key={m.label.toISOString()}
                  c="var(--color-text-muted)"
                  style={{ position: "absolute", left: `${m.x * 100}%`, top: 30, fontSize: 11, transform: "translateX(-50%)" }}
                >
                  {format.dateTime(m.label, { month: "short" })}
                </Text>
              ))}
              <Text
                c="var(--color-accent)"
                fw={600}
                style={{ position: "absolute", right: 0, top: 30, fontSize: 11 }}
              >
                {t("timeline.today")}
              </Text>
              {layout.dots.map(({ event, x }) => (
                <Tooltip
                  key={event.id}
                  label={`${day(event.startedAt)} · ${event.title ?? t("events.untitled")}`}
                  withArrow
                  multiline
                  w={260}
                >
                  <Link
                    href={`/event/${event.id}`}
                    aria-label={event.title ?? t("events.untitled")}
                    style={{
                      position: "absolute",
                      left: `${x * 100}%`,
                      top: 13,
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      transform: "translateX(-50%)",
                      background: severityColor(event.severity),
                      border: "2px solid var(--color-bg-white)",
                    }}
                  />
                </Tooltip>
              ))}
            </Box>

            {layout.highlights.length > 0 && (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing={12} mt={16}>
                {layout.highlights.map(({ event }) => (
                  <Box
                    key={event.id}
                    component={Link}
                    href={`/event/${event.id}`}
                    p={12}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderInlineStart: `3px solid ${severityColor(event.severity)}`,
                      textDecoration: "none",
                    }}
                  >
                    <Text fw={700} tt="uppercase" c="var(--color-text-secondary)" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
                      {day(event.startedAt)}
                      {event.locationName ? ` · ${event.locationName}` : ""}
                    </Text>
                    <Text c="var(--color-text-primary)" mt={4} lineClamp={3} style={{ fontSize: 13, lineHeight: 1.45 }}>
                      {event.title ?? t("events.untitled")}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </>
        )}
      </Box>
    </CollapsibleSection>
  );
}
