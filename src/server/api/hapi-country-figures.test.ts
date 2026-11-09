import { describe, expect, it } from "vitest";
import {
  internallyDisplaced,
  ipcPhase3Plus,
  mainAppeal,
  peopleInNeed,
  politicalViolence,
  refugeesHosted,
} from "./hapi-country-figures";

const period = (start: string, end: string) => ({
  reference_period_start: `${start}T00:00:00`,
  reference_period_end: `${end}T23:59:59`,
});

describe("peopleInNeed", () => {
  const row = (year: number, population: number, category = "") => ({
    ...period(`${year}-01-01`, `${year}-12-31`),
    admin_level: 0,
    sector_code: "Intersectoral",
    population_status: "INN",
    category,
    population,
  });

  it("takes the latest plan year's total, not an age breakdown", () => {
    expect(
      peopleInNeed([row(2025, 30), row(2026, 34), row(2026, 12, "Children")]),
    ).toEqual({ value: 34, asOf: "2026-12-31" });
  });

  it("is null without a national total", () => {
    expect(peopleInNeed([row(2026, 12, "Adult")])).toBeNull();
  });
});

describe("refugeesHosted", () => {
  const row = (group: string, population: number, year = 2025, gender = "all") => ({
    ...period(`${year}-01-01`, `${year}-12-31`),
    population_group: group,
    gender,
    age_range: "all",
    population,
  });

  it("adds refugees, asylum seekers and others in need of protection over origins, latest year", () => {
    const rows = [
      row("REF", 100), row("REF", 50), row("ASY", 20), row("OIP", 1000),
      row("HST", 9999), row("OOC", 9999), row("REF", 7, 2025, "f"), row("REF", 500, 2024),
    ];
    expect(refugeesHosted(rows)).toEqual({ value: 1170, asOf: "2025-12-31" });
  });

  it("is null with no protection groups", () => {
    expect(refugeesHosted([row("HST", 5)])).toBeNull();
  });
});

describe("internallyDisplaced", () => {
  const row = (operation: string, end: string, population: number, admin_level = 0) => ({
    ...period(`${end.slice(0, 8)}01`, end),
    admin_level,
    operation,
    population,
  });

  it("reads the Overview series, never a sum of overlapping operations", () => {
    const rows = [
      row("Armed Clashes (Overview)", "2026-07-31", 9),
      row("Armed Clashes (Overview)", "2026-08-31", 8),
      row("Armed Clashes", "2026-09-30", 4),
      row("Armed Clashes (Overview)", "2026-09-30", 99, 1),
    ];
    expect(internallyDisplaced(rows)).toEqual({ value: 8, asOf: "2026-08-31" });
  });

  it("falls back to the most recent series", () => {
    expect(internallyDisplaced([row("A", "2026-01-31", 3), row("B", "2026-05-31", 5)])).toEqual({
      value: 5,
      asOf: "2026-05-31",
    });
  });
});

describe("mainAppeal", () => {
  const row = (year: number, name: string, requirements: number | null, pct: number | null = 40) => ({
    ...period(`${year}-01-01`, `${year}-12-31`),
    appeal_name: name,
    appeal_type: "Plan",
    requirements_usd: requirements,
    funding_usd: requirements ? requirements * 0.4 : null,
    funding_pct: pct,
  });

  it("picks the largest appeal of the latest year up to this one", () => {
    const rows = [row(2025, "Old", 900), row(2026, "Flash", 100), row(2026, "HNRP", 300), row(2027, "Future", 999)];
    expect(mainAppeal(rows, 2026)).toMatchObject({ name: "HNRP", year: 2026, requirementsUsd: 300 });
  });

  it("falls back to an earlier year when this year has no requirement", () => {
    expect(mainAppeal([row(2025, "RRP", 200), row(2026, "Not specified", null)], 2026)).toMatchObject({
      name: "RRP",
      year: 2025,
    });
  });
});

describe("politicalViolence", () => {
  const row = (month: string, type: string, events: number, fatalities: number) => ({
    ...period(`${month}-01`, `${month}-28`),
    event_type: type,
    events,
    fatalities,
  });

  it("sums the last complete month, without civilian targeting or demonstrations", () => {
    const rows = [
      row("2026-09", "political_violence", 5, 1),
      row("2026-10", "political_violence", 3, 2),
      row("2026-10", "political_violence", 4, 6),
      row("2026-10", "civilian_targeting", 50, 50),
      row("2026-10", "demonstration", 70, 0),
      row("2026-11", "political_violence", 1, 1),
    ];
    expect(politicalViolence(rows, new Date("2026-11-03T12:00:00Z"))).toEqual({
      month: "2026-10",
      events: 7,
      fatalities: 8,
    });
  });
});

describe("ipcPhase3Plus", () => {
  it("takes the latest national current analysis", () => {
    const row = (end: string, value: number, ipc_type = "current") => ({
      ...period("2026-01-01", end),
      admin_level: 0,
      ipc_phase: "3+",
      ipc_type,
      population_in_phase: value,
      population_fraction_in_phase: 0.4,
    });
    expect(ipcPhase3Plus([row("2026-02-28", 1), row("2026-05-31", 2), row("2026-12-31", 9, "first projection")])).toEqual({
      value: 2,
      fraction: 0.4,
      from: "2026-01-01",
      asOf: "2026-05-31",
    });
  });
});
