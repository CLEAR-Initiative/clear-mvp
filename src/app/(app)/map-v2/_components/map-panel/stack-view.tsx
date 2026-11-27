"use client";

import { Box, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SeverityTag } from "~/containers/map/layers/detections/severity-tag";
import { SEVERITY_TOKENS } from "~/containers/map/layers/detections/severity-tokens";
import { useDetectionsForMap } from "~/containers/map/hooks/use-detections-for-map";
import { useTimeframeQuery } from "~/containers/map/hooks/use-timeframe";
import type { DetectionKind, LngLatPoint } from "~/containers/map/selection";
import { useLocations } from "~/hooks/use-locations";
import { BidiTitle } from "~/components/ui/bidi-title";
import { reportHandledError } from "~/lib/report-handled-error";
import { mapSeverity } from "~/lib/types/graphql";
import { PanelTop } from "./panel-nav";
import { PanelLoader } from "./panel-loader";
import classes from "./panel-views.module.css";
import { usePeekTitle } from "./sheet-context";
import { placeRampLabels } from "./ramp-labels";
import {
  commonLocationName,
  detectionsAtPoint,
  severityCounts,
  sortStackItems,
  stackPeriod,
  type SeverityCount,
} from "./detection-stack";

const TEXT_PRIMARY = "var(--color-text-primary)";
const TEXT_SECONDARY = "var(--color-text-secondary)";
/** A row title's line height; the severity badge is centred on a box this tall to sit on the first line. */
const ROW_LINE_PX = 15;
/** Centred on the line box the badge looks high, as most of the title is lowercase; this lowers it to the text. */
const BADGE_NUDGE = "1.5px";

type StackViewProps = {
  kind: DetectionKind;
  point: LngLatPoint;
  onOpen: (id: string) => void;
  onBack: () => void;
};

/** The labels under the severity bar, each placed under its segment without overlapping the others. */
function useRampLabelPositions(counts: SeverityCount[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [lefts, setLefts] = useState<number[]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const place = () => {
      const widths = counts.map((_, i) => labelRefs.current[i]?.offsetWidth ?? 0);
      setLefts(placeRampLabels(counts.map(({ count }) => count), widths, container.clientWidth));
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(container);
    return () => observer.disconnect();
  }, [counts]);

  return { containerRef, labelRefs, lefts };
}

function SeverityMix({ counts }: { counts: SeverityCount[] }) {
  const t = useTranslations("mapV2.panel.stack");
  const { containerRef, labelRefs, lefts } = useRampLabelPositions(counts);

  return (
    <Stack gap={2} pt={4}>
      <div className={classes.ramp} aria-hidden>
        {counts.map(({ bucket, count }) => (
          <span key={bucket} style={{ flexGrow: count, background: `var(${SEVERITY_TOKENS[bucket]})` }} />
        ))}
      </div>
      <div ref={containerRef} className={classes.rampLabels}>
        {counts.map(({ bucket, count }, i) => (
          <Text
            key={bucket}
            ref={(element: HTMLSpanElement | null) => {
              labelRefs.current[i] = element;
            }}
            component="span"
            fz={10}
            lh="16px"
            c={TEXT_SECONDARY}
            className={classes.rampLabel}
            style={{ left: lefts[i] ?? 0, visibility: lefts.length === counts.length ? undefined : "hidden" }}
          >
            {t(`severityCount.${bucket}`, { count })}
          </Text>
        ))}
      </div>
    </Stack>
  );
}

/** The list of what a selected stack holds: signals, events or alerts, as the map shows. */
export function StackView({ kind, point, onOpen, onBack }: StackViewProps) {
  const t = useTranslations("mapV2.panel.stack");
  const tKind = useTranslations(`mapV2.panel.stack.${kind}`);
  const tDetail = useTranslations("mapV2.panel.detail");
  const tSignal = useTranslations("mapV2.signalTooltip");
  const format = useFormatter();
  const now = useNow();
  const range = useTimeframeQuery();
  const query = useDetectionsForMap(kind);
  const { locationById } = useLocations();

  const items = useMemo(() => sortStackItems(detectionsAtPoint(query.data ?? [], point)), [query.data, point]);
  const counts = useMemo(() => severityCounts(items), [items]);
  const location = useMemo(() => commonLocationName(items, locationById), [items, locationById]);
  const period = stackPeriod(range, now);
  const untitled = kind === "signal" ? tSignal("untitled") : tDetail("untitledEvent");
  const title = query.isPending ? tKind("titlePending") : tKind("title", { count: items.length });
  usePeekTitle(title);

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2", stage: `${kind}-stack` });
  }, [query.error, kind]);

  const dates =
    period.kind === "range"
      ? {
          from: format.dateTime(period.from, { dateStyle: "medium" }),
          to: format.dateTime(period.to, { dateStyle: "medium" }),
        }
      : null;
  let intro: string;
  if (period.kind === "lastDays") {
    intro = location
      ? tKind("intro.lastDays", { days: period.days, location })
      : tKind("intro.lastDaysNoLocation", { days: period.days });
  } else {
    intro = location ? tKind("intro.range", { ...dates, location }) : tKind("intro.rangeNoLocation", { ...dates });
  }

  let body: React.ReactNode;
  if (query.isPending) {
    body = <PanelLoader label={tKind("loading")} />;
  } else if (query.isError) {
    body = (
      <Text fz={14} c={TEXT_SECONDARY}>
        {tKind("error")}
      </Text>
    );
  } else if (items.length === 0) {
    body = (
      <Text fz={14} c={TEXT_SECONDARY}>
        {tKind("empty")}
      </Text>
    );
  } else {
    body = (
      <Stack gap={16}>
        <Text fz={14} lh={1.2} c={TEXT_PRIMARY}>
          {intro}
        </Text>
        <SeverityMix counts={counts} />
        <Stack gap={8} py={8}>
          <Group justify="space-between" aria-hidden>
            <Text component="span" fz={12} tt="uppercase" opacity={0.8} c={TEXT_PRIMARY}>
              {tKind("column")}
            </Text>
            <Text component="span" fz={12} tt="uppercase" opacity={0.8} c={TEXT_PRIMARY}>
              {t("severityColumn")}
            </Text>
          </Group>
          <Stack component="ul" gap={4} m={0} p={0} className={classes.rows}>
            {items.map((item) => (
              <li key={item.id}>
                <UnstyledButton className={classes.row} onClick={() => onOpen(item.id)}>
                  <Group gap={24} align="flex-start" wrap="nowrap" py={2}>
                    <Text
                      component="span"
                      fz={12}
                      fw={600}
                      lh={`${ROW_LINE_PX}px`}
                      opacity={0.8}
                      c={TEXT_PRIMARY}
                      className={classes.rowTitle}
                    >
                      <BidiTitle>{item.title ?? untitled}</BidiTitle>
                    </Text>
                    <Box component="span" h={ROW_LINE_PX} mt={BADGE_NUDGE} className={classes.rowTag}>
                      <SeverityTag severity={mapSeverity(item.severity)} />
                    </Box>
                  </Group>
                </UnstyledButton>
              </li>
            ))}
          </Stack>
        </Stack>
      </Stack>
    );
  }

  return (
    <section aria-labelledby="map-panel-stack-title">
      <PanelTop back={{ to: "layers", onBack }} point={point}>
        <Title id="map-panel-stack-title" order={2} fz={20} fw={700} lh={1.2} lts={-0.2} py={12} c={TEXT_PRIMARY}>
          {title}
        </Title>
      </PanelTop>
      {/* With the top's 10px bottom padding, the 24px the list always had under the title. */}
      <Box px={24} pt={14} pb={24}>
        {body}
      </Box>
    </section>
  );
}
