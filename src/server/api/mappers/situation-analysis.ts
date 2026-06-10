/**
 * Map the `clear_situation_analysis` LocationMetadata payload (produced by the
 * CLEAR-AutomatedAnalysis pipeline) into the `SituationAnalysis` shape the UI
 * consumes.
 *
 * The pipeline payload is the source of truth — see the `bundle_assembler` /
 * `generate_ui` modules in CLEAR-AutomatedAnalysis. Fields the SAF bundle does
 * not (yet) carry — context risks, hazards, active crises, per-sector
 * interventions — map to empty collections; the UI degrades by hiding those
 * sections rather than rendering placeholders.
 */

import type {
  SaSector,
  SaSeverity,
  SaSource,
  SaStat,
  SituationAnalysis,
} from "~/server/api/fixtures/situation-analysis";

/** Shape of the `data` JSON on a `clear_situation_analysis` metadata row. */
export interface SaPayloadRiskCell {
  top3_risks?: string[];
  highest_score?: number;
  severity_scale?: string;
}

type SaPillar = "Impact" | "At Risk" | "Humanitarian Conditions";

export interface SaPayload {
  summary?: string | null;
  generatedAt?: string;
  projectName?: string;
  shown_risks?: Partial<Record<SaPillar, Record<string, SaPayloadRiskCell>>>;
  final_numbers?: Array<{
    unit?: string;
    number?: number;
    what_happened?: string;
  }>;
  displacement_risks?: {
    Intentions?: string[];
    "Push Factors"?: string[];
  };
  top_sectoral_needs?: Record<string, string[]>;
  information_coverage?: {
    analysis?: Array<{
      pillar?: string;
      avg_coverage?: number;
      entries?: Array<{
        sector?: string;
        subpillar?: string;
        coverage?: number;
        gaps?: string[];
      }>;
    }>;
  };
  sources?: Array<{
    org?: string;
    link?: string | null;
    type?: string;
    title?: string;
    publishedDate?: string;
  }>;
}

/** Canonical two-letter sector codes; falls back to the first two letters. */
const SECTOR_CODES: Record<string, string> = {
  Agriculture: "AG",
  Education: "ED",
  "Food Security": "FS",
  Health: "HE",
  Livelihoods: "LH",
  Logistics: "LG",
  Nutrition: "NU",
  Protection: "PR",
  Shelter: "SH",
  WASH: "WA",
};

/** Pipeline severity strings → UI severity. Anything else is "not assessed". */
function toSeverity(scale: string | undefined): SaSeverity {
  switch (scale?.toUpperCase()) {
    case "CRITICAL":
      return "critical";
    case "SEVERE":
      return "severe";
    case "SERIOUS":
      return "serious";
    default:
      return null;
  }
}

function sectorCode(name: string): string {
  return SECTOR_CODES[name] ?? name.slice(0, 2).toUpperCase();
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Short human number: 4_596_230 → "4.6M". */
function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** ISO timestamp → "Jun 10, 2026" (UTC); empty string when unparseable. */
function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Pick the first `final_numbers` row whose `what_happened` matches a keyword. */
function statFor(
  rows: SaPayload["final_numbers"],
  keyword: string,
  label: string,
): SaStat | null {
  const row = rows?.find(
    (r) =>
      typeof r.number === "number" &&
      (r.what_happened ?? "").toLowerCase().includes(keyword),
  );
  if (!row || typeof row.number !== "number") return null;
  return { value: compactNumber(row.number), label };
}

/** Methodology sources are constants (not part of the per-location payload). */
const FRAMEWORK_SOURCES: SaSource[] = [
  {
    name: "NRC Situation Analysis Framework",
    type: "Methodology",
    link: "https://www.nrc.no",
    desc: "NRC's standardised framework for conducting humanitarian situation analyses across acute crisis contexts.",
  },
  {
    name: "CLEAR Automated Analysis",
    type: "AI Pipeline",
    link: "https://github.com/CLEAR-Initiative",
    desc: "Open-source media monitoring pipeline extracting structured humanitarian intelligence from news and field reports.",
  },
];

/** Build the sector list from `shown_risks`, enriched with needs & coverage. */
function mapSectors(payload: SaPayload): SaSector[] {
  const shown = payload.shown_risks ?? {};
  const impact = shown.Impact ?? {};
  const humanitarian = shown["Humanitarian Conditions"] ?? {};
  const atRisk = shown["At Risk"] ?? {};

  // Union of every sector named across the three pillars.
  const names = Array.from(
    new Set([
      ...Object.keys(impact),
      ...Object.keys(humanitarian),
      ...Object.keys(atRisk),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const needsBySector = payload.top_sectoral_needs ?? {};
  const coverageAnalysis = payload.information_coverage?.analysis ?? [];

  return names.map((name) => {
    const cell = (
      pillar: Record<string, SaPayloadRiskCell>,
    ): { level: Exclude<SaSeverity, null>; items: string[] } | null => {
      const c = pillar[name];
      const level = toSeverity(c?.severity_scale);
      if (!c || !level) return null;
      return { level, items: c.top3_risks ?? [] };
    };

    // Coverage cards: one per (pillar, subpillar) entry for this sector.
    const coverage = coverageAnalysis.flatMap((pillarBlock) =>
      (pillarBlock.entries ?? [])
        .filter((e) => e.sector === name)
        .map((e) => ({
          dim: e.subpillar
            ? `${pillarBlock.pillar ?? ""} · ${e.subpillar}`.replace(/^ · /, "")
            : (pillarBlock.pillar ?? ""),
          score: e.coverage ?? 0,
          items: e.gaps ?? [],
        })),
    );

    return {
      id: slug(name),
      code: sectorCode(name),
      name,
      impact: toSeverity(impact[name]?.severity_scale),
      humanitarian: toSeverity(humanitarian[name]?.severity_scale),
      atRisk: toSeverity(atRisk[name]?.severity_scale),
      assessment: {
        impact: cell(impact),
        humanitarian: cell(humanitarian),
        atRisk: cell(atRisk),
      },
      needs: needsBySector[name] ?? [],
      interventions: [], // not carried by the SAF bundle yet
      coverage,
    } satisfies SaSector;
  });
}

export function mapSituationAnalysis(
  payload: SaPayload,
  locationName: string,
): SituationAnalysis {
  const generatedAt = payload.generatedAt;
  const year = generatedAt
    ? new Date(generatedAt).getUTCFullYear()
    : undefined;

  return {
    dataSource: "live",
    crisis: {
      name: year ? `${locationName} Crisis ${year}` : `${locationName} Crisis`,
      country: locationName,
      flag: "",
      date: formatDate(generatedAt),
      framework: "SAF Framework",
      displaced:
        statFor(payload.final_numbers, "displac", "displaced persons") ?? {
          value: "—",
          label: "displaced persons",
        },
      affected:
        statFor(payload.final_numbers, "affect", "people") ?? {
          value: "—",
          label: "people affected",
        },
      summary: payload.summary ?? "",
    },

    // Not carried by the SAF bundle — the UI hides these sections when empty.
    contextRisks: [],
    hazards: { current: [], precrisis: [] },

    displacement: {
      push: payload.displacement_risks?.["Push Factors"] ?? [],
      return: payload.displacement_risks?.Intentions ?? [],
    },

    sectors: mapSectors(payload),

    activeCrises: [],

    sources: {
      primary: (payload.sources ?? []).map((s) => ({
        name: s.org ?? s.title ?? "Source",
        type: s.type ?? "Source",
        link: s.link ?? "",
        desc: s.title ?? "",
      })),
      framework: FRAMEWORK_SOURCES,
    },
  };
}
