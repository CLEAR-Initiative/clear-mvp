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
  lebanon: {
    FINAL_NUMBERS_DATA: [
      { what_happened: "displaced", number: 1170000, unit: "displaced persons" },
      { what_happened: "affected", number: 2770000, unit: "people" },
    ],
    OUTPUT_CONTEXT_RISKS_DATA: {
      Demographics: [
        "Population estimate uncertainty (no recent census)",
        "Large, rapidly changing refugee and returnee flows (Syrians)",
      ],
      Political: [
        "Hezbollah's armed independence vs. state monopoly on force",
        "Economic collapse and banking/financial instability",
        "Spillover from Israel–Hezbollah conflict / regional escalation",
      ],
      Economy: ["Currency instability and inflation"],
      "Socio-culture": [
        "Gender-based violence and limited access to GBV services",
        "Economic hardship driving child labour and early marriage",
      ],
      Security: ["Israel–Hezbollah escalation / cross-border hostilities"],
      "Legal & policy": [
        "Sectarian fragmentation of personal status law",
        "Discrimination and restricted rights for non-citizen groups",
      ],
      Infrastructure: [
        "Electricity supply failure / fuel shortages",
        "Banking-sector liquidity constraints",
      ],
      Environment: [
        "Soil contamination from munitions, heavy metals, white phosphorus in conflict zones",
      ],
    },
    CURRENT_HAZARDS_AND_THREATS_DATA: [
      "Conflict escalation with increased military activity and exchanges of fire",
      "Severe environmental and biological hazards from white phosphorus munitions",
      "Attacks on humanitarian and medical personnel threatening essential services",
      "Rising internal displacement and cross-border population movements",
      "Worsening food insecurity and acute hunger due to funding shortfalls",
    ],
    PRECRISIS_VULNERABILITIES_DATA: [
      "Overstretched and fragile services due to displacement and preexisting vulnerabilities",
      "Deteriorating security conditions and escalating conflict",
      "Overwhelmed emergency healthcare capacity amid surge in war-wounded cases",
    ],
    DISPLACEMENT_RISKS_DATA: {
      "Push Factors": [
        "Conflict-related violence including aerial attacks and bombardment",
        "Forced displacement and evacuation orders causing repeated displacement",
        "Sustained insecurity exposing civilians and refugees to harm",
        "Lack of shelter options and instability for displaced populations",
      ],
      Intentions: [
        "Ongoing insecurity and hostilities preventing safe return",
        "Limited access to housing, services, and livelihoods in areas of origin",
        "Uncertainty and mixed intentions among displaced populations",
      ],
    },
    SHOWN_RISKS_DATA: {
      Impact: {
        Education: {
          severity_scale: "SEVERE",
          top3_risks: [
            "Disruption of education due to schools converted to shelters",
            "Restricted access to education",
            "Psychosocial distress among children",
          ],
        },
        "Food Security": {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Supply chain disruptions in conflict-affected areas",
            "Rising food prices due to fuel and logistics costs",
            "Food insecurity and resource strain in shelters",
          ],
        },
        Health: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Psychological distress and trauma",
            "Damage and closure of hospitals and PHCs",
            "Disruption of SRH services",
          ],
        },
        Livelihoods: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Loss of livelihoods due to deteriorating security",
            "Economic crisis reducing purchasing power",
            "Inability to meet basic needs",
          ],
        },
        Logistics: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Targeting of emergency logistics personnel",
            "Increased fuel and logistics costs",
            "Fuel shortages affecting transportation",
          ],
        },
        Nutrition: {
          severity_scale: "SEVERE",
          top3_risks: [
            "Reduced access to nutrition services for children",
            "Disruption of malnutrition treatment centres",
            "Underserved shelters lacking nutrition services",
          ],
        },
        Protection: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Loss of legal status and risk of statelessness",
            "Targeting and killing of healthcare workers",
            "Strain on health services from attacks",
          ],
        },
        Shelter: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Damage and destruction of residential buildings",
            "Housing insecurity due to high demand",
            "Congested shelters increasing disease risk",
          ],
        },
        WASH: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Risk of communicable disease outbreaks in shelters",
            "Insufficient water supply and sanitation",
            "Destruction of vital water systems",
          ],
        },
      },
      "Humanitarian Conditions": {
        Education: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Schools used as collective shelters",
            "High number of children out of school",
            "Restricted access to education",
          ],
        },
        "Food Security": {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Limited access to food and basic services",
            "Disruption of livelihoods and food sourcing",
            "Acute food insecurity in assessed households",
          ],
        },
        Health: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Healthcare facilities targeted causing closures",
            "Shortages in medicine and medical supplies",
            "Insufficient mental health support",
          ],
        },
        Livelihoods: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Loss of income due to conflict",
            "Economic crisis reducing household purchasing power",
            "Debt incurred for food and medical expenses",
          ],
        },
        Logistics: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Targeting of logistics personnel",
            "Fuel shortages impeding transportation",
            "Infrastructure damage disrupting supply chains",
          ],
        },
        Nutrition: {
          severity_scale: "SEVERE",
          top3_risks: [
            "High malnutrition rates among displaced children",
            "Disruption of nutrition services",
            "Inadequate food access in shelters",
          ],
        },
        Protection: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "GBV risks in overcrowded shelters",
            "Loss of documentation exposing persons to exploitation",
            "Attacks on healthcare workers",
          ],
        },
        Shelter: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Acute shelter shortage",
            "Overcrowded collective shelters with inadequate WASH",
            "Displaced families in unsafe makeshift shelters",
          ],
        },
        WASH: {
          severity_scale: "CRITICAL",
          top3_risks: [
            "Overcrowded shelters with inadequate WASH",
            "Insufficient safe water supply",
            "Damage to water infrastructure",
          ],
        },
      },
      "At Risk": {
        Education: {
          severity_scale: "SERIOUS",
          top3_risks: [
            "Children in shelters without education partners",
            "Psychosocial risks for displaced children",
            "Increased dropout rates",
          ],
        },
        "Food Security": {
          severity_scale: "SEVERE",
          top3_risks: [
            "Female-headed households at elevated food insecurity risk",
            "Households headed by persons with disabilities",
            "Market-dependent poor households",
          ],
        },
        Health: {
          severity_scale: "SEVERE",
          top3_risks: [
            "Pregnant women and newborns at risk",
            "Persons with chronic conditions lacking medication",
            "Children at risk of vaccine-preventable diseases",
          ],
        },
        Livelihoods: {
          severity_scale: "SERIOUS",
          top3_risks: [
            "Workers dependent on conflict-affected employers",
            "Informal sector workers without safety nets",
            "Migrant workers facing exploitation",
          ],
        },
        Protection: {
          severity_scale: "SEVERE",
          top3_risks: [
            "Women and girls at risk of GBV",
            "Stateless persons without documentation",
            "Migrant workers under kafala system",
          ],
        },
        Shelter: {
          severity_scale: "SEVERE",
          top3_risks: [
            "Displaced families unable to afford rent",
            "Persons with disabilities in inadequate shelter",
            "Families in vehicles and makeshift tents",
          ],
        },
        WASH: {
          severity_scale: "SEVERE",
          top3_risks: [
            "Children under 5 at risk of waterborne diseases",
            "Populations in overcrowded shelters",
            "Families without access to safe drinking water",
          ],
        },
      },
    },
    TOP_SECTORAL_NEEDS_DATA: {
      Education: [
        "Re-establishing access to education for children affected by the use of schools as shelters.",
      ],
      "Food Security": [
        "Provision of adequate food, water, sanitation, and health services to displaced populations.",
        "Targeted food assistance for female-headed households and households headed by persons with disabilities.",
        "Restore and maintain supply chains and market access in conflict-affected areas.",
        "Urgent food assistance to address acute and severe food insecurity affecting up to 60% of households.",
      ],
      Protection: [
        "Protection and prevention of gender-based violence, including provision of safe and private shelter.",
        "Support and protection for health facilities and healthcare workers.",
        "Restoration and protection of legal status and identity documents to prevent statelessness.",
        "Protection and medical assistance for civilians affected by violence.",
      ],
      Health: [
        "Improved access to maternal health services to reduce infection, complications, and mortality.",
        "Restoration and repair of damaged and closed hospitals and primary healthcare centers.",
        "Mental health and psychosocial support for displaced and affected populations.",
        "Provision of safe, dignified, and adequately equipped shelters to meet health needs.",
      ],
      Shelter: [
        "Provision of safe, adequate, and affordable shelter to displaced families.",
        "Support for displaced families in vehicles, unfinished buildings, and makeshift tents.",
        "Increase shelter capacity to reduce overcrowding in collective shelters.",
      ],
      WASH: [
        "Improvement of living conditions in overcrowded shelters to mitigate communicable disease outbreaks.",
        "Provision of adequate water supply including hot water and sanitation facilities in shelters.",
        "Provision of safe drinking water to prevent waterborne diseases, especially among children.",
      ],
      Livelihoods: [
        "Urgent livelihood support to restore income sources and reduce poverty.",
        "Support to restore and protect livelihoods affected by security deterioration and economic crisis.",
      ],
      Logistics: [
        "Protection of civil administration and emergency logistics personnel and facilities.",
        "Psychosocial support services to address trauma caused by violence and targeted assassinations.",
      ],
    },
    TOP_PRIORITY_INTERVENTIONS_DATA: {
      Protection: [
        "Provide emergency medical care and protection services for victims of violence and displacement.",
        "Implement GBV prevention and response programs, including safe shelter with gender-segregated WASH.",
        "Provide security and resources to health facilities and personnel, including mobile medical services.",
        "Legal aid and administrative support to restore and secure legal status and identity documentation.",
      ],
      Health: [
        "Provision of emergency maternal health care and safe delivery services.",
        "Rapid rehabilitation and reopening of damaged and closed health facilities.",
        "Provision of comprehensive mental health and psychosocial support services in shelters.",
      ],
      "Food Security": [
        "Implement targeted food security programs for female-headed and disabled-headed households.",
        "Strengthen supply chain logistics and security measures in conflict-affected regions.",
        "Provision of emergency food aid and nutrition programs targeting severely food insecure households.",
        "Humanitarian food assistance including hot meals, ready-to-eat foods, and food parcels to IDPs.",
      ],
      Shelter: [
        "Emergency shelter provision and rehabilitation of damaged residential buildings.",
        "Provide emergency shelter materials for those in vehicles, open areas, and makeshift shelters.",
        "Expand and improve collective shelter facilities to accommodate more displaced persons.",
      ],
      WASH: [
        "Emergency WASH service provision including water supply, sanitation, and hygiene kits.",
        "Distribution of safe drinking water and water treatment solutions to prevent waterborne diseases.",
        "Provision and maintenance of adequate WASH services in collective shelters.",
      ],
      Livelihoods: [
        "Provision of cash assistance and livelihood programs to displaced and vulnerable host communities.",
        "Livelihoods support programs targeting low-income and displaced households.",
      ],
      Education: [
        "Provision of alternative safe learning spaces and Education in Emergencies programs.",
      ],
      Logistics: [
        "Emergency logistics protection and restoration measures for civil administration and NGOs.",
      ],
    },
    TOP_5_SOURCES_DATA: [
      "Protection Analysis and Monitoring Task Force (PAMTF)",
      "World Food Programme",
      "Inter-Sector Coordination Group",
      "World Health Organization",
      "Ministry of Public Health",
    ],
    INFORMATION_COVERAGE_DATA: {
      overall_score: 7.1,
      analysis: [
        {
          pillar: "At Risk",
          entries: [
            {
              sector: "Education",
              coverage: 4,
              gaps: [
                "Quantitative data on affected children or schools",
                "Geographic distribution of risks",
              ],
            },
            {
              sector: "Food Security",
              coverage: 7,
              gaps: [
                "Geographic distribution of food insecurity",
                "Detailed demographic breakdown",
              ],
            },
            {
              sector: "Health",
              coverage: 7,
              gaps: ["Health service coverage and access rates", "Morbidity and mortality statistics"],
            },
            {
              sector: "Livelihoods",
              coverage: 3,
              gaps: ["Number of affected workers", "Severity quantification"],
            },
            {
              sector: "Nutrition",
              coverage: 2,
              gaps: ["Main nutrition-related risks and vulnerabilities", "Severity assessment of risks"],
            },
            {
              sector: "Protection",
              coverage: 7,
              gaps: ["Total displaced affected by loss of documentation", "GBV incidence rates"],
            },
            {
              sector: "Shelter",
              coverage: 8,
              gaps: ["Disease outbreak severity linked to shelter conditions"],
            },
            {
              sector: "WASH",
              coverage: 7,
              gaps: ["WASH service coverage data", "Waterborne disease incidence rates"],
            },
          ],
        },
        {
          pillar: "Impact",
          entries: [
            { sector: "Education", coverage: 8, gaps: ["Quality of alternative education arrangements"] },
            { sector: "Food Security", coverage: 8, gaps: ["Geographic breakdown of food insecurity severity"] },
            {
              sector: "Health",
              coverage: 8,
              gaps: ["Facility-level damage data", "Disaggregated data by vulnerable group"],
            },
            { sector: "Livelihoods", coverage: 7, gaps: ["Geographic distribution of livelihood losses"] },
            { sector: "Protection", coverage: 8, gaps: ["Comprehensive GBV incident reporting"] },
            { sector: "Shelter", coverage: 9, gaps: ["Shelter quality standards in collective centres"] },
            { sector: "WASH", coverage: 8, gaps: ["Water quality testing data"] },
          ],
        },
        {
          pillar: "Humanitarian Conditions",
          entries: [
            { sector: "Education", coverage: 7, gaps: ["Dropout rates and learning loss data"] },
            { sector: "Food Security", coverage: 8, gaps: ["Dietary diversity scores"] },
            { sector: "Health", coverage: 7, gaps: ["Utilization rates for health facilities"] },
            { sector: "Shelter", coverage: 8, gaps: ["Occupancy rates in collective centres"] },
            { sector: "WASH", coverage: 7, gaps: ["Hygiene practice data"] },
          ],
        },
      ],
    },
  },
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
  { key: "lebanon", label: "Lebanon", crisis: "Lebanon Crisis 2026" },
  { key: "sudan", label: "Sudan", crisis: "Sudan Crisis 2026" },
];

export const SOURCE_META: Record<CountryKey, Array<{ org: string; type: string; url: string; desc: string }>> = {
  lebanon: [
    {
      org: "Protection Analysis and Monitoring Task Force (PAMTF)",
      type: "Coordination Body",
      url: "https://www.unhcr.org/lb",
      desc: "Multi-agency protection monitoring and analysis coordination group for Lebanon.",
    },
    {
      org: "World Food Programme",
      type: "UN Agency",
      url: "https://www.wfp.org/countries/lebanon",
      desc: "Primary source for food security assessments and IDP food assistance data in Lebanon.",
    },
    {
      org: "Inter-Sector Coordination Group",
      type: "Coordination Body",
      url: "https://www.humanitarianresponse.info/en/operations/lebanon",
      desc: "Coordination hub consolidating sectoral situation reports across all humanitarian clusters.",
    },
    {
      org: "World Health Organization",
      type: "UN Agency",
      url: "https://www.emro.who.int/lbn",
      desc: "Health sector data including facility damage assessments and health worker incident tracking.",
    },
    {
      org: "Ministry of Public Health Lebanon",
      type: "Government",
      url: "https://www.moph.gov.lb",
      desc: "Official government health data including hospital closures and PHC status.",
    },
  ],
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
