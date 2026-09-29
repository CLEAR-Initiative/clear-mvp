"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, SimpleGrid, Stack, Text } from "@mantine/core";
import { compactNumber } from "~/server/api/mappers/situation-analysis";
import type { Analysis } from "~/server/api/mappers/analysis";
import type { AnalysisFigure, AnalysisFigures } from "~/server/api/routers/analysis";
import { fundingSplit, kpiValues } from "~/lib/analysis-view";

const INK = "var(--color-text-primary)";
const MUTED_BAR = "var(--color-border-dark)";

function KpiCard({ label, children, footer }: { label: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Box
      p={20}
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-white)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Text fw={700} tt="uppercase" c="var(--color-text-secondary)" style={{ fontSize: 11, letterSpacing: "0.08em" }}>
        {label}
      </Text>
      <Box style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>{children}</Box>
      {footer && (
        <Box pt={10} style={{ borderTop: "1px solid var(--color-border)" }}>
          {footer}
        </Box>
      )}
    </Box>
  );
}

function Headline({ value, suffix, sub }: { value: string; suffix?: string; sub?: string }) {
  return (
    <Box>
      <Text c={INK} style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.1 }}>
        {value}
        {suffix && (
          <Text span c="var(--color-text-secondary)" style={{ fontSize: 15, fontWeight: 500 }}>
            {" "}
            {suffix}
          </Text>
        )}
      </Text>
      {sub && (
        <Text c="var(--color-text-secondary)" mt={4} style={{ fontSize: 13, lineHeight: 1.45 }}>
          {sub}
        </Text>
      )}
    </Box>
  );
}

/** Uppercase subsection label with a divider above, as in the wireframe. */
function Subsection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box pt={14} style={{ borderTop: "1px solid var(--color-border)" }}>
      <Text fw={700} tt="uppercase" c="var(--color-text-secondary)" mb={10} style={{ fontSize: 10, letterSpacing: "0.08em" }}>
        {label}
      </Text>
      {children}
    </Box>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <Text c="var(--color-text-muted)" style={{ fontSize: 12, lineHeight: 1.45 }}>
      {children}
    </Text>
  );
}

function Legend({ color, label, value, share }: { color: string; label: string; value: string; share?: string }) {
  return (
    <Box style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
      <Box style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
      <Text span c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
        {label}
      </Text>
      <Text span fw={700} c={INK} style={{ fontSize: 12 }}>
        {value}
      </Text>
      {share && (
        <Text span c="var(--color-text-muted)" style={{ fontSize: 12 }}>
          {share}
        </Text>
      )}
    </Box>
  );
}

/** Two-part horizontal split bar. */
function SplitBar({ first, second }: { first: number; second: number }) {
  const total = first + second;
  const a = total > 0 ? (first / total) * 100 : 0;
  return (
    <Box style={{ display: "flex", height: 10, gap: 2 }}>
      <Box style={{ width: `${a}%`, background: INK }} />
      <Box style={{ flex: 1, background: MUTED_BAR }} />
    </Box>
  );
}

/** Low–high band on a 0..max track with a tick at the headline value. */
function RangeBar({ figure }: { figure: AnalysisFigure }) {
  const max = Math.max(figure.high ?? figure.value, figure.value) * 1.05;
  const pct = (n: number) => `${(n / max) * 100}%`;
  const low = figure.low ?? figure.value;
  const high = figure.high ?? figure.value;
  return (
    <Box style={{ position: "relative", height: 10, background: "var(--color-bg-muted)" }}>
      <Box style={{ position: "absolute", insetInlineStart: pct(low), width: `calc(${pct(high)} - ${pct(low)})`, top: 0, bottom: 0, background: MUTED_BAR }} />
      <Box style={{ position: "absolute", insetInlineStart: pct(figure.value), top: -3, bottom: -3, width: 3, background: INK }} />
    </Box>
  );
}

function SectorBars({ rows, of }: { rows: { label: string; value: number }[]; of: number }) {
  return (
    <Stack gap={8}>
      {rows.map((r) => (
        <Box key={r.label} style={{ display: "grid", gridTemplateColumns: "minmax(90px, 1fr) 1.2fr auto", alignItems: "center", gap: 10 }}>
          <Text c={INK} style={{ fontSize: 13 }}>
            {r.label}
          </Text>
          <Box style={{ height: 8, background: "var(--color-bg-muted)" }}>
            <Box style={{ width: `${Math.min(r.value / of, 1) * 100}%`, height: "100%", background: "var(--color-text-secondary)" }} />
          </Box>
          <Text fw={700} c={INK} style={{ fontSize: 13, textAlign: "end" }}>
            {compactNumber(r.value)}
          </Text>
        </Box>
      ))}
    </Stack>
  );
}

function latest(...dates: (string | null | undefined)[]): string | null {
  const ds = dates.filter((d): d is string => !!d).sort();
  return ds.at(-1) ?? null;
}

/**
 * Displaced, In need and Funding with their breakdowns. Stock figures come
 * from the scope's all-time aggregation (`figures`, the latest value per
 * field); the analysis datapoints are the fallback. Funding reads only the
 * analysis window: the all-time tier sums funding across years.
 */
export function AnalysisKpis({
  data,
  figures,
  scopeName,
}: {
  data: Analysis;
  figures: AnalysisFigures | undefined;
  scopeName: string;
}) {
  const t = useTranslations("analysis.kpis");
  const format = useFormatter();
  const pct = (n: number) => format.number(n, { style: "percent" });
  const date = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric" }) : null;

  const { inside, abroad, displacedTotal, returned, inNeed: pin, fundingReceived: received, fundingRequired: required } =
    kpiValues(data, figures);

  // ── Displaced ──
  const displacedDate = latest(figures?.idpStock?.newestAt, figures?.refugees?.newestAt) ?? data.crisis.freshestSourceAt;

  // ── In need ──
  const hasBand = !!pin && pin.low != null && pin.high != null && pin.high > pin.low;
  const sectorRows = (figures?.pinBySector ?? []).map((r) => ({ label: t(`sectors.${r.sector}`), value: r.figure.value }));
  const pinDate = latest(figures?.overallPin?.newestAt, ...(figures?.pinBySector ?? []).map((r) => r.figure.newestAt)) ?? data.crisis.freshestSourceAt;

  // ── Funding ──
  const split = fundingSplit(received, required);

  const footer = (d: string | null, note?: string) =>
    d || note ? (
      <Muted>
        {d && t("asOf", { date: date(d)! })}
        {d && note ? " · " : ""}
        {note}
      </Muted>
    ) : undefined;

  return (
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing={16} mb={24}>
      <KpiCard
        label={t("displaced")}
        footer={footer(displacedDate, abroad != null && inside != null ? t("differentDates") : undefined)}
      >
        {displacedTotal != null ? (
          <>
            <Headline
              value={compactNumber(displacedTotal)}
              sub={abroad != null ? t("displacedTotalSub", { scope: scopeName }) : t("displacedSub")}
            />
            {inside != null && abroad != null && (
              <Box>
                <SplitBar first={inside} second={abroad} />
                <Box mt={8} style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                  <Legend color={INK} label={t("inside", { scope: scopeName })} value={compactNumber(inside)} share={pct(inside / displacedTotal)} />
                  <Legend color={MUTED_BAR} label={t("abroad")} value={compactNumber(abroad)} share={pct(abroad / displacedTotal)} />
                </Box>
              </Box>
            )}
          </>
        ) : (
          <Muted>{t("notReported")}</Muted>
        )}
        {returned != null && (
          <Subsection label={t("returned")}>
            <Box style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <Text c={INK} style={{ fontSize: 22, fontWeight: 700 }}>
                {compactNumber(returned)}
              </Text>
              <Muted>{t("returnedSub")}</Muted>
            </Box>
          </Subsection>
        )}
      </KpiCard>

      <KpiCard label={t("inNeed")} footer={footer(pinDate)}>
        {pin ? (
          <>
            <Headline value={compactNumber(pin.value)} sub={t("inNeedSub")} />
            {hasBand && (
              <Box>
                <RangeBar figure={pin} />
                <Box mt={8} style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                  <Legend
                    color={MUTED_BAR}
                    label={t("rangeLabel")}
                    value={`${compactNumber(pin.low!)} – ${compactNumber(pin.high!)}`}
                  />
                  <Legend color={INK} label={t("headline")} value={compactNumber(pin.value)} />
                </Box>
              </Box>
            )}
          </>
        ) : (
          <Muted>{t("notReported")}</Muted>
        )}
        {sectorRows.length > 0 && (
          <Subsection label={t("bySector")}>
            <SectorBars rows={sectorRows} of={Math.max(pin?.value ?? 0, ...sectorRows.map((r) => r.value))} />
            <Box mt={10}>
              <Muted>{t("sectorOverlap", { total: pin ? compactNumber(pin.value) : "" })}</Muted>
            </Box>
          </Subsection>
        )}
      </KpiCard>

      <KpiCard label={t("funding")} footer={footer(data.crisis.freshestSourceAt)}>
        {received != null ? (
          <Headline
            value={`$${compactNumber(received)}`}
            suffix={required != null ? t("fundingOf", { required: `$${compactNumber(required)}` }) : undefined}
            sub={t("fundingSub")}
          />
        ) : required != null ? (
          <Headline value={`$${compactNumber(required)}`} sub={t("fundingRequiredSub")} />
        ) : (
          <Muted>{t("notReported")}</Muted>
        )}
        {split && (
          <Box>
            <SplitBar first={split.receivedShare} second={split.gapShare} />
            <Box mt={8} style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
              <Legend color={INK} label={t("received")} value={`$${compactNumber(received!)}`} share={pct(split.receivedShare)} />
              <Legend color={MUTED_BAR} label={t("gap")} value={`$${compactNumber(split.gap)}`} share={pct(split.gapShare)} />
            </Box>
          </Box>
        )}
      </KpiCard>
    </SimpleGrid>
  );
}
