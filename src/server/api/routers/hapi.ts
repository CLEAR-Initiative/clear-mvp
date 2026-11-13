import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import {
  internallyDisplaced,
  ipcPhase3Plus,
  mainAppeal,
  peopleInNeed,
  politicalViolence,
  refugeesHosted,
  type ConflictRow,
  type FundingRow,
  type IdpRow,
  type IpcRow,
  type NeedsRow,
  type RefugeeRow,
} from "~/server/api/hapi-country-figures";

const HAPI_BASE = "https://hapi.humdata.org/api/v2";
const HAPI_APP_ID = "Y2xlYXItbXZwOmRldkBzeW50cm8uZmk=";

interface HapiIdpRecord {
  admin1_name?: string;
  admin2_name?: string;
  population: number;
  operation: string;
  reference_period_start: string;
  reference_period_end: string;
  location_name: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One HAPI endpoint's rows, or null when the request fails. HAPI allows a
 * burst of about ten requests and then answers 429 to part of them, and one
 * country panel makes six, so rate-limited and server errors are retried
 * with backoff. Next caches only 200 responses, so a retry is a real request.
 */
async function hapiRows<T>(path: string, params: Record<string, string>): Promise<T[] | null> {
  const url = new URL(`${HAPI_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("output_format", "json");
  url.searchParams.set("limit", "10000");
  const ATTEMPTS = 4;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { "X-HDX-HAPI-APP-IDENTIFIER": HAPI_APP_ID },
        next: { revalidate: 21600 }, // 6h - sources update monthly at most
      } as RequestInit);
      if (res.ok) {
        const json = (await res.json()) as { data?: T[] };
        return json.data ?? [];
      }
      if (res.status !== 429 && res.status < 500) return null;
    } catch {
      // network error: retry
    }
    if (attempt < ATTEMPTS) await sleep(700 * attempt + Math.random() * 500);
  }
  return null;
}

export const hapiRouter = createTRPCRouter({
  /**
   * Headline humanitarian figures for one country (Overview world map). Each
   * figure is null when HAPI has no such data for the country; `failed` lists
   * the sources whose request failed, so the panel can say "unavailable"
   * rather than "no data". Signed-in only, so this is not an open proxy.
   */
  countryFigures: protectedProcedure
    .input(z.object({ iso3: z.string().regex(/^[A-Za-z]{3}$/) }))
    .query(async ({ input }) => {
      const iso3 = input.iso3.toUpperCase();
      const now = new Date();
      const year = now.getUTCFullYear();
      const threeMonthsAgo = new Date(Date.UTC(year, now.getUTCMonth() - 3, 1)).toISOString().slice(0, 10);

      const [needs, refugees, idps, funding, conflict, ipc] = await Promise.all([
        hapiRows<NeedsRow>("affected-people/humanitarian-needs", {
          location_code: iso3, admin_level: "0", sector_code: "Intersectoral", population_status: "INN",
        }),
        hapiRows<RefugeeRow>("affected-people/refugees-persons-of-concern", {
          asylum_location_code: iso3, gender: "all", age_range: "all", start_date: `${year - 3}-01-01`,
        }),
        hapiRows<IdpRow>("affected-people/idps", {
          location_code: iso3, admin_level: "0", start_date: `${year - 2}-01-01`,
        }),
        hapiRows<FundingRow>("coordination-context/funding", { location_code: iso3 }),
        hapiRows<ConflictRow>("coordination-context/conflict-events", {
          location_code: iso3, event_type: "political_violence", start_date: threeMonthsAgo,
        }),
        hapiRows<IpcRow>("food-security-nutrition-poverty/food-security", {
          location_code: iso3, admin_level: "0", ipc_phase: "3+", ipc_type: "current",
        }),
      ]);

      const failed = Object.entries({ needs, refugees, idps, funding, conflict, ipc })
        .filter(([, rows]) => rows === null)
        .map(([source]) => source);

      return {
        iso3,
        peopleInNeed: needs ? peopleInNeed(needs) : null,
        refugeesHosted: refugees ? refugeesHosted(refugees) : null,
        internallyDisplaced: idps ? internallyDisplaced(idps) : null,
        appeal: funding ? mainAppeal(funding, year) : null,
        politicalViolence: conflict ? politicalViolence(conflict, now) : null,
        ipcPhase3Plus: ipc ? ipcPhase3Plus(ipc) : null,
        failed,
      };
    }),

  getIdpTrend: publicProcedure
    .input(z.object({ locationCode: z.string().length(3) }))
    .query(async ({ input }) => {
      // CRITICAL: must use admin_level=0 to get national totals.
      // Without this param, HAPI returns admin_level=2 (locality) records
      // which are geographically incomplete and must never be summed as national.
      //
      // For Sudan (SDN), HAPI returns ~157 records at admin_level=0 across 4 operations:
      //   - "Armed Clashes in Sudan (Overview)" -- monthly national, Aug 2023-Dec 2025 (USE THIS)
      //   - "Armed Clashes in Sudan" -- bi-weekly, Apr 2023-Apr 2024 (overlaps, skip)
      //   - "Armed Clashes in Sudan (Monthly)" -- partial, skip
      //   - "Darfur conflict" -- historical 2010-2022 (can use for pre-war baseline)
      //
      // IMPORTANT DATA LIMITATION:
      // This figure covers CONFLICT-induced displacement only.
      // Flood and disaster displacement for Sudan is NOT tracked in HAPI/DTM.
      // Sudan experiences major annual flooding (e.g. 2024 floods displaced ~300K+)
      // but IOM DTM Sudan does not submit disaster displacement data to HDX.
      // Total displacement is therefore higher than this figure suggests.
      // Source for disaster displacement: IDMC (NRC's own monitoring centre).
      // TODO: integrate IDMC disaster displacement data when API access is available.

      const url = new URL(`${HAPI_BASE}/affected-people/idps`);
      url.searchParams.set("location_code", input.locationCode.toUpperCase());
      url.searchParams.set("admin_level", "0");
      url.searchParams.set("output_format", "json");
      url.searchParams.set("limit", "500");

      const res = await fetch(url.toString(), {
        headers: { "X-HDX-HAPI-APP-IDENTIFIER": HAPI_APP_ID },
        next: { revalidate: 3600 },
      } as RequestInit);

      if (!res.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `HAPI request failed: ${res.status}`,
        });
      }

      const json = await res.json() as { data?: HapiIdpRecord[] };
      const records: HapiIdpRecord[] = json.data ?? [];

      if (records.length === 0) {
        // No data for this country in HAPI/DTM.
        // Known gaps: Somalia (SOM) has ~4M IDPs per UNHCR but zero DTM records in HAPI.
        // Coverage depends entirely on whether IOM has an active DTM operation there.
        return { available: false as const, locationCode: input.locationCode };
      }

      // Prefer the "Overview" series for monthly national totals.
      // Fall back to any available operation if Overview is not present.
      const overviewRecords = records.filter((r) => r.operation.includes("Overview"));
      const series = overviewRecords.length > 0 ? overviewRecords : records;

      const sorted = [...series].sort(
        (a, b) =>
          new Date(a.reference_period_end).getTime() -
          new Date(b.reference_period_end).getTime(),
      );

      // Deduplicate by month (take the last record per calendar month)
      const byMonth = new Map<string, HapiIdpRecord>();
      for (const r of sorted) {
        const month = r.reference_period_end.slice(0, 7);
        byMonth.set(month, r);
      }

      const trend = Array.from(byMonth.values())
        .slice(-12)
        .map((r) => ({
          date: r.reference_period_end.slice(0, 7),
          value: r.population,
        }));

      const latest = trend[trend.length - 1];
      const previous = trend[trend.length - 2];
      const delta = previous && latest ? latest.value - previous.value : null;
      const operations = [...new Set(series.map((r) => r.operation))];
      const locationName = sorted[sorted.length - 1]?.location_name ?? input.locationCode;
      const lastUpdated = sorted[sorted.length - 1]?.reference_period_end ?? "";

      // NOTE: admin_level=1 (state breakdown) exists for Sudan but only covers
      // 4 of 18 states: Khartoum, North Darfur, South Darfur, West Darfur.
      // Summing admin_level=1 records gives ~4.2M vs the 9.1M national admin_level=0 figure.
      // Never sum admin1 rows to derive a national total -- the admin1 data is a
      // partial geographic subset (DTM monitoring footprint), not a full decomposition.

      return {
        available: true as const,
        locationCode: input.locationCode,
        current: latest?.value ?? 0,
        lastUpdated,
        delta,
        trend,
        operations,
        locationName,
      };
    }),
});
