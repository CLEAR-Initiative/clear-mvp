/**
 * National headline figures for one country from HDX HAPI rows. Pure, so
 * the rules that keep the numbers honest are unit-tested: national rows
 * only, totals rather than breakdowns, the latest period, and no category
 * counted twice. Each returns null when the country has no such data.
 */

export interface DatedFigure {
  value: number;
  /** End of the reference period, ISO date (YYYY-MM-DD). */
  asOf: string;
}

type Period = { reference_period_start: string; reference_period_end: string };

const day = (iso: string) => iso.slice(0, 10);

function latestBy<T extends Period>(rows: readonly T[]): T | undefined {
  return rows.reduce<T | undefined>(
    (best, r) => (!best || r.reference_period_end > best.reference_period_end ? r : best),
    undefined,
  );
}

export interface NeedsRow extends Period {
  admin_level: number;
  sector_code: string;
  category: string | null;
  population_status: string;
  population: number | null;
}

/** People in need: national, intersectoral, the total row, latest plan year. */
export function peopleInNeed(rows: readonly NeedsRow[]): DatedFigure | null {
  const total = rows.filter(
    (r) =>
      r.admin_level === 0 &&
      r.sector_code === "Intersectoral" &&
      r.population_status === "INN" &&
      (r.category ?? "") === "" &&
      r.population !== null,
  );
  const latest = latestBy(total);
  return latest ? { value: latest.population!, asOf: day(latest.reference_period_end) } : null;
}

export interface RefugeeRow extends Period {
  population_group: string;
  gender: string;
  age_range: string;
  population: number;
}

/**
 * People the country hosts who need international protection: refugees,
 * asylum seekers and others in need of international protection (OIP, e.g.
 * Venezuelans in Colombia), as UNHCR's own headline counts them. UNHCR
 * totals (not the gender or age splits), summed over origins, latest year.
 * Palestine refugees fall under UNRWA, not UNHCR, so they are not here.
 */
const PROTECTION_GROUPS = new Set(["REF", "ASY", "OIP"]);

export function refugeesHosted(rows: readonly RefugeeRow[]): DatedFigure | null {
  const totals = rows.filter(
    (r) =>
      PROTECTION_GROUPS.has(r.population_group) &&
      r.gender === "all" &&
      r.age_range === "all",
  );
  const latest = latestBy(totals);
  if (!latest) return null;
  const value = totals
    .filter((r) => r.reference_period_end === latest.reference_period_end)
    .reduce((sum, r) => sum + r.population, 0);
  return { value, asOf: day(latest.reference_period_end) };
}

export interface IdpRow extends Period {
  admin_level: number;
  operation: string;
  population: number;
}

/**
 * Internally displaced people: the latest national figure. Operations can
 * overlap, so one series is read, never a sum across them: the "Overview"
 * series when there is one, else the series with the most recent figure.
 */
export function internallyDisplaced(rows: readonly IdpRow[]): DatedFigure | null {
  const national = rows.filter((r) => r.admin_level === 0);
  const overview = national.filter((r) => r.operation.includes("Overview"));
  const pool = overview.length > 0 ? overview : national;
  const latest = latestBy(pool);
  if (!latest) return null;
  const series = pool.filter((r) => r.operation === latest.operation);
  const pick = latestBy(series)!;
  return { value: pick.population, asOf: day(pick.reference_period_end) };
}

export interface FundingRow extends Period {
  appeal_name: string;
  appeal_type: string;
  requirements_usd: number | null;
  funding_usd: number | null;
  funding_pct: number | null;
}

export interface Appeal {
  name: string;
  year: number;
  requirementsUsd: number;
  fundingUsd: number | null;
  fundingPct: number | null;
}

/**
 * The country's main appeal: the most recent year up to `year` that has one,
 * and in that year the appeal with the largest requirement.
 */
export function mainAppeal(rows: readonly FundingRow[], year: number): Appeal | null {
  const withRequirement = rows
    .map((r) => ({ r, year: Number(r.reference_period_start.slice(0, 4)) }))
    .filter(({ r, year: y }) => r.requirements_usd !== null && r.requirements_usd > 0 && y <= year);
  if (withRequirement.length === 0) return null;
  const latestYear = Math.max(...withRequirement.map((x) => x.year));
  const best = withRequirement
    .filter((x) => x.year === latestYear)
    .reduce((a, b) => (b.r.requirements_usd! > a.r.requirements_usd! ? b : a));
  return {
    name: best.r.appeal_name,
    year: latestYear,
    requirementsUsd: best.r.requirements_usd!,
    fundingUsd: best.r.funding_usd,
    fundingPct: best.r.funding_pct,
  };
}

export interface ConflictRow extends Period {
  event_type: string;
  events: number | null;
  fatalities: number | null;
}

export interface MonthlyConflict {
  /** YYYY-MM of the last complete month. */
  month: string;
  events: number;
  fatalities: number;
}

/**
 * ACLED political violence in the last complete month, summed over
 * districts. Civilian targeting is a subset of political violence and
 * demonstrations are not violence, so neither is added.
 */
export function politicalViolence(rows: readonly ConflictRow[], now: Date): MonthlyConflict | null {
  const nowIso = now.toISOString();
  const complete = rows.filter(
    (r) => r.event_type === "political_violence" && r.reference_period_end < nowIso,
  );
  const latest = latestBy(complete);
  if (!latest) return null;
  const month = latest.reference_period_start.slice(0, 7);
  const inMonth = complete.filter((r) => r.reference_period_start.slice(0, 7) === month);
  return {
    month,
    events: inMonth.reduce((s, r) => s + (r.events ?? 0), 0),
    fatalities: inMonth.reduce((s, r) => s + (r.fatalities ?? 0), 0),
  };
}

export interface IpcRow extends Period {
  admin_level: number;
  ipc_phase: string;
  ipc_type: string;
  population_in_phase: number;
  population_fraction_in_phase: number | null;
}

export interface IpcFigure extends DatedFigure {
  /** Share of the analysed population, 0 to 1. */
  fraction: number | null;
  /** Start of the analysis period (YYYY-MM-DD); a current period can end in the future. */
  from: string;
}

/** People in IPC phase 3 or worse: national, current analysis, latest. */
export function ipcPhase3Plus(rows: readonly IpcRow[]): IpcFigure | null {
  const latest = latestBy(
    rows.filter((r) => r.admin_level === 0 && r.ipc_phase === "3+" && r.ipc_type === "current"),
  );
  return latest
    ? {
        value: latest.population_in_phase,
        fraction: latest.population_fraction_in_phase,
        from: day(latest.reference_period_start),
        asOf: day(latest.reference_period_end),
      }
    : null;
}
