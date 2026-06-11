/* ========== Location Data ========== */
export const locationData = {
  regions: [
    { id: "east-africa", name: "East Africa and Yemen", countries: ["ethiopia", "kenya", "somalia", "yemen", "south-sudan", "uganda"] },
    { id: "central-west-africa", name: "Central and West Africa", countries: ["cameroon", "car", "drc", "mali", "niger", "nigeria", "burkina-faso"] },
    { id: "middle-east", name: "Middle East", countries: ["iraq", "jordan", "lebanon", "syria", "palestine"] },
    { id: "asia", name: "Asia", countries: ["afghanistan", "myanmar", "pakistan"] },
    { id: "europe", name: "Europe", countries: ["ukraine"] },
    { id: "americas", name: "Americas", countries: ["colombia", "venezuela"] },
  ],
  countries: {
    ethiopia: { name: "Ethiopia", zones: ["somali", "afar", "oromia", "tigray", "amhara", "snnp"] },
    kenya: { name: "Kenya", zones: ["turkana", "garissa", "wajir", "mandera", "nairobi"] },
    somalia: { name: "Somalia", zones: ["mogadishu", "puntland", "somaliland", "jubaland"] },
    yemen: { name: "Yemen", zones: ["aden", "sanaa", "taiz", "hodeidah"] },
    "south-sudan": { name: "South Sudan", zones: ["juba", "upper-nile", "jonglei"] },
    uganda: { name: "Uganda", zones: ["kampala", "west-nile", "karamoja"] },
    iraq: { name: "Iraq", zones: ["baghdad", "erbil", "mosul", "basra"] },
    syria: { name: "Syria", zones: ["damascus", "aleppo", "idlib", "homs"] },
    afghanistan: { name: "Afghanistan", zones: ["kabul", "herat", "kandahar", "mazar"] },
    ukraine: { name: "Ukraine", zones: ["kyiv", "kharkiv", "odesa", "lviv"] },
    colombia: { name: "Colombia", zones: ["bogota", "medellin", "cali"] },
  } as Record<string, { name: string; zones: string[] }>,
  zones: {
    somali: { name: "Somali Region" },
    afar: { name: "Afar Region" },
    oromia: { name: "Oromia Region" },
    tigray: { name: "Tigray Region" },
    amhara: { name: "Amhara Region" },
    snnp: { name: "SNNP Region" },
  } as Record<string, { name: string }>,
};

/* ========== Content Type Options ========== */
// labelKey: i18n keys under knowledge.types.* - resolved via t() at render time.
export const contentTypes = [
  { value: "all", labelKey: "all" },
  { value: "protocol", labelKey: "protocol" },
  { value: "guideline", labelKey: "guideline" },
  { value: "template", labelKey: "template" },
  { value: "contact", labelKey: "contact" },
  { value: "training", labelKey: "training" },
] as const;

/* ========== Active Crises Data ========== */
export interface CrisisResource {
  title: string;
  type: string;
  updated: string;
  priority: boolean;
}

export interface ActiveCrisis {
  id: string;
  name: string;
  location: string;
  severity: "high" | "moderate" | "low";
  region: string;
  country: string;
  zone: string;
  resources: CrisisResource[];
}

export const activeCrises: ActiveCrisis[] = [
  {
    id: "cholera-somali",
    name: "Cholera Outbreak",
    location: "Somali Region, Ethiopia",
    severity: "high",
    region: "east-africa",
    country: "ethiopia",
    zone: "somali",
    resources: [
      { title: "NRC Cholera Response Protocol", type: "protocol", updated: "Oct 2025", priority: true },
      { title: "WHO Cholera Treatment Guidelines", type: "guideline", updated: "2024 Edition", priority: false },
      { title: "WASH in Cholera Outbreaks", type: "guideline", updated: "Sphere Standards", priority: false },
      { title: "Cholera Rapid Assessment Tool", type: "template", updated: "Sep 2025", priority: false },
    ],
  },
  {
    id: "flood-afar",
    name: "Flood Emergency",
    location: "Afar Region, Ethiopia",
    severity: "moderate",
    region: "east-africa",
    country: "ethiopia",
    zone: "afar",
    resources: [
      { title: "Flood Early Warning SOP", type: "protocol", updated: "Ethiopia specific", priority: false },
      { title: "Shelter & NFI Kit Standards", type: "guideline", updated: "NRC Global", priority: false },
      { title: "Flood Damage Assessment Form", type: "template", updated: "Aug 2025", priority: false },
    ],
  },
  {
    id: "drought-oromia",
    name: "Drought Response",
    location: "Oromia Region, Ethiopia",
    severity: "moderate",
    region: "east-africa",
    country: "ethiopia",
    zone: "oromia",
    resources: [
      { title: "Drought Early Warning Protocol", type: "protocol", updated: "Jul 2025", priority: false },
      { title: "Cash Transfer Guidelines", type: "guideline", updated: "Aug 2025", priority: false },
    ],
  },
];

/* ========== Documents Data ========== */
export interface Document {
  id: number;
  title: string;
  type: string;
  sector: string;
  region: string;
  country: string;
  updated: string;
  downloads: number;
  categoryColor: string;
  categoryBg: string;
  iconColor: string;
}

export const allDocuments: Document[] = [
  { id: 1, title: "Emergency Response Activation Protocol", type: "protocol", sector: "Multi-sector", region: "all", country: "all", updated: "Oct 2025", downloads: 234, categoryColor: "#DC2626", categoryBg: "#FEE2E2", iconColor: "#DC2626" },
  { id: 2, title: "Rapid Assessment Tool - Ethiopia", type: "template", sector: "Multi-sector", region: "east-africa", country: "ethiopia", updated: "Sep 2025", downloads: 189, categoryColor: "#2563EB", categoryBg: "#DBEAFE", iconColor: "#2563EB" },
  { id: 3, title: "Cash Transfer Guidelines", type: "guideline", sector: "Cash", region: "all", country: "all", updated: "Aug 2025", downloads: 156, categoryColor: "#059669", categoryBg: "#D1FAE5", iconColor: "#059669" },
  { id: 4, title: "WASH Minimum Standards", type: "guideline", sector: "WASH", region: "all", country: "all", updated: "Jul 2025", downloads: 312, categoryColor: "#2563EB", categoryBg: "#DBEAFE", iconColor: "#A3A3A3" },
  { id: 5, title: "Beneficiary Registration Form", type: "template", sector: "Multi-sector", region: "all", country: "all", updated: "Jun 2025", downloads: 445, categoryColor: "#D97706", categoryBg: "#FEF3C7", iconColor: "#A3A3A3" },
  { id: 6, title: "Coordination Meeting Template", type: "template", sector: "Coordination", region: "all", country: "all", updated: "May 2025", downloads: 278, categoryColor: "#7C3AED", categoryBg: "#F3E8FF", iconColor: "#A3A3A3" },
  { id: 7, title: "Protection Monitoring Guidelines", type: "guideline", sector: "Protection", region: "all", country: "all", updated: "Apr 2025", downloads: 198, categoryColor: "#059669", categoryBg: "#D1FAE5", iconColor: "#A3A3A3" },
  { id: 8, title: "Somalia Context Analysis", type: "guideline", sector: "Multi-sector", region: "east-africa", country: "somalia", updated: "Mar 2025", downloads: 145, categoryColor: "#059669", categoryBg: "#D1FAE5", iconColor: "#A3A3A3" },
  { id: 9, title: "Ethiopia Emergency Protocols", type: "protocol", sector: "Multi-sector", region: "east-africa", country: "ethiopia", updated: "Feb 2025", downloads: 267, categoryColor: "#DC2626", categoryBg: "#FEE2E2", iconColor: "#DC2626" },
  { id: 10, title: "Field Staff Training Manual", type: "training", sector: "Multi-sector", region: "all", country: "all", updated: "Jan 2025", downloads: 389, categoryColor: "#7C3AED", categoryBg: "#F3E8FF", iconColor: "#A3A3A3" },
];

/* ========== Contacts Data ========== */
export interface Contact {
  id: number;
  name: string;
  org: string;
  role: string;
  region: string;
  country: string;
  zone: string;
}

export const allContacts: Contact[] = [
  { id: 1, name: "Melese A.", org: "NRC Ethiopia", role: "Emergency Coordinator", region: "east-africa", country: "ethiopia", zone: "all" },
  { id: 2, name: "Dr. Sarah M.", org: "WHO", role: "Health Cluster Lead", region: "east-africa", country: "ethiopia", zone: "somali" },
  { id: 3, name: "Ahmed H.", org: "UNICEF", role: "WASH Cluster Lead", region: "east-africa", country: "ethiopia", zone: "somali" },
  { id: 4, name: "Maria L.", org: "WFP", role: "Logistics Cluster Lead", region: "east-africa", country: "ethiopia", zone: "all" },
  { id: 5, name: "Regional EOC", org: "Somali Region Govt", role: "Govt. Coordination", region: "east-africa", country: "ethiopia", zone: "somali" },
  { id: 6, name: "James K.", org: "NRC Kenya", role: "Country Director", region: "east-africa", country: "kenya", zone: "all" },
  { id: 7, name: "Fatima A.", org: "UNHCR", role: "Protection Officer", region: "east-africa", country: "ethiopia", zone: "afar" },
];

/* ========== Type Color Helper ========== */
export function getTypeColor(type: string): { color: string; bg: string } {
  switch (type) {
    case "protocol": return { color: "#DC2626", bg: "#FEE2E2" };
    case "guideline": return { color: "#059669", bg: "#D1FAE5" };
    case "template": return { color: "#2563EB", bg: "#DBEAFE" };
    case "training": return { color: "#7C3AED", bg: "#F3E8FF" };
    default: return { color: "#525252", bg: "#F5F5F5" };
  }
}

/* ========== HumChat Example Questions ========== */
// i18n keys under knowledge.humchat.examples.* - resolved via t() at render time.
export const exampleQuestions = ["displacement", "interventions", "assessment"] as const;

/* ========== HumChat Response Generator (Fallback) ========== */
export const generateResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("displacement") || lowerMessage.includes("trend") || lowerMessage.includes("analyze")) {
    return `**Displacement Analysis: Somali Region**

**Current Situation**
- Total IDPs: 1.2M (as of Jan 2026)
- New displacements (30 days): 45,200
- Primary drivers: Drought (62%), Conflict (28%), Floods (10%)

**Key Trends**
1. Westward movement toward urban centers increasing
2. Secondary displacement from overcrowded sites
3. Cross-border movement to Kenya decreasing

**Recommendations**
- Expand site capacity in Jigjiga zone
- Pre-position NFI stock in Gode
- Strengthen protection monitoring`;
  }

  if (lowerMessage.includes("health") || lowerMessage.includes("priority") || lowerMessage.includes("intervention")) {
    return `**Priority Health Interventions**

**Immediate Priorities (0-72 hours)**
1. Cholera response - ORS distribution & treatment centers
2. Maternal health - Emergency obstetric care
3. Malnutrition - SAM/MAM screening & treatment

**Resource Requirements**
- 50,000 ORS sachets
- 200 cholera treatment kits
- 15 additional health workers
- Mobile health teams (3 units)`;
  }

  if (lowerMessage.includes("assessment") || lowerMessage.includes("protection") || lowerMessage.includes("rapid")) {
    return `**Rapid Protection Assessment Plan**

**Assessment Objectives**
1. Identify protection risks and vulnerable groups
2. Map existing protection services
3. Assess community-based protection mechanisms

**Methodology**
- Duration: 5 days
- Team: 4 protection officers, 2 interpreters
- Data collection: KIIs, FGDs, observation`;
  }

  if (lowerMessage.includes("coordination") || lowerMessage.includes("mechanism")) {
    return `**Coordination Mechanisms**

**Recommended Structure**
- Strategic Level: Inter-cluster (Weekly), Govt liaison (Bi-weekly)
- Operational Level: Sector working groups (Weekly)
- Field Level: Site coordination (Daily)

**Key Stakeholders**
- OCHA: Coordination lead
- NRC: Camp management
- WHO: Health cluster`;
  }

  return `Thank you for your question. I can help you with:

1. **Analysis** - Situation briefs, trend analysis
2. **Planning** - Response planning, resource allocation
3. **Protocols** - SOPs, guidelines
4. **Coordination** - Meeting briefs, communications

Please provide more details about the specific crisis or location.`;
};

/* ========== HumChat Message Type ========== */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// content is resolved via the knowledge.humchat.welcome i18n key at render time.
export const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "",
  timestamp: new Date(),
};
