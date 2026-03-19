import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
};

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

export const informRouter = createTRPCRouter({
  getSeverity: publicProcedure
    .input(z.object({ country: z.string() }))
    .query(async ({ input }) => {
      const iso3 = COUNTRY_ISO3[input.country];
      if (!iso3) return null;

      const token = process.env.ACAPS_API_TOKEN;
      if (!token) throw new Error("ACAPS_API_TOKEN not configured");

      const url = `https://api.acaps.org/api/v1/inform-severity-index/${currentMonthSlug()}/?iso3=${iso3}`;
      const res = await fetch(url, {
        headers: { Authorization: `Token ${token}` },
        next: { revalidate: 43200 }, // 12h — data updates monthly
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
});
