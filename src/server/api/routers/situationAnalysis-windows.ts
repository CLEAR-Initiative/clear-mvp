/**
 * ISO timestamps for the start of the current month and the `back` months
 * before it, newest first. Midnight UTC on the 1st, which is the exact instant
 * the pipeline writes as `windowStart` - the API matches it for equality, so
 * anything else silently returns null.
 */
export function recentMonthStarts(back: number): string[] {
  const now = new Date();
  return Array.from({ length: back }, (_, i) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString(),
  );
}

/** Midnight UTC on 1 Jan. Same string shape as `recentMonthStarts` so the
 *  API's equality match on `windowStart` hits the pipeline row. Passing only
 *  `year` lets Prisma convert a Date through the DB session TZ
 *  (America/Santiago here) and miss `2026-01-01 00:00:00`. */
export function yearlyWindowStart(year: number): string {
  return new Date(Date.UTC(year, 0, 1)).toISOString();
}
