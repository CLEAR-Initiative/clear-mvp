/**
 * Mock + schema for the camps research prototype.
 * Official coordinates must never live here — load them from `.local/` via the API.
 */

export type CampsReviewStatus =
  | "needs_review"
  | "imagery_ok"
  | "imagery_inconclusive"
  | "partner_fresh"
  | "demoted_stale";

export type CampsResearchSite = {
  id: string;
  name: string;
  state: string;
  locality: string;
  siteClass: "formal_camp" | "gathering" | "unknown";
  source: string;
  asOf: string;
  confidence: "high" | "medium" | "low";
  reviewStatus: CampsReviewStatus;
  /** Intentionally fake / ocean-offset for committed mock data */
  lng: number;
  lat: number;
  notes?: string;
  fromOfficialFixture?: boolean;
};

/** Committed mock rows — coordinates are dummy (Gulf of Guinea) so screenshots can't target people. */
export const CAMPS_RESEARCH_MOCK: CampsResearchSite[] = [
  {
    id: "mock-formal-1",
    name: "Example Formal Camp A",
    state: "West Darfur",
    locality: "Example locality",
    siteClass: "formal_camp",
    source: "mock",
    asOf: "2026-07-20",
    confidence: "medium",
    reviewStatus: "needs_review",
    lng: 0.12,
    lat: 0.08,
    notes: "Placeholder for review-queue UX. Replace with gitignored official fixture locally.",
  },
  {
    id: "mock-gather-1",
    name: "Example Gathering B",
    state: "North Darfur",
    locality: "Example locality",
    siteClass: "gathering",
    source: "mock",
    asOf: "2026-06-01",
    confidence: "low",
    reviewStatus: "demoted_stale",
    lng: 0.22,
    lat: 0.15,
    notes: "Stale as_of → demoted in queue (mirrors freshness policy).",
  },
  {
    id: "mock-partner-1",
    name: "Example Partner-Fresh C",
    state: "South Darfur",
    locality: "Example locality",
    siteClass: "formal_camp",
    source: "mock-partner",
    asOf: "2026-07-25",
    confidence: "high",
    reviewStatus: "partner_fresh",
    lng: 0.05,
    lat: 0.18,
  },
];

export type OfficialCampsFixture = {
  asOf?: string;
  source?: string;
  sites: Array<{
    id: string;
    name: string;
    state?: string;
    locality?: string;
    siteClass?: CampsResearchSite["siteClass"];
    lng: number;
    lat: number;
    asOf?: string;
    notes?: string;
  }>;
};

export function officialFixtureToSites(
  fixture: OfficialCampsFixture,
): CampsResearchSite[] {
  const source = fixture.source ?? "official-local-fixture";
  return fixture.sites.map((s) => ({
    id: s.id,
    name: s.name,
    state: s.state ?? "Sudan",
    locality: s.locality ?? "—",
    siteClass: s.siteClass ?? "formal_camp",
    source,
    asOf: s.asOf ?? fixture.asOf ?? "unknown",
    confidence: "medium",
    reviewStatus: "needs_review",
    lng: s.lng,
    lat: s.lat,
    notes: s.notes,
    fromOfficialFixture: true,
  }));
}
