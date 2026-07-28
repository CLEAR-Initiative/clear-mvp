"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Collapse, Group, Loader, Select, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight, IconHistory } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import {
  compactNumber,
  type SaStatKey,
  type SituationAnalysis,
} from "~/server/api/mappers/situation-analysis";

/**
 * "What changed since ..." - the numeric half.
 *
 * Uses the bitemporal read we already store: fetches the snapshot that was
 * current at a chosen past date (`asOf`) and diffs its datapoints against
 * today's. Only the NUMBERS are diffed here; a generated "what changed"
 * narrative is Phase 2 pipeline work. The prior read is lazy - it only fires
 * when the strip is expanded, so a collapsed strip costs nothing.
 *
 * Honest by construction: on a young history most periods have no prior
 * snapshot, and the strip says so rather than implying stability.
 */

const FIGURE_KEYS: SaStatKey[] = [
  "displaced",
  "affected",
  "inNeed",
  "returnees",
  "fundingRequired",
  "fundingReceived",
];

type PeriodKey = "1m" | "3m" | "yearStart";

/** ISO timestamp for the chosen comparison point. Date math is done off the
 *  current snapshot's generation time so the reference is deterministic. */
function asOfFor(period: PeriodKey, ref: Date): string {
  const d = new Date(ref);
  if (period === "1m") d.setUTCMonth(d.getUTCMonth() - 1);
  else if (period === "3m") d.setUTCMonth(d.getUTCMonth() - 3);
  else return new Date(Date.UTC(ref.getUTCFullYear(), 0, 1)).toISOString();
  return d.toISOString();
}

interface FigureDelta {
  key: SaStatKey;
  prev: number | null;
  curr: number | null;
}

export function SituationChanged({
  data,
  countryLocationId,
}: {
  data: SituationAnalysis;
  countryLocationId: string;
}) {
  const t = useTranslations("insights.situation");
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("1m");

  const asOf = useMemo(
    () => asOfFor(period, new Date(data.crisis.generatedAt)),
    [period, data.crisis.generatedAt],
  );

  const prior = api.situationAnalysis.get.useQuery(
    {
      countryLocationId,
      countryName: data.crisis.country,
      asOf,
    },
    { enabled: open, staleTime: 60 * 60 * 1000, retry: false },
  );

  // A prior row for the same bucket that is genuinely older than the current
  // one. asOf can resolve to the current row itself when nothing older exists;
  // that is "no prior snapshot", not a zero-change diff.
  const priorData = prior.data;
  const isSameRow =
    priorData != null && priorData.crisis.generatedAt === data.crisis.generatedAt;

  const deltas: FigureDelta[] = useMemo(() => {
    if (!priorData || isSameRow) return [];
    return FIGURE_KEYS.map((key) => ({
      key,
      prev: priorData.figures[key],
      curr: data.figures[key],
    })).filter((d) => d.prev !== d.curr && (d.prev != null || d.curr != null));
  }, [priorData, isSameRow, data.figures]);

  const periodLabel = t(`changed.periods.${period}`);

  return (
    <Box mt={12}>
      <UnstyledButton
        onClick={() => setOpen((v) => !v)}
        w="100%"
        px={14}
        py={11}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-muted)",
          borderRadius: open ? "10px 10px 0 0" : 10,
        }}
        aria-expanded={open}
      >
        <IconHistory size={17} color="var(--color-accent)" style={{ flexShrink: 0 }} />
        <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>
          {t("changed.label", { period: periodLabel })}
        </Text>
        <IconChevronRight
          size={16}
          color="var(--color-text-muted)"
          style={{
            marginLeft: "auto",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform .15s",
          }}
        />
      </UnstyledButton>

      <Collapse in={open}>
        <Box
          px={13}
          py={12}
          style={{
            border: "1px solid var(--color-border)",
            borderTop: 0,
            borderRadius: "0 0 10px 10px",
          }}
        >
          <Group gap={8} mb={10} align="center">
            <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
              {t("changed.compareTo")}
            </Text>
            <Select
              size="xs"
              w={150}
              value={period}
              onChange={(v) => setPeriod((v as PeriodKey) ?? "1m")}
              data={[
                { value: "1m", label: t("changed.periods.1m") },
                { value: "3m", label: t("changed.periods.3m") },
                { value: "yearStart", label: t("changed.periods.yearStart") },
              ]}
              allowDeselect={false}
            />
          </Group>

          {prior.isLoading && <Loader size="xs" />}

          {!prior.isLoading && (!priorData || isSameRow) && (
            <Text c="var(--color-text-muted)" style={{ fontSize: 12.5 }}>
              {t("changed.noPrior", { period: periodLabel })}
            </Text>
          )}

          {!prior.isLoading && priorData && !isSameRow && deltas.length === 0 && (
            <Text c="var(--color-text-muted)" style={{ fontSize: 12.5 }}>
              {t("changed.noChange")}
            </Text>
          )}

          {deltas.length > 0 && (
            <Box style={{ display: "grid", gap: 6 }}>
              {deltas.map((d) => (
                <DeltaRow key={d.key} label={t(`stats.${d.key}`)} delta={d} />
              ))}
              <Text mt={4} c="var(--color-text-muted)" style={{ fontSize: 10.5, fontFamily: "var(--mantine-font-family-monospace, monospace)" }}>
                {t("changed.numbersOnly")}
              </Text>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

function fmt(n: number | null): string {
  return n == null ? "-" : compactNumber(n);
}

function DeltaRow({ label, delta }: { label: string; delta: FigureDelta }) {
  const { prev, curr } = delta;
  const worse = prev != null && curr != null && curr > prev;
  const pct =
    prev != null && curr != null && prev !== 0
      ? Math.round(((curr - prev) / Math.abs(prev)) * 100)
      : null;

  return (
    <Group gap={8} wrap="nowrap" align="baseline">
      <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 12, minWidth: 120 }}>
        {label}
      </Text>
      <Text
        c="var(--color-text-secondary)"
        style={{ fontSize: 12, fontFamily: "var(--mantine-font-family-monospace, monospace)" }}
      >
        {fmt(prev)} → <b style={{ color: "var(--color-text-primary)" }}>{fmt(curr)}</b>
        {pct != null && (
          <Text
            component="span"
            ml={6}
            fw={700}
            style={{ fontSize: 11, color: worse ? "var(--color-critical)" : "var(--color-success)" }}
          >
            {pct > 0 ? "+" : ""}
            {pct}%
          </Text>
        )}
      </Text>
    </Group>
  );
}
