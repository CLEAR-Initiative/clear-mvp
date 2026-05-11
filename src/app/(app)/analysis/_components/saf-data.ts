export type SeverityScale = "CRITICAL" | "SEVERE" | "SERIOUS" | "MODERATE" | "UNKNOWN";

export interface SectorSeverity {
  severity_scale: SeverityScale;
  top3_risks: string[];
}

export interface CountryData {
  FINAL_NUMBERS_DATA: Array<{ what_happened: string; number: number; unit: string }>;
  OUTPUT_CONTEXT_RISKS_DATA: Record<string, string[]>;
  CURRENT_HAZARDS_AND_THREATS_DATA: string[];
  PRECRISIS_VULNERABILITIES_DATA: string[];
  DISPLACEMENT_RISKS_DATA: { "Push Factors": string[]; Intentions: string[] };
  SHOWN_RISKS_DATA: {
    Impact: Record<string, SectorSeverity>;
    "Humanitarian Conditions": Record<string, SectorSeverity>;
    "At Risk": Record<string, SectorSeverity>;
  };
  TOP_SECTORAL_NEEDS_DATA: Record<string, string[]>;
  TOP_PRIORITY_INTERVENTIONS_DATA: Record<string, string[]>;
  TOP_5_SOURCES_DATA: string[];
  INFORMATION_COVERAGE_DATA: {
    overall_score: number;
    analysis: Array<{
      pillar: string;
      entries: Array<{ sector: string; coverage: number; gaps: string[] }>;
    }>;
  };
}

export const ALL_DATA: Record<string, CountryData> = {
  sudan: {
    FINAL_NUMBERS_DATA: [
      { what_happened: "displaced", number: 11000000, unit: "IDPs" },
      { what_happened: "affected", number: 25000000, unit: "people in need" },
    ],
    OUTPUT_CONTEXT_RISKS_DATA: {
      Political: [
        "Armed conflict between SAF and RSF with no clear resolution",
        "Fragmented governance and absence of civilian oversight",
      ],
      Security: [
        "Active frontlines in Khartoum, Darfur, and Kordofan",
        "Widespread attacks on civilian infrastructure",
      ],
      Economy: ["Economic collapse and hyperinflation", "Disruption of trade routes and supply chains"],
      Humanitarian: [
        "Famine conditions in parts of Darfur",
        "Massive displacement to Chad, South Sudan, and Egypt",
      ],
    },
    CURRENT_HAZARDS_AND_THREATS_DATA: [
      "Active armed conflict between SAF and RSF across multiple states",
      "Famine and extreme food insecurity in El Fasher and surrounding areas",
      "Mass displacement with over 11 million IDPs",
      "Attacks on healthcare facilities and personnel",
      "Flooding in southern states compounding displacement",
    ],
    PRECRISIS_VULNERABILITIES_DATA: [
      "Chronic poverty and food insecurity pre-dating the conflict",
      "Fragile health system with limited coverage",
      "Large refugee population from neighbouring countries",
      "Ethnic tensions exploited by armed groups",
      "Climate vulnerability exacerbating agricultural collapse",
    ],
    DISPLACEMENT_RISKS_DATA: {
      "Push Factors": [
        "Direct conflict violence and aerial bombardment",
        "Ethnic targeting and forced displacement",
        "Destruction of homes and livelihoods",
        "Famine and lack of food access",
      ],
      Intentions: [
        "Widespread fear of return due to ongoing fighting",
        "Lack of safety guarantees and destroyed infrastructure",
        "Mixed intentions with preference to return once safe",
      ],
    },
    SHOWN_RISKS_DATA: {
      Impact: {
        "Food Security": {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Famine conditions in Darfur region",
            "Complete collapse of food supply chains in conflict zones",
            "Mass displacement destroying agricultural livelihoods",
          ],
        },
        Health: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Widespread destruction of health facilities",
            "Cholera and other disease outbreaks",
            "Acute shortage of medicines and medical staff",
          ],
        },
        Protection: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Ethnic-based violence and targeted killings",
            "Mass sexual violence used as a weapon of war",
            "Forced recruitment of children into armed groups",
          ],
        },
        Shelter: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Mass destruction of homes and infrastructure",
            "Overcrowded displacement camps",
            "Secondary displacement due to camp insecurity",
          ],
        },
        WASH: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Cholera outbreak linked to contaminated water",
            "Destruction of water infrastructure",
            "Inadequate sanitation in displacement camps",
          ],
        },
      },
      "Humanitarian Conditions": {
        "Food Security": {
          severity_scale: "CRITICAL",
          top3_risks: [
            "IPC Phase 5 famine in North Darfur",
            "Acute malnutrition among children under 5",
            "Complete market collapse in conflict areas",
          ],
        },
        Health: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "70% of health facilities non-functional",
            "Cholera affecting tens of thousands",
            "Maternal mortality spiking",
          ],
        },
        Protection: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Pervasive sexual violence in conflict zones",
            "Arbitrary detention and enforced disappearances",
            "Child recruitment by armed groups",
          ],
        },
      },
      "At Risk": {
        "Food Security": {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Children under 5 at risk of acute malnutrition",
            "Pregnant and lactating women facing severe food gaps",
            "Pastoralist communities with destroyed livelihoods",
          ],
        },
        Health: {
          severity_scale: "SEVERE",
          top3_risks: [
            "Unvaccinated children at risk of disease outbreaks",
            "Persons with chronic conditions without medication",
            "Survivors of sexual violence without support",
          ],
        },
        Protection: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Women and girls at risk of sexual violence",
            "Ethnic minorities targeted by RSF",
            "Unaccompanied children at risk of trafficking",
          ],
        },
      },
    },
    TOP_SECTORAL_NEEDS_DATA: {
      "Food Security": [
        "Immediate food assistance for 18 million people in acute food insecurity",
        "Scale-up of therapeutic feeding programmes for 3.5 million acutely malnourished children",
        "Cash and voucher assistance to restore household food access",
      ],
      Health: [
        "Emergency rehabilitation of destroyed health facilities",
        "Cholera response including WASH interventions and treatment",
        "Procurement and distribution of essential medicines",
      ],
      Protection: [
        "Safe spaces and psychosocial support for survivors of sexual violence",
        "Child protection services and family tracing for separated children",
        "Legal aid for forcibly displaced persons",
      ],
      Shelter: [
        "Emergency shelter materials for households in displacement",
        "Rehabilitation of displacement camps to reduce overcrowding",
        "Support for host communities absorbing displaced populations",
      ],
      WASH: [
        "Cholera prevention through safe water provision",
        "Emergency sanitation in displacement camps",
        "Hygiene promotion programmes",
      ],
    },
    TOP_PRIORITY_INTERVENTIONS_DATA: {
      "Food Security": [
        "Scale up food distributions to reach 18 million people in acute food insecurity",
        "Establish therapeutic feeding centres in El Fasher and famine-affected areas",
        "Provide agricultural inputs to enable next planting season",
      ],
      Health: [
        "Rehabilitate and restock at least 30% of non-functional health facilities",
        "Deploy mobile health teams to areas without facility access",
        "Establish cholera treatment centres in high-risk areas",
      ],
      Protection: [
        "Deploy GBV case management and referral systems in displacement sites",
        "Establish child-friendly spaces and psychosocial support in camps",
        "Advocate for cessation of hostilities and protection of civilians",
      ],
      WASH: [
        "Provide safe water to at least 5 million people through emergency trucking",
        "Construct emergency latrines in displacement camps",
        "Launch community hygiene promotion to prevent cholera spread",
      ],
    },
    TOP_5_SOURCES_DATA: ["OCHA Sudan", "WFP Sudan", "UNHCR Sudan", "IRC Sudan", "Médecins Sans Frontières"],
    INFORMATION_COVERAGE_DATA: {
      overall_score: 5.4,
      analysis: [
        {
          pillar: "Impact",
          entries: [
            {
              sector: "Food Security",
              coverage: 7,
              gaps: [
                "Granular sub-state food security data missing",
                "Famine verification outside El Fasher incomplete",
              ],
            },
            {
              sector: "Health",
              coverage: 6,
              gaps: ["Facility-level functionality data unreliable", "Disease surveillance system collapsed"],
            },
            {
              sector: "Protection",
              coverage: 5,
              gaps: ["Sexual violence vastly under-reported", "Child recruitment data unavailable"],
            },
          ],
        },
        {
          pillar: "At Risk",
          entries: [
            {
              sector: "Food Security",
              coverage: 5,
              gaps: ["Household-level vulnerability data unavailable", "Pastoralist community data absent"],
            },
            {
              sector: "Health",
              coverage: 4,
              gaps: ["Chronic disease population not mapped", "Vaccination coverage data outdated"],
            },
            {
              sector: "Protection",
              coverage: 4,
              gaps: ["Ethnic targeting patterns poorly documented", "Child protection risks unquantified"],
            },
          ],
        },
      ],
    },
  },
};

export type CountryKey = keyof typeof ALL_DATA;

export const SAF_COUNTRIES: Array<{ key: CountryKey; label: string; crisis: string }> = [
  { key: "sudan", label: "Sudan", crisis: "Sudan Crisis 2026" },
];

export const SOURCE_META: Record<CountryKey, Array<{ org: string; type: string; url: string; desc: string }>> = {
  sudan: [
    {
      org: "OCHA Sudan",
      type: "UN Agency",
      url: "https://www.unocha.org/sudan",
      desc: "Primary coordination hub for Sudan humanitarian response — situation reports and access monitoring.",
    },
    {
      org: "WFP Sudan",
      type: "UN Agency",
      url: "https://www.wfp.org/countries/sudan",
      desc: "Food security assessments including IPC phase classifications and famine verification.",
    },
    {
      org: "UNHCR Sudan",
      type: "UN Agency",
      url: "https://www.unhcr.org/countries/sudan",
      desc: "Displacement tracking, refugee registration, and protection monitoring across Sudan.",
    },
    {
      org: "IRC Sudan",
      type: "INGO",
      url: "https://www.rescue.org/country/sudan",
      desc: "Field-level situation assessments from IRC operations in Khartoum, Darfur, and Kordofan.",
    },
    {
      org: "Médecins Sans Frontières",
      type: "INGO",
      url: "https://www.msf.org/sudan",
      desc: "Health facility data and medical emergency reporting from frontline operations.",
    },
  ],
};

export function fmtNumber(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "K";
  return String(n);
}

export function severityColors(scale: SeverityScale): { color: string; bg: string; border: string } {
  switch (scale) {
    case "CRITICAL":
      return {
        color: "var(--color-critical)",
        bg: "var(--color-critical-light)",
        border: "#FCA5A5",
      };
    case "SEVERE":
      return {
        color: "var(--color-warning)",
        bg: "var(--color-warning-light)",
        border: "#FCD34D",
      };
    case "SERIOUS":
      return {
        color: "#92400E",
        bg: "#FEF9C3",
        border: "#FDE047",
      };
    case "MODERATE":
      return {
        color: "var(--color-info)",
        bg: "var(--color-info-light)",
        border: "#93C5FD",
      };
    default:
      return {
        color: "var(--color-text-muted)",
        bg: "var(--color-bg-muted)",
        border: "var(--color-border)",
      };
  }
}

export function coverageColors(score: number): { color: string; bg: string; bar: string } {
  if (score <= 3) return { color: "var(--color-critical)", bg: "var(--color-critical-light)", bar: "var(--color-critical)" };
  if (score <= 5) return { color: "var(--color-warning)", bg: "var(--color-warning-light)", bar: "var(--color-warning)" };
  if (score <= 6) return { color: "#92400E", bg: "#FEF9C3", bar: "#CA8A04" };
  if (score <= 8) return { color: "var(--color-info)", bg: "var(--color-info-light)", bar: "var(--color-info)" };
  return { color: "var(--color-success)", bg: "var(--color-success-light)", bar: "var(--color-success)" };
}
