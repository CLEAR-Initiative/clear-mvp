/**
 * Data Source Intelligence Service
 * Gap analysis, partner matching, and data availability assessment
 * for humanitarian response planning.
 */

// ── Sector → Indicator mapping ────────────────────────────────────────

export const SECTOR_INDICATORS: Record<string, string[]> = {
  protection: [
    "protection_incidents",
    "gbv_incidents",
    "child_protection_cases",
    "documentation_status",
  ],
  health: [
    "mortality_rates",
    "vaccination_coverage",
    "disease_outbreaks",
    "mental_health_cases",
  ],
  nutrition: [
    "malnutrition_rates",
    "food_consumption_score",
    "dietary_diversity",
  ],
  wash: [
    "water_quantity",
    "water_quality",
    "sanitation_coverage",
    "waterborne_diseases",
  ],
  shelter: [
    "shelter_adequacy",
    "overcrowding",
    "structural_safety",
    "tenure_security",
  ],
  education: [
    "enrollment_rates",
    "learning_outcomes",
    "teacher_student_ratio",
  ],
  livelihoods: [
    "income_sources",
    "employment_rates",
    "market_functionality",
  ],
};

// Critical indicators that get higher severity in gap analysis
const CRITICAL_INDICATORS = new Set([
  "mortality_rates",
  "malnutrition_rates",
  "protection_incidents",
  "water_quantity",
  "shelter_adequacy",
  "disease_outbreaks",
]);

// ── Partner data source catalog ───────────────────────────────────────

export interface PartnerSource {
  id: string;
  name: string;
  type: string;
  sectors: string[];
  dataTypes: string[];
  apiEndpoint: string;
  updateFrequency: string;
  coverage: { geographic: string[]; populations: string[] };
  quality: "high" | "medium" | "low";
  accessLevel: "public" | "partner" | "restricted";
}

export const PARTNER_SOURCES: PartnerSource[] = [
  {
    id: "unhcr",
    name: "UNHCR",
    type: "UN Agency",
    sectors: ["protection", "shelter"],
    dataTypes: ["registration", "displacement", "protection_monitoring"],
    apiEndpoint: "https://data.unhcr.org/api",
    updateFrequency: "daily",
    coverage: { geographic: ["global"], populations: ["refugees", "idps", "asylum_seekers"] },
    quality: "high",
    accessLevel: "public",
  },
  {
    id: "wfp",
    name: "WFP",
    type: "UN Agency",
    sectors: ["nutrition", "livelihoods"],
    dataTypes: ["food_security", "market_prices", "nutrition_surveys"],
    apiEndpoint: "https://api.wfp.org",
    updateFrequency: "weekly",
    coverage: { geographic: ["global"], populations: ["food_insecure"] },
    quality: "high",
    accessLevel: "partner",
  },
  {
    id: "who",
    name: "WHO",
    type: "UN Agency",
    sectors: ["health"],
    dataTypes: ["disease_surveillance", "health_facilities", "vaccination"],
    apiEndpoint: "https://ghoapi.azureedge.net/api",
    updateFrequency: "weekly",
    coverage: { geographic: ["global"], populations: ["general"] },
    quality: "high",
    accessLevel: "public",
  },
  {
    id: "unicef",
    name: "UNICEF",
    type: "UN Agency",
    sectors: ["education", "wash", "nutrition", "protection"],
    dataTypes: ["child_protection", "education_access", "wash_monitoring"],
    apiEndpoint: "https://data.unicef.org/api",
    updateFrequency: "monthly",
    coverage: { geographic: ["global"], populations: ["children", "women"] },
    quality: "high",
    accessLevel: "public",
  },
  {
    id: "ocha",
    name: "OCHA",
    type: "UN Agency",
    sectors: ["protection", "health", "nutrition", "wash", "shelter", "education", "livelihoods"],
    dataTypes: ["needs_assessments", "situation_reports", "3w_data"],
    apiEndpoint: "https://api.reliefweb.int",
    updateFrequency: "daily",
    coverage: { geographic: ["global"], populations: ["affected_populations"] },
    quality: "high",
    accessLevel: "public",
  },
  {
    id: "acaps",
    name: "ACAPS",
    type: "Data Platform",
    sectors: ["protection", "health", "nutrition", "wash", "shelter"],
    dataTypes: ["severity_assessments", "crisis_profiles", "risk_analysis"],
    apiEndpoint: "https://api.acaps.org",
    updateFrequency: "weekly",
    coverage: { geographic: ["global"], populations: ["crisis_affected"] },
    quality: "medium",
    accessLevel: "public",
  },
  {
    id: "hdx",
    name: "HDX (Humanitarian Data Exchange)",
    type: "Data Platform",
    sectors: ["protection", "health", "nutrition", "wash", "shelter", "education", "livelihoods"],
    dataTypes: ["datasets", "indicators", "geospatial"],
    apiEndpoint: "https://data.humdata.org/api/3",
    updateFrequency: "varies",
    coverage: { geographic: ["global"], populations: ["all"] },
    quality: "medium",
    accessLevel: "public",
  },
];

// ── Availability check ────────────────────────────────────────────────

export interface AvailabilityRequest {
  sectors: string[];
  location?: string;
  crisisType?: string;
}

export interface SectorAvailability {
  sector: string;
  totalIndicators: number;
  availableCount: number;
  coverage: number; // 0-100
  status: "fully_available" | "partially_available" | "not_available";
  availableIndicators: string[];
  missingIndicators: string[];
  recommendedSources: { sourceId: string; name: string; relevance: number }[];
  primaryCollectionNeeded: boolean;
}

export interface AvailabilitySummary {
  totalRequired: number;
  fullyAvailable: number;
  partiallyAvailable: number;
  notAvailable: number;
  confidence: number; // 0-100
  sectors: SectorAvailability[];
}

export function checkDataAvailability(
  request: AvailabilityRequest,
  existingSources: { sector: string; indicators: string[] }[],
): AvailabilitySummary {
  const sectors: SectorAvailability[] = [];
  let totalRequired = 0;
  let fullyCount = 0;
  let partialCount = 0;
  let notCount = 0;

  for (const sector of request.sectors) {
    const requiredIndicators = SECTOR_INDICATORS[sector] ?? [];
    totalRequired += requiredIndicators.length;

    // Check which indicators are already available from existing sources
    const existing = existingSources
      .filter((s) => s.sector === sector)
      .flatMap((s) => s.indicators);

    const availableIndicators = requiredIndicators.filter((ind) =>
      existing.some((e) => normalize(e) === normalize(ind)),
    );
    const missingIndicators = requiredIndicators.filter(
      (ind) => !availableIndicators.includes(ind),
    );

    const coverage = requiredIndicators.length > 0
      ? Math.round((availableIndicators.length / requiredIndicators.length) * 100)
      : 0;

    const status: SectorAvailability["status"] =
      coverage >= 90 ? "fully_available"
        : coverage >= 50 ? "partially_available"
          : "not_available";

    if (status === "fully_available") fullyCount++;
    else if (status === "partially_available") partialCount++;
    else notCount++;

    // Find recommended partner sources for this sector
    const recommended = PARTNER_SOURCES
      .filter((p) => p.sectors.includes(sector))
      .map((p) => ({
        sourceId: p.id,
        name: p.name,
        relevance: calculateRelevance(p, sector, request.location),
      }))
      .sort((a, b) => b.relevance - a.relevance);

    sectors.push({
      sector,
      totalIndicators: requiredIndicators.length,
      availableCount: availableIndicators.length,
      coverage,
      status,
      availableIndicators,
      missingIndicators,
      recommendedSources: recommended,
      primaryCollectionNeeded: coverage < 50,
    });
  }

  const sectorCount = request.sectors.length || 1;
  const confidence = Math.round(
    ((fullyCount * 1.0 + partialCount * 0.6) / sectorCount) * 100,
  );

  return {
    totalRequired,
    fullyAvailable: fullyCount,
    partiallyAvailable: partialCount,
    notAvailable: notCount,
    confidence,
    sectors,
  };
}

// ── Gap analysis ──────────────────────────────────────────────────────

export interface GapItem {
  indicator: string;
  sector: string;
  severity: "critical" | "high" | "medium";
  collectionMethod: string;
  estimatedCost: number;
  timeframe: string;
}

export interface GapAnalysisResult {
  totalRequired: number;
  totalAvailable: number;
  gapCount: number;
  coveragePercentage: number;
  gaps: GapItem[];
  recommendations: {
    priority: "urgent" | "high" | "medium";
    sector: string;
    recommendation: string;
  }[];
}

export function performGapAnalysis(
  sectors: string[],
  existingSources: { sector: string; indicators: string[] }[],
  crisisType?: string,
): GapAnalysisResult {
  const allRequired: { indicator: string; sector: string }[] = [];
  const allAvailable: string[] = [];

  for (const sector of sectors) {
    const indicators = SECTOR_INDICATORS[sector] ?? [];
    for (const ind of indicators) {
      allRequired.push({ indicator: ind, sector });
    }
    const existing = existingSources
      .filter((s) => s.sector === sector)
      .flatMap((s) => s.indicators);
    allAvailable.push(...existing);
  }

  const normalizedAvailable = new Set(allAvailable.map(normalize));

  const gaps: GapItem[] = allRequired
    .filter((r) => !normalizedAvailable.has(normalize(r.indicator)))
    .map((r) => ({
      indicator: r.indicator,
      sector: r.sector,
      severity: getGapSeverity(r.indicator, crisisType),
      collectionMethod: suggestCollectionMethod(r.indicator),
      estimatedCost: estimateCost(r.indicator, crisisType),
      timeframe: estimateTimeframe(r.indicator),
    }));

  const recommendations = deriveRecommendations(gaps);

  return {
    totalRequired: allRequired.length,
    totalAvailable: allRequired.length - gaps.length,
    gapCount: gaps.length,
    coveragePercentage:
      allRequired.length > 0
        ? Math.round(
            ((allRequired.length - gaps.length) / allRequired.length) * 100,
          )
        : 100,
    gaps: gaps.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity)),
    recommendations,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, "_");
}

function calculateRelevance(
  source: PartnerSource,
  sector: string,
  _location?: string,
): number {
  let score = 0;
  // Sector match (0.5 weight)
  if (source.sectors.includes(sector)) score += 50;
  // Quality bonus (0.3 weight)
  if (source.quality === "high") score += 30;
  else if (source.quality === "medium") score += 15;
  // Access bonus (0.2 weight)
  if (source.accessLevel === "public") score += 20;
  else if (source.accessLevel === "partner") score += 10;
  return score;
}

function getGapSeverity(
  indicator: string,
  crisisType?: string,
): "critical" | "high" | "medium" {
  if (CRITICAL_INDICATORS.has(indicator)) return "critical";
  if (crisisType === "CONFLICT" && indicator.includes("protection")) return "critical";
  if (crisisType === "EPIDEMIC" && indicator.includes("disease")) return "critical";
  if (indicator.includes("gbv") || indicator.includes("child_protection")) return "high";
  return "medium";
}

function suggestCollectionMethod(indicator: string): string {
  if (indicator.includes("satellite") || indicator.includes("shelter_adequacy"))
    return "Remote sensing";
  if (indicator.includes("market")) return "Market monitoring";
  if (indicator.includes("disease") || indicator.includes("mortality"))
    return "Health facility reporting";
  if (indicator.includes("water") || indicator.includes("sanitation"))
    return "WASH cluster assessment";
  return "Household survey";
}

function estimateCost(indicator: string, crisisType?: string): number {
  let base = 5000;
  if (CRITICAL_INDICATORS.has(indicator)) base *= 1.5;
  if (crisisType === "CONFLICT") base *= 1.4;
  return Math.round(base);
}

function estimateTimeframe(indicator: string): string {
  if (indicator.includes("disease") || indicator.includes("mortality"))
    return "1-2 weeks";
  if (indicator.includes("market") || indicator.includes("water"))
    return "2-3 weeks";
  return "3-4 weeks";
}

function severityOrder(s: "critical" | "urgent" | "high" | "medium"): number {
  if (s === "critical" || s === "urgent") return 0;
  if (s === "high") return 1;
  return 2;
}

function deriveRecommendations(
  gaps: GapItem[],
): { priority: "urgent" | "high" | "medium"; sector: string; recommendation: string }[] {
  const bySector = new Map<string, GapItem[]>();
  for (const g of gaps) {
    const arr = bySector.get(g.sector) ?? [];
    arr.push(g);
    bySector.set(g.sector, arr);
  }

  const recs: { priority: "urgent" | "high" | "medium"; sector: string; recommendation: string }[] = [];

  for (const [sector, sectorGaps] of bySector) {
    const criticalCount = sectorGaps.filter((g) => g.severity === "critical").length;
    const priority: "urgent" | "high" | "medium" =
      criticalCount > 0 ? "urgent" : sectorGaps.length >= 3 ? "high" : "medium";

    const methods = [...new Set(sectorGaps.map((g) => g.collectionMethod))];
    recs.push({
      priority,
      sector,
      recommendation: `${sectorGaps.length} indicator gap${sectorGaps.length !== 1 ? "s" : ""} in ${sector}. Recommended: ${methods.join(", ")}.`,
    });
  }

  return recs.sort((a, b) => severityOrder(a.priority) - severityOrder(b.priority));
}
