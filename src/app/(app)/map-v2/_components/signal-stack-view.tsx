"use client";

import { Box, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SeverityTag } from "~/containers/map/layers/signals/severity-tag";
import { SEVERITY_TOKENS } from "~/containers/map/layers/signals/severity-tokens";
import { signalsAtPoint } from "~/containers/map/layers/signals/stack";
import { useSignalsWindow } from "~/containers/map/layers/signals/use-signals-window";
import type { LngLatPoint } from "~/containers/map/selection";
import { useLocations } from "~/hooks/use-locations";
import { reportHandledError } from "~/lib/report-handled-error";
import { mapSeverity } from "~/lib/types/graphql";
import { api } from "~/trpc/react";
import { BackLink } from "./back-link";
import { PanelLoader } from "./panel-loader";
import classes from "./panel-views.module.css";
import { placeRampLabels } from "./ramp-labels";
import { commonLocationName, severityCounts, sortStackSignals, stackPeriod, type SeverityCount } from "./signal-stack";

const TEXT_PRIMARY = "var(--color-text-primary)";
const TEXT_SECONDARY = "var(--color-text-secondary)";
/** A row title's line height; the severity badge is centred on a box this tall to sit on the first line. */
const ROW_LINE_PX = 15;
/** Centred on the line box the badge looks high, as most of the title is lowercase; this lowers it to the text. */
const BADGE_NUDGE = "1.5px";

type SignalStackViewProps = {
  point: LngLatPoint;
  onOpenSignal: (id: string) => void;
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

export function SignalStackView({ point, onOpenSignal, onBack }: SignalStackViewProps) {
  const t = useTranslations("mapV2.panel.stack");
  const tSignal = useTranslations("mapV2.signalTooltip");
  const format = useFormatter();
  const now = useNow();
  // The same range and query as the map's signals layer, so it reads from the same cache.
  const range = useSignalsWindow();
  const query = api.signals.forMap.useQuery({ ...range, includeDummy: true }, { placeholderData: (prev) => prev });
  const { locationById } = useLocations();

  const signals = useMemo(() => sortStackSignals(signalsAtPoint(query.data ?? [], point)), [query.data, point]);
  const counts = useMemo(() => severityCounts(signals), [signals]);
  const location = useMemo(() => commonLocationName(signals, locationById), [signals, locationById]);
  const period = stackPeriod(range, now);

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2", stage: "signal-stack" });
  }, [query.error]);

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
      ? t("intro.lastDays", { days: period.days, location })
      : t("intro.lastDaysNoLocation", { days: period.days });
  } else {
    intro = location ? t("intro.range", { ...dates, location }) : t("intro.rangeNoLocation", { ...dates });
  }

  let body: React.ReactNode;
  if (query.isPending) {
    body = <PanelLoader label={t("loading")} />;
  } else if (query.isError) {
    body = (
      <Text fz={14} c={TEXT_SECONDARY}>
        {t("error")}
      </Text>
    );
  } else if (signals.length === 0) {
    body = (
      <Text fz={14} c={TEXT_SECONDARY}>
        {t("empty")}
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
              {t("columns.signal")}
            </Text>
            <Text component="span" fz={12} tt="uppercase" opacity={0.8} c={TEXT_PRIMARY}>
              {t("columns.severity")}
            </Text>
          </Group>
          <Stack component="ul" gap={4} m={0} p={0} className={classes.rows}>
            {signals.map((signal) => (
              <li key={signal.id}>
                <UnstyledButton className={classes.row} onClick={() => onOpenSignal(signal.id)}>
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
                      {signal.title ?? tSignal("untitled")}
                    </Text>
                    <Box component="span" h={ROW_LINE_PX} mt={BADGE_NUDGE} className={classes.rowTag}>
                      <SeverityTag severity={mapSeverity(signal.severity)} />
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
    <Stack component="section" gap={24} p={24} aria-labelledby="map-panel-stack-title">
      <Stack gap={24}>
        <BackLink to="layers" onBack={onBack} />
        <Title id="map-panel-stack-title" order={2} fz={20} fw={700} lh={1.2} lts={-0.2} py={12} c={TEXT_PRIMARY}>
          {query.isPending ? t("titlePending") : t("title", { count: signals.length })}
        </Title>
      </Stack>
      {body}
    </Stack>
  );
}
