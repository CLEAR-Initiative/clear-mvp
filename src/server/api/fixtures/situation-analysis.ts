/**
 * Situation Analysis — typed fixture data (SAF Framework).
 *
 * The backend has no situation-analysis model yet, so the `situationAnalysis`
 * tRPC router serves this fixture. The shape mirrors the designer's data
 * contract; when the backend lands, swap the router resolver for a GraphQL
 * call returning this same shape and the UI is unchanged.
 *
 * Content: Lebanon Crisis 2026 (SAF-structured). All sectors carry canonical
 * content here — there are no "sample data" placeholders to render.
 */

/** SAF severity scale. `null` = not assessed. */
export type SaSeverity = "critical" | "severe" | "serious" | null;

export interface SaStat {
  value: string;
  label: string;
}

export interface SaCrisis {
  name: string;
  country: string;
  /** Emoji flag (CSS swatch is used in the UI; kept for future use). */
  flag: string;
  date: string;
  framework: string;
  displaced: SaStat;
  affected: SaStat;
  summary: string;
}

export interface SaContextRisk {
  label: string;
  items: string[];
}

export interface SaHazards {
  current: string[];
  precrisis: string[];
}

export interface SaDisplacement {
  push: string[];
  return: string[];
}

/** One assessed dimension within a sector (null when not assessed). */
export interface SaAssessmentCell {
  level: Exclude<SaSeverity, null>;
  items: string[];
}

export interface SaSectorAssessment {
  impact: SaAssessmentCell | null;
  humanitarian: SaAssessmentCell | null;
  atRisk: SaAssessmentCell | null;
}

export interface SaCoverage {
  dim: string;
  /** 0–10 information-coverage score. */
  score: number;
  /** Gap items. */
  items: string[];
}

export interface SaSector {
  id: string;
  code: string;
  name: string;
  impact: SaSeverity;
  humanitarian: SaSeverity;
  atRisk: SaSeverity;
  assessment: SaSectorAssessment;
  needs: string[];
  interventions: string[];
  coverage: SaCoverage[];
}

export interface SaActiveCrisis {
  title: string;
  severity: "high" | "medium";
  events: number;
  items: string[];
}

export interface SaSource {
  name: string;
  type: string;
  link: string;
  desc: string;
}

export interface SaSources {
  primary: SaSource[];
  framework: SaSource[];
}

export interface SituationAnalysis {
  /**
   * Where this analysis came from: `"fixture"` is the curated hard-coded
   * sample (Lebanon); `"live"` is mapped from the CLEAR pipeline. The UI
   * surfaces a badge for `"fixture"`.
   */
  dataSource: "fixture" | "live";
  crisis: SaCrisis;
  contextRisks: SaContextRisk[];
  hazards: SaHazards;
  displacement: SaDisplacement;
  sectors: SaSector[];
  activeCrises: SaActiveCrisis[];
  sources: SaSources;
}

export const LEBANON_SITUATION_ANALYSIS: SituationAnalysis = {
  dataSource: "fixture",
  crisis: {
    name: "Lebanon Crisis 2026",
    country: "Lebanon",
    flag: "🇱🇧",
    date: "Mar 21, 2026",
    framework: "SAF Framework",
    displaced: { value: "1.2M", label: "displaced persons" },
    affected: { value: "2.8M", label: "people" },
    summary:
      "Lebanon faces a severe humanitarian crisis with 1.2 million displaced persons among an estimated 2.8 million affected people, though population figures carry inherent uncertainty due to the absence of a recent national census. Ongoing conflict escalation, including exchanges of fire and military activity, is driving displacement and generating acute needs across food security, shelter, health, and protection, while the use of white phosphorus munitions poses severe and enduring environmental and biological hazards for affected communities. The health and humanitarian response is further undermined by attacks on medical and aid personnel, threatening the continuity of essential services at a moment when demand is critically high. Chronic economic collapse—marked by currency instability, hyperinflation, and eroded livelihoods—has gutted local coping mechanisms and severely constrained the absorptive capacity of host communities and national systems alike. The unresolved political tension between Hezbollah's armed autonomy and state authority over the use of force remains the primary structural driver of instability and the central constraint on both access and durable humanitarian response.",
  },

  contextRisks: [
    {
      label: "Demographics",
      items: [
        "Population estimate uncertainty (no recent census)",
        "Large, rapidly changing refugee and returnee flows (Syrians)",
      ],
    },
    {
      label: "Political",
      items: [
        "Hezbollah's armed independence vs. state monopoly on force",
        "Economic collapse and banking/financial instability",
        "Spillover from Israel–Hezbollah conflict / regional escalation",
      ],
    },
    {
      label: "Economy",
      items: ["Currency instability and inflation"],
    },
    {
      label: "Socio-Culture",
      items: [
        "Gender-based violence and limited access to GBV services",
        "Economic hardship driving child labour and early marriage",
      ],
    },
    {
      label: "Security",
      items: ["Israel–Hezbollah escalation / cross-border hostilities"],
    },
    {
      label: "Legal & Policy",
      items: [
        "Sectarian fragmentation of personal status law",
        "Discrimination and restricted rights for non-citizen groups",
      ],
    },
    {
      label: "Infrastructure",
      items: [
        "Electricity supply failure / fuel shortages",
        "Banking-sector liquidity constraints",
      ],
    },
    {
      label: "Environment",
      items: [
        "Soil contamination from munitions, heavy metals, white phosphorus in conflict zones",
      ],
    },
  ],

  hazards: {
    current: [
      "Conflict escalation with increased military activity and exchanges of fire",
      "Severe environmental and biological hazards from white phosphorus munitions",
      "Attacks on humanitarian and medical personnel threatening essential services",
      "Rising internal displacement and cross-border population movements",
      "Worsening food insecurity and acute hunger due to funding shortfalls",
    ],
    precrisis: [
      "Overstretched and fragile services due to displacement and preexisting vulnerabilities",
      "Deteriorating security conditions and escalating conflict",
      "Overwhelmed emergency healthcare capacity amid surge in war-wounded cases",
    ],
  },

  displacement: {
    push: [
      "Conflict-related violence including aerial attacks and bombardment",
      "Forced displacement and evacuation orders causing repeated displacement",
      "Sustained insecurity exposing civilians and refugees to harm",
      "Lack of shelter options and instability for displaced populations",
    ],
    return: [
      "Ongoing insecurity and hostilities preventing safe return",
      "Limited access to housing, services, and livelihoods in areas of origin",
      "Uncertainty and mixed intentions among displaced populations",
    ],
  },

  sectors: [
    {
      id: "education",
      code: "ED",
      name: "Education",
      impact: "severe",
      humanitarian: "critical",
      atRisk: "serious",
      assessment: {
        impact: {
          level: "severe",
          items: [
            "Disruption of education due to schools converted to shelters",
            "Restricted access to education",
            "Psychosocial distress among children",
          ],
        },
        humanitarian: {
          level: "critical",
          items: [
            "Schools used as collective shelters",
            "High number of children out of school",
            "Restricted access to education",
          ],
        },
        atRisk: {
          level: "serious",
          items: [
            "Children in shelters without education partners",
            "Psychosocial risks for displaced children",
            "Increased dropout rates",
          ],
        },
      },
      needs: [
        "Re-establishing access to education for children affected by the use of schools as shelters.",
      ],
      interventions: [
        "Provision of alternative safe learning spaces and Education in Emergencies programs.",
      ],
      coverage: [
        {
          dim: "At Risk",
          score: 4,
          items: [
            "Quantitative data on affected children or schools",
            "Geographic distribution of risks",
          ],
        },
        {
          dim: "Impact",
          score: 8,
          items: ["Quality of alternative education arrangements"],
        },
        {
          dim: "Humanitarian Conditions",
          score: 7,
          items: ["Dropout rates and learning loss data"],
        },
      ],
    },
    {
      id: "food",
      code: "FS",
      name: "Food Security",
      impact: "critical",
      humanitarian: "critical",
      atRisk: "severe",
      assessment: {
        impact: {
          level: "critical",
          items: [
            "Collapse of household purchasing power amid hyperinflation",
            "Disrupted markets and supply chains in conflict-affected areas",
            "Funding shortfalls reducing food assistance coverage",
          ],
        },
        humanitarian: {
          level: "critical",
          items: [
            "Rising acute food insecurity among displaced and host communities",
            "Negative coping strategies including reduced meals",
            "Dependence on assistance for basic food needs",
          ],
        },
        atRisk: {
          level: "severe",
          items: [
            "Female-headed and large households",
            "Displaced families without income sources",
            "Refugees with restricted livelihood access",
          ],
        },
      },
      needs: [
        "Sustained emergency food assistance for displaced and severely food-insecure households.",
        "Restoration of market functionality and affordable food access.",
      ],
      interventions: [
        "Scale-up of in-kind and cash-based food assistance.",
        "Market monitoring and support to local food supply chains.",
      ],
      coverage: [
        {
          dim: "Impact",
          score: 7,
          items: [
            "Disaggregated food consumption data",
            "Market price tracking in conflict zones",
          ],
        },
        {
          dim: "Humanitarian Conditions",
          score: 6,
          items: ["Coping strategy index by region"],
        },
      ],
    },
    {
      id: "health",
      code: "HE",
      name: "Health",
      impact: "critical",
      humanitarian: "critical",
      atRisk: "severe",
      assessment: {
        impact: {
          level: "critical",
          items: [
            "Psychological distress and trauma",
            "Damage and closure of hospitals and PHCs",
            "Disruption of SRH services",
          ],
        },
        humanitarian: {
          level: "critical",
          items: [
            "Healthcare facilities targeted causing closures",
            "Shortages in medicine and medical supplies",
            "Insufficient mental health support",
          ],
        },
        atRisk: {
          level: "severe",
          items: [
            "Pregnant women and newborns at risk",
            "Persons with chronic conditions lacking medication",
            "Children at risk of vaccine-preventable diseases",
          ],
        },
      },
      needs: [
        "Improved access to maternal health services to reduce infection, complications, and mortality.",
        "Restoration and repair of damaged and closed hospitals and primary healthcare centers.",
        "Mental health and psychosocial support for displaced and affected populations.",
        "Provision of safe, dignified, and adequately equipped shelters to meet health needs.",
      ],
      interventions: [
        "Provision of emergency maternal health care and safe delivery services.",
        "Rapid rehabilitation and reopening of damaged and closed health facilities.",
        "Provision of comprehensive mental health and psychosocial support services in shelters.",
      ],
      coverage: [
        {
          dim: "At Risk",
          score: 7,
          items: [
            "Health service coverage and access rates",
            "Morbidity and mortality statistics",
            "Mental health service utilization data",
          ],
        },
        {
          dim: "Impact",
          score: 8,
          items: [
            "Facility-level damage data",
            "Disaggregated data by vulnerable group",
          ],
        },
      ],
    },
    {
      id: "livelihoods",
      code: "LH",
      name: "Livelihoods",
      impact: "critical",
      humanitarian: "critical",
      atRisk: "serious",
      assessment: {
        impact: {
          level: "critical",
          items: [
            "Widespread loss of income and employment",
            "Destruction of productive assets and businesses",
            "Erosion of savings under currency collapse",
          ],
        },
        humanitarian: {
          level: "critical",
          items: [
            "Households unable to meet basic needs",
            "Increased reliance on debt and negative coping",
            "Limited formal employment opportunities",
          ],
        },
        atRisk: {
          level: "serious",
          items: [
            "Daily wage workers and informal labourers",
            "Small business owners in conflict areas",
            "Youth entering a collapsed labour market",
          ],
        },
      },
      needs: [
        "Emergency income support and livelihood protection for affected households.",
        "Restoration of productive assets and local economic activity.",
      ],
      interventions: [
        "Cash-for-work and emergency employment programmes.",
        "Small business recovery grants and asset replacement.",
      ],
      coverage: [
        {
          dim: "Impact",
          score: 5,
          items: ["Employment and income loss data", "Asset damage assessments"],
        },
        {
          dim: "At Risk",
          score: 6,
          items: ["Vulnerability profiling of affected workers"],
        },
      ],
    },
    {
      id: "logistics",
      code: "LG",
      name: "Logistics",
      impact: "critical",
      humanitarian: "critical",
      atRisk: null,
      assessment: {
        impact: {
          level: "critical",
          items: [
            "Damaged roads and transport infrastructure",
            "Fuel shortages constraining movement",
            "Insecurity along key supply routes",
          ],
        },
        humanitarian: {
          level: "critical",
          items: [
            "Delays in delivery of relief supplies",
            "Constrained access to conflict-affected areas",
            "Limited warehousing and cold-chain capacity",
          ],
        },
        atRisk: null,
      },
      needs: [
        "Reliable supply corridors and fuel access for humanitarian operations.",
      ],
      interventions: [
        "Common logistics services and coordinated transport.",
        "Pre-positioning of relief stocks closer to affected areas.",
      ],
      coverage: [
        {
          dim: "Impact",
          score: 6,
          items: ["Road and bridge access status", "Fuel availability tracking"],
        },
      ],
    },
    {
      id: "nutrition",
      code: "NU",
      name: "Nutrition",
      impact: "severe",
      humanitarian: "severe",
      atRisk: null,
      assessment: {
        impact: {
          level: "severe",
          items: [
            "Deteriorating dietary diversity and quality",
            "Disrupted nutrition services in affected areas",
            "Rising risk of acute malnutrition among children",
          ],
        },
        humanitarian: {
          level: "severe",
          items: [
            "Reduced access to infant and young child feeding support",
            "Limited screening and treatment capacity",
            "Food insecurity driving poor nutrition outcomes",
          ],
        },
        atRisk: null,
      },
      needs: [
        "Maintained nutrition screening and treatment for children under five and pregnant/lactating women.",
      ],
      interventions: [
        "Community-based management of acute malnutrition.",
        "Infant and young child feeding support in emergencies.",
      ],
      coverage: [
        {
          dim: "Impact",
          score: 5,
          items: [
            "Acute malnutrition prevalence data",
            "Coverage of nutrition programmes",
          ],
        },
      ],
    },
    {
      id: "protection",
      code: "PR",
      name: "Protection",
      impact: "critical",
      humanitarian: "critical",
      atRisk: "severe",
      assessment: {
        impact: {
          level: "critical",
          items: [
            "Civilian harm from hostilities and bombardment",
            "Family separation and loss of documentation",
            "Heightened GBV and child protection risks",
          ],
        },
        humanitarian: {
          level: "critical",
          items: [
            "Limited access to protection services",
            "Psychological distress across affected populations",
            "Restricted rights and protection for non-citizens",
          ],
        },
        atRisk: {
          level: "severe",
          items: [
            "Women and girls exposed to GBV",
            "Unaccompanied and separated children",
            "Refugees and stateless persons",
          ],
        },
      },
      needs: [
        "Expanded protection monitoring and case management for at-risk groups.",
        "Accessible GBV and child protection services for displaced populations.",
      ],
      interventions: [
        "Protection desks and referral pathways in displacement sites.",
        "GBV prevention and response, including safe spaces.",
      ],
      coverage: [
        {
          dim: "At Risk",
          score: 6,
          items: ["Incident and referral data", "Coverage of GBV services"],
        },
        {
          dim: "Humanitarian Conditions",
          score: 5,
          items: ["Protection needs of non-citizen groups"],
        },
      ],
    },
    {
      id: "shelter",
      code: "SH",
      name: "Shelter",
      impact: "critical",
      humanitarian: "critical",
      atRisk: "severe",
      assessment: {
        impact: {
          level: "critical",
          items: [
            "Destruction and damage of housing stock",
            "Overcrowding in collective shelters",
            "Use of schools and public buildings as shelters",
          ],
        },
        humanitarian: {
          level: "critical",
          items: [
            "Inadequate and unsafe shelter conditions",
            "Limited availability of affordable housing",
            "Exposure to weather and health risks",
          ],
        },
        atRisk: {
          level: "severe",
          items: [
            "Newly displaced families without shelter",
            "Female-headed households in collective sites",
            "Persons with disabilities and older people",
          ],
        },
      },
      needs: [
        "Safe, dignified, and adequately equipped emergency shelter for displaced populations.",
        "Rehabilitation of damaged housing to enable return.",
      ],
      interventions: [
        "Emergency shelter kits and upgrades to collective sites.",
        "Rental support and light housing rehabilitation.",
      ],
      coverage: [
        {
          dim: "Impact",
          score: 6,
          items: ["Housing damage assessments", "Shelter occupancy data"],
        },
        {
          dim: "At Risk",
          score: 5,
          items: ["Disaggregated shelter vulnerability data"],
        },
      ],
    },
    {
      id: "wash",
      code: "WA",
      name: "WASH",
      impact: "critical",
      humanitarian: "critical",
      atRisk: "severe",
      assessment: {
        impact: {
          level: "critical",
          items: [
            "Damage to water and sanitation infrastructure",
            "Service disruption from fuel and power shortages",
            "Contamination risks in conflict-affected areas",
          ],
        },
        humanitarian: {
          level: "critical",
          items: [
            "Reduced access to safe drinking water",
            "Inadequate sanitation in collective shelters",
            "Elevated risk of waterborne disease outbreaks",
          ],
        },
        atRisk: {
          level: "severe",
          items: [
            "Populations in overcrowded collective sites",
            "Children vulnerable to waterborne disease",
            "Communities reliant on damaged networks",
          ],
        },
      },
      needs: [
        "Restoration of safe water supply and sanitation services in affected areas.",
        "Hygiene support to prevent disease outbreaks in collective sites.",
      ],
      interventions: [
        "Emergency water trucking and network repair.",
        "Sanitation upgrades and hygiene kit distribution.",
      ],
      coverage: [
        {
          dim: "Impact",
          score: 6,
          items: [
            "Water network functionality data",
            "Water quality testing results",
          ],
        },
        {
          dim: "Humanitarian Conditions",
          score: 5,
          items: ["Disease surveillance in displacement sites"],
        },
      ],
    },
  ],

  activeCrises: [
    {
      title: "Southern Border Escalation — Nabatieh",
      severity: "high",
      events: 3,
      items: [
        "Intensified exchanges of fire and aerial activity along the southern border.",
        "An estimated 84,000 people displaced from frontline villages.",
        "Cross-border hostilities threaten civilian safety and humanitarian access.",
      ],
    },
    {
      title: "Displacement Surge in the Bekaa Valley",
      severity: "high",
      events: 2,
      items: [
        "Rapid arrival of displaced families straining collective shelters.",
        "Around 41,000 people affected amid limited absorptive capacity.",
        "Overcrowding driving WASH and protection risks across sites.",
      ],
    },
    {
      title: "Healthcare System Strain — Mount Lebanon",
      severity: "high",
      events: 2,
      items: [
        "Hospitals and PHCs reporting closures and critical supply shortages.",
        "Attacks on medical personnel undermining continuity of care.",
        "Surge in war-wounded cases overwhelming emergency capacity.",
      ],
    },
    {
      title: "Fuel & Power Shortage — Greater Beirut",
      severity: "medium",
      events: 1,
      items: [
        "Fuel scarcity disrupting electricity supply and water pumping.",
        "Roughly 33,000 people affected by service interruptions.",
      ],
    },
    {
      title: "Currency Collapse Impact — Tripoli",
      severity: "medium",
      events: 1,
      items: [
        "Hyperinflation eroding household purchasing power and livelihoods.",
        "Banking-sector liquidity constraints limiting access to cash.",
      ],
    },
  ],

  sources: {
    primary: [
      {
        name: "Protection Analysis and Monitoring Task Force (PAMTF)",
        type: "Coordination Body",
        link: "Visit source",
        desc: "Multi-agency protection monitoring and analysis coordination group for Lebanon.",
      },
      {
        name: "World Food Programme",
        type: "UN Agency",
        link: "Visit source",
        desc: "Primary source for food security assessments and IDP food assistance data in Lebanon.",
      },
      {
        name: "Inter-Sector Coordination Group",
        type: "Coordination Body",
        link: "Visit source",
        desc: "Coordination hub consolidating sectoral situation reports across all humanitarian clusters.",
      },
      {
        name: "World Health Organization",
        type: "UN Agency",
        link: "Visit source",
        desc: "Health sector data including facility damage assessments and health worker incident tracking.",
      },
      {
        name: "Ministry of Public Health Lebanon",
        type: "Government",
        link: "Visit source",
        desc: "Official government health data including hospital closures and PHC status.",
      },
    ],
    framework: [
      {
        name: "NRC Situation Analysis Framework",
        type: "Methodology",
        link: "nrc.no",
        desc: "NRC's standardised framework for conducting humanitarian situation analyses across acute crisis contexts.",
      },
      {
        name: "CLEAR Automated Analysis",
        type: "AI Pipeline",
        link: "GitHub",
        desc: "Open-source media monitoring pipeline extracting structured humanitarian intelligence from news and field reports.",
      },
      {
        name: "IASC Humanitarian Standards",
        type: "Methodology",
        link: "iasc.org",
        desc: "Inter-Agency Standing Committee standards underpinning severity classification and sectoral analysis categories.",
      },
    ],
  },
};
