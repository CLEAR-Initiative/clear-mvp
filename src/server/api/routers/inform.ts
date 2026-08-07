import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { shortCountryName } from "~/lib/constants/country-config";

/* ========== Shared ========== */

const COUNTRY_ISO3: Record<string, string> = {
  Sudan: "SDN",
  Ethiopia: "ETH",
  "South Sudan": "SSD",
  Somalia: "SOM",
  Yemen: "YEM",
  Afghanistan: "AFG",
  Ukraine: "UKR",
  Iraq: "IRQ",
  Syria: "SYR",
  Colombia: "COL",
  Venezuela: "VEN",
};

/**
 * Callers pass whatever `locations` stores, which is the COD name
 * ("Venezuela (Bolivarian Republic of)"). Strip the qualifier before the
 * lookup so a country is not silently dropped for having a long name.
 */
function iso3For(country: string): string | undefined {
  return COUNTRY_ISO3[country] ?? COUNTRY_ISO3[shortCountryName(country)];
}

interface AcapsRecord {
  crisis_id: string;
  crisis_name: string;
  country_level: string;
  individual_aggregated: string;
  iso3: string[];
  drivers: string[];
  "INFORM Severity Index": number;
  "INFORM Severity category": string;
  "INFORM Severity category (numeric)": number;
  Reliability: string;
  "Impact of the crisis": number;
  "Conditions of affected people": number;
  Complexity: number;
  "Last updated": string;
}

interface AcapsPage {
  count: number;
  results: AcapsRecord[];
}

function currentMonthSlug(): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  return `${months[now.getMonth()]}${now.getFullYear()}`;
}

/* ========== JRC INFORM Risk ========== */

const JRC_BASE = "https://drmkc.jrc.ec.europa.eu/Inform-Index/API/InformAPI";

// nodelevel: higher = more aggregated. Scale observed in live data:
//   0        = raw source indicators (original units, e.g. 777k drought-affected)
//   1–2      = first-level normalised calculations
//   3–9      = meaningful sub-composite indexes ← what we display
//   14–16    = pillar-level aggregates (HA.NAT=15, HA/VU/CC=16)
//   17       = final INFORM composite
// We keep nodelevel 3–9 with Unit "0-10" to get actionable sub-indexes.
const COMPOSITE_IDS = new Set(["INFORM", "HA", "VU", "CC"]);

// Curated display names, applied in priority order over the raw API labels.
// Needed because:
//  (a) Several IDs in the Scores endpoint are legacy (pre-rename) and absent from
//      /indicators/Index - their IndicatorName field is wrong (e.g. HA.VECT = "Human").
//  (b) /indicators/Index has typos ("Phisical") for some entries.
//  (c) Some verbose descriptions are shortened for display.
const INDICATOR_DISPLAY_NAMES: Record<string, string> = {
  // Legacy IDs (not in /indicators/Index) - matched to HA.EPI.* equivalents
  "HA.VECT":    "Vector-borne Disease",
  "HA.FWB":     "Food & Water Security",
  "HA.ZOON":    "Zoonotic Disease",
  "HA.P2P":     "Population Exposure",
  "HA.NAT.EPI": "Epidemic Hazard",
  // Fix JRC typos in /indicators/Index
  "CC.INF.AHC": "Access to Health Care",
  "CC.INF.PHY": "Physical Infrastructure",
  // Shorter / more readable than /indicators/Index verbose descriptions
  "HA.HUM":     "Conflict & Human Hazard",
  "HA.NAT.FL":  "River Floods",
  "HA.NAT.DR":  "Droughts",
  "HA.NAT.EQ":  "Earthquakes",
  "HA.NAT.TC":  "Cyclones",
  "HA.NAT.TS":  "Tsunamis",
  "HA.NAT.CFL": "Coastal Floods",
  "VU.VGR.UP":  "Uprooted People",
  "VU.SEV.PD":  "Development & Deprivation",
  "VU.SEV.AD":  "Aid Dependency",
  "VU.SEV.INQ": "Inequality",
  "VU.VGR":     "Vulnerable Groups",
  "CC.INS":     "Institutional Capacity",
  "CC.INF":     "Infrastructure Capacity",
};

interface JrcWorkflow {
  WorkflowId: number;
  Name: string;         // NB: field is "Name", not "WorkflowName"
  WorkflowDate: string;
}

interface JrcScoreRecord {
  IndicatorId: string;
  IndicatorName: string;
  IndicatorScore: number;
  nodelevel: number;    // NB: lowercase - as returned by the API
  Unit: string;
}

interface JrcIndicatorMeta {
  IndicatorId: string;
  IndicatorDescription: string;
}

async function getLatestWorkflowId(): Promise<{ id: number; name: string }> {
  const res = await fetch(`${JRC_BASE}/workflows/GetBySystem?id=INFORM`, {
    next: { revalidate: 604800 }, // 7 days - new editions release 1-2x/year
  });
  if (!res.ok) throw new Error(`JRC workflows fetch failed: ${res.status}`);
  const workflows = (await res.json()) as JrcWorkflow[];
  const latest = workflows.sort(
    (a, b) => new Date(b.WorkflowDate).getTime() - new Date(a.WorkflowDate).getTime(),
  )[0];
  if (!latest) throw new Error("No INFORM workflows returned");
  return { id: latest.WorkflowId, name: latest.Name };
}

async function fetchRiskScores(workflowId: number, iso3: string): Promise<JrcScoreRecord[]> {
  const res = await fetch(`${JRC_BASE}/countries/Scores?workflowid=${workflowId}&iso3=${iso3}`, {
    next: { revalidate: 86400 }, // 24h - scores are annual
  });
  if (!res.ok) throw new Error(`JRC scores fetch failed: ${res.status}`);
  return (await res.json()) as JrcScoreRecord[];
}

// Fetches the full indicator catalogue from /indicators/Index for proper descriptions.
// Returns a Map<IndicatorId, IndicatorDescription>. Fails gracefully (returns empty map).
async function fetchIndicatorMeta(): Promise<Map<string, string>> {
  try {
    const res = await fetch(`${JRC_BASE}/indicators/Index`, {
      next: { revalidate: 2592000 }, // 30 days - metadata rarely changes
    });
    if (!res.ok) return new Map();
    const data = (await res.json()) as JrcIndicatorMeta[];
    return new Map(
      data
        .filter((d) => d.IndicatorDescription?.trim())
        .map((d) => [d.IndicatorId, d.IndicatorDescription]),
    );
  } catch {
    return new Map();
  }
}

// Name resolution priority:
//   1. Our curated overrides (fixes wrong labels and typos)
//   2. /indicators/Index IndicatorDescription (authoritative catalogue)
//   3. Scores endpoint IndicatorName (often correct but sometimes wrong)
//   4. null (filtered out downstream)
function resolveIndicatorName(
  id: string,
  apiName: string,
  metaMap: Map<string, string>,
): string | null {
  return (
    INDICATOR_DISPLAY_NAMES[id] ??
    metaMap.get(id) ??
    (apiName.trim() !== "" ? apiName : null)
  );
}

export const informRouter = createTRPCRouter({
  getSeverity: publicProcedure
    .input(z.object({ country: z.string() }))
    .query(async ({ input }) => {
      const iso3 = iso3For(input.country);
      if (!iso3) return null;

      const token = process.env.ACAPS_API_TOKEN;
      if (!token) throw new Error("ACAPS_API_TOKEN not configured");

      const url = `https://api.acaps.org/api/v1/inform-severity-index/${currentMonthSlug()}/?iso3=${iso3}`;
      const res = await fetch(url, {
        headers: { Authorization: `Token ${token}` },
        next: { revalidate: 43200 }, // 12h - data updates monthly
      });

      if (!res.ok) return null;

      const data = (await res.json()) as AcapsPage;
      const records = data.results ?? [];

      // Prefer aggregated country-level record; fall back to any country-level individual
      const best =
        records.find((r) => r.individual_aggregated === "Aggregated" && r.country_level === "Yes") ??
        records.find((r) => r.country_level === "Yes") ??
        records[0] ??
        null;

      if (!best) return null;

      return {
        score: best["INFORM Severity Index"],
        category: best["INFORM Severity category"],
        categoryNumeric: best["INFORM Severity category (numeric)"],
        crisisName: best.crisis_name,
        reliability: best.Reliability,
        impact: best["Impact of the crisis"],
        conditions: best["Conditions of affected people"],
        complexity: best.Complexity,
        drivers: best.drivers,
        lastUpdated: best["Last updated"],
        iso3,
        month: currentMonthSlug(),
      };
    }),

  getRisk: publicProcedure
    .input(z.object({ country: z.string() }))
    .query(async ({ input }) => {
      const iso3 = iso3For(input.country);
      if (!iso3) return null;

      const { id: workflowId, name: edition } = await getLatestWorkflowId();

      // Fetch scores and indicator metadata in parallel
      const [scores, metaMap] = await Promise.all([
        fetchRiskScores(workflowId, iso3),
        fetchIndicatorMeta(),
      ]);

      const find = (id: string) =>
        scores.find((s) => s.IndicatorId === id)?.IndicatorScore ?? null;

      const indicators = scores
        .filter(
          (s) =>
            s.Unit === "0-10" &&
            s.nodelevel >= 3 &&
            s.nodelevel < 10 &&
            !COMPOSITE_IDS.has(s.IndicatorId),
        )
        .map((s) => {
          const pillar = s.IndicatorId.split(".")[0] ?? "";
          const name = resolveIndicatorName(s.IndicatorId, s.IndicatorName, metaMap);
          return {
            id: s.IndicatorId,
            name,
            score: s.IndicatorScore,
            pillar: (["HA", "VU", "CC"].includes(pillar) ? pillar : null) as "HA" | "VU" | "CC" | null,
          };
        })
        .filter((s): s is typeof s & { name: string } => s.name !== null)
        .sort((a, b) => b.score - a.score)
        // Deduplicate by resolved name - keeps highest-scoring entry
        .filter((item, idx, arr) => arr.findIndex((x) => x.name === item.name) === idx);

      return {
        score: find("INFORM"),
        pillars: {
          hazard: find("HA"),
          vulnerability: find("VU"),
          coping: find("CC"),
        },
        indicators, // full sorted list - slice top-N on the client
        iso3,
        workflowId,
        edition,
      };
    }),
});
