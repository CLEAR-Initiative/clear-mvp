/**
 * NRC (Norwegian Refugee Council) Operating Locations
 * Ported from ARCHIVE-CLEAR-v1/apps/client/src/data/nrcLocations.ts
 *
 * TODO(demo): This is static reference data used for the demo dashboard.
 * - Office locations (nrcLocations) should eventually come from an NRC directory API.
 * - Crisis pins (sudanCrisisPins, ethiopiaCrisisPins) are hardcoded demo data;
 *   replace with real crisis events from the Django backend / detection pipeline.
 */

export interface NRCLocation {
  id: string;
  country: string;
  region: NRCRegion;
  subRegion?: string;
  capital: string;
  latitude: number;
  longitude: number;
  operationTypes: NRCOperationType[];
  staffCount?: number;
  yearEstablished?: number;
  description?: string;
  isActive: boolean;
}

export type NRCRegion =
  | "East Africa and Yemen"
  | "Central and West Africa"
  | "Southern Africa"
  | "Middle East"
  | "Asia"
  | "Europe"
  | "Americas"
  | "Representation Office";

export type NRCOperationType =
  | "Education"
  | "Food Security"
  | "Legal Assistance (ICLA)"
  | "Shelter and Settlements"
  | "WASH"
  | "Camp Management"
  | "Protection"
  | "Livelihoods"
  | "Cash Assistance";

export const nrcOperationDescriptions: Record<NRCOperationType, string> = {
  Education: "Ensuring displaced children access quality education",
  "Food Security": "Addressing hunger and food insecurity",
  "Legal Assistance (ICLA)": "Helping obtain documentation and exercise rights",
  "Shelter and Settlements": "Providing safe and dignified housing",
  WASH: "Clean water and sanitation facilities",
  "Camp Management": "Coordinating services in displacement sites",
  Protection: "Protecting vulnerable populations from harm",
  Livelihoods: "Supporting income generation and self-reliance",
  "Cash Assistance": "Direct cash transfers to affected families",
};

export const nrcLocations: NRCLocation[] = [
  // EAST AFRICA AND YEMEN
  {
    id: "djibouti",
    country: "Djibouti",
    region: "East Africa and Yemen",
    capital: "Djibouti City",
    latitude: 11.5886,
    longitude: 43.1456,
    operationTypes: ["Shelter and Settlements", "WASH", "Education"],
    isActive: true,
    description: "Supporting refugees and migrants at the crossroads of Africa and the Middle East",
  },
  {
    id: "eritrea",
    country: "Eritrea",
    region: "East Africa and Yemen",
    capital: "Asmara",
    latitude: 15.3229,
    longitude: 38.9251,
    operationTypes: ["Legal Assistance (ICLA)", "Protection"],
    isActive: true,
    description: "Providing protection and legal assistance to vulnerable populations",
  },
  {
    id: "ethiopia",
    country: "Ethiopia",
    region: "East Africa and Yemen",
    capital: "Addis Ababa",
    latitude: 9.032,
    longitude: 38.7469,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Legal Assistance (ICLA)"],
    isActive: true,
    yearEstablished: 2011,
    description: "Responding to displacement caused by conflict and climate emergencies across multiple regions",
  },
  {
    id: "kenya",
    country: "Kenya",
    region: "East Africa and Yemen",
    capital: "Nairobi",
    latitude: -1.2921,
    longitude: 36.8219,
    operationTypes: ["Education", "Legal Assistance (ICLA)", "Shelter and Settlements", "Livelihoods"],
    isActive: true,
    description: "Supporting refugees in Dadaab and Kakuma camps, as well as urban refugees in Nairobi",
  },
  {
    id: "somalia",
    country: "Somalia",
    region: "East Africa and Yemen",
    capital: "Mogadishu",
    latitude: 2.0469,
    longitude: 45.3182,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Camp Management"],
    isActive: true,
    yearEstablished: 2004,
    description: "One of NRC's largest operations, responding to conflict and climate displacement",
  },
  {
    id: "south-sudan",
    country: "South Sudan",
    region: "East Africa and Yemen",
    capital: "Juba",
    latitude: 4.8594,
    longitude: 31.5713,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Camp Management", "Legal Assistance (ICLA)"],
    isActive: true,
    yearEstablished: 2004,
    description: "Comprehensive humanitarian response across multiple states including Aweil, Wau, Bor, and Juba",
  },
  {
    id: "tanzania",
    country: "Tanzania",
    region: "East Africa and Yemen",
    capital: "Dodoma",
    latitude: -6.163,
    longitude: 35.7516,
    operationTypes: ["Shelter and Settlements", "WASH", "Education"],
    isActive: true,
    yearEstablished: 2015,
    description: "Supporting Burundian and Congolese refugees in Mtendeli, Nduta, and Nyarugusu camps",
  },
  {
    id: "uganda",
    country: "Uganda",
    region: "East Africa and Yemen",
    capital: "Kampala",
    latitude: 0.3476,
    longitude: 32.5825,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Legal Assistance (ICLA)", "Livelihoods"],
    isActive: true,
    description: "Supporting one of Africa's largest refugee populations from South Sudan and DRC",
  },
  {
    id: "yemen",
    country: "Yemen",
    region: "East Africa and Yemen",
    capital: "Sana'a",
    latitude: 15.3694,
    longitude: 44.191,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Legal Assistance (ICLA)"],
    isActive: true,
    yearEstablished: 2009,
    description: "Responding to one of the world's worst humanitarian crises with multi-sector assistance",
  },

  // CENTRAL AND WEST AFRICA
  {
    id: "burkina-faso",
    country: "Burkina Faso",
    region: "Central and West Africa",
    capital: "Ouagadougou",
    latitude: 12.2383,
    longitude: -1.5616,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security"],
    isActive: true,
    yearEstablished: 2019,
    description: "Responding to the rapidly growing displacement crisis in the Sahel region",
  },
  {
    id: "cameroon",
    country: "Cameroon",
    region: "Central and West Africa",
    capital: "Yaoundé",
    latitude: 3.848,
    longitude: 11.5021,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Legal Assistance (ICLA)"],
    isActive: true,
    description: "Supporting refugees from CAR and Nigeria, and IDPs in Anglophone regions",
  },
  {
    id: "car",
    country: "Central African Republic",
    region: "Central and West Africa",
    capital: "Bangui",
    latitude: 4.3947,
    longitude: 18.5582,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Camp Management"],
    isActive: true,
    yearEstablished: 2014,
    description: "Providing humanitarian assistance to communities affected by protracted conflict",
  },
  {
    id: "chad",
    country: "Chad",
    region: "Central and West Africa",
    capital: "N'Djamena",
    latitude: 12.1348,
    longitude: 15.0557,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security"],
    isActive: true,
    description: "Supporting Sudanese refugees and host communities affected by regional crises",
  },
  {
    id: "drc",
    country: "Democratic Republic of the Congo",
    region: "Central and West Africa",
    capital: "Kinshasa",
    latitude: -4.4419,
    longitude: 15.2663,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Camp Management", "Protection"],
    isActive: true,
    yearEstablished: 2001,
    description: "Responding to complex displacement in North Kivu, South Kivu, Ituri, and Tanganyika",
  },
  {
    id: "mali",
    country: "Mali",
    region: "Central and West Africa",
    capital: "Bamako",
    latitude: 12.6392,
    longitude: -8.0029,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Legal Assistance (ICLA)"],
    isActive: true,
    description: "Supporting displaced populations affected by conflict in the Sahel",
  },
  {
    id: "niger",
    country: "Niger",
    region: "Central and West Africa",
    capital: "Niamey",
    latitude: 13.5137,
    longitude: 2.1098,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security"],
    isActive: true,
    yearEstablished: 2019,
    description: "Responding to displacement from Mali, Nigeria, and internal conflicts",
  },
  {
    id: "nigeria",
    country: "Nigeria",
    region: "Central and West Africa",
    capital: "Abuja",
    latitude: 9.0765,
    longitude: 7.3986,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Legal Assistance (ICLA)", "Livelihoods"],
    isActive: true,
    yearEstablished: 2015,
    description: "Supporting millions displaced by conflict in Borno, Adamawa, and Yobe states",
  },

  // SOUTHERN AFRICA
  {
    id: "libya",
    country: "Libya",
    region: "Southern Africa",
    subRegion: "North Africa",
    capital: "Tripoli",
    latitude: 32.8872,
    longitude: 13.1913,
    operationTypes: ["Legal Assistance (ICLA)", "Protection", "WASH"],
    isActive: true,
    description: "Providing protection and assistance to migrants, refugees, and displaced Libyans",
  },
  {
    id: "sudan",
    country: "Sudan",
    region: "Southern Africa",
    subRegion: "North Africa",
    capital: "Khartoum",
    latitude: 15.5007,
    longitude: 32.5599,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Camp Management"],
    isActive: true,
    description: "Responding to the acute crisis following the 2023 conflict, with operations in multiple states",
  },
  {
    id: "mozambique",
    country: "Mozambique",
    region: "Southern Africa",
    capital: "Maputo",
    latitude: -25.9692,
    longitude: 32.5732,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security"],
    isActive: true,
    description: "Supporting communities affected by conflict in Cabo Delgado and climate disasters",
  },

  // MIDDLE EAST
  {
    id: "iraq",
    country: "Iraq",
    region: "Middle East",
    capital: "Baghdad",
    latitude: 33.3128,
    longitude: 44.3615,
    operationTypes: ["Shelter and Settlements", "Education", "Legal Assistance (ICLA)", "Camp Management", "Livelihoods"],
    isActive: true,
    yearEstablished: 2010,
    description: "Supporting returnees, IDPs, and refugees with durable solutions and recovery assistance",
  },
  {
    id: "jordan",
    country: "Jordan",
    region: "Middle East",
    capital: "Amman",
    latitude: 31.9454,
    longitude: 35.9284,
    operationTypes: ["Education", "Legal Assistance (ICLA)", "Shelter and Settlements", "Livelihoods"],
    isActive: true,
    yearEstablished: 2012,
    description: "Supporting Syrian refugees and vulnerable Jordanian communities",
  },
  {
    id: "lebanon",
    country: "Lebanon",
    region: "Middle East",
    capital: "Beirut",
    latitude: 33.8938,
    longitude: 35.5018,
    operationTypes: ["Education", "Legal Assistance (ICLA)", "Shelter and Settlements", "Livelihoods"],
    isActive: true,
    yearEstablished: 2006,
    description: "One of NRC's largest operations, supporting Syrian and Palestinian refugees",
  },
  {
    id: "palestine",
    country: "Palestine",
    region: "Middle East",
    capital: "Ramallah",
    latitude: 31.9038,
    longitude: 35.2034,
    operationTypes: ["Legal Assistance (ICLA)", "Shelter and Settlements", "Education", "WASH"],
    isActive: true,
    yearEstablished: 2009,
    description: "Providing humanitarian assistance in the West Bank and Gaza Strip",
  },
  {
    id: "syria",
    country: "Syria",
    region: "Middle East",
    capital: "Damascus",
    latitude: 33.5138,
    longitude: 36.2765,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Food Security", "Legal Assistance (ICLA)", "Livelihoods"],
    isActive: true,
    yearEstablished: 2016,
    description: "Providing multi-sector assistance to displaced Syrians and affected communities",
  },

  // ASIA
  {
    id: "afghanistan",
    country: "Afghanistan",
    region: "Asia",
    capital: "Kabul",
    latitude: 34.5553,
    longitude: 69.2075,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Legal Assistance (ICLA)", "Food Security"],
    isActive: true,
    yearEstablished: 2003,
    description: "One of the largest humanitarian operations, serving millions affected by conflict and crisis",
  },
  {
    id: "bangladesh",
    country: "Bangladesh",
    region: "Asia",
    capital: "Dhaka",
    latitude: 23.8103,
    longitude: 90.4125,
    operationTypes: ["Shelter and Settlements", "Education", "Legal Assistance (ICLA)", "Camp Management", "WASH"],
    isActive: true,
    yearEstablished: 2017,
    description: "Supporting Rohingya refugees in Cox's Bazar, the world's largest refugee camp",
  },
  {
    id: "iran",
    country: "Iran",
    region: "Asia",
    capital: "Tehran",
    latitude: 35.6892,
    longitude: 51.389,
    operationTypes: ["Legal Assistance (ICLA)", "Education", "Livelihoods"],
    isActive: true,
    description: "Supporting Afghan refugees with education and legal assistance",
  },
  {
    id: "myanmar",
    country: "Myanmar",
    region: "Asia",
    capital: "Naypyidaw",
    latitude: 19.7633,
    longitude: 96.0785,
    operationTypes: ["Shelter and Settlements", "WASH", "Education", "Camp Management", "Protection"],
    isActive: true,
    description: "Responding to complex displacement across Rakhine, Kachin, and other states",
  },

  // EUROPE
  {
    id: "moldova",
    country: "Moldova",
    region: "Europe",
    capital: "Chișinău",
    latitude: 47.0105,
    longitude: 28.8638,
    operationTypes: ["Legal Assistance (ICLA)", "Protection", "Cash Assistance"],
    isActive: true,
    yearEstablished: 2022,
    description: "Supporting Ukrainian refugees with legal assistance and social support",
  },
  {
    id: "poland",
    country: "Poland",
    region: "Europe",
    capital: "Warsaw",
    latitude: 52.2297,
    longitude: 21.0122,
    operationTypes: ["Legal Assistance (ICLA)", "Education", "Protection", "Cash Assistance"],
    isActive: true,
    yearEstablished: 2022,
    description: "Supporting Ukrainian refugees with integration, education, and legal assistance",
  },
  {
    id: "romania",
    country: "Romania",
    region: "Europe",
    capital: "Bucharest",
    latitude: 44.4268,
    longitude: 26.1025,
    operationTypes: ["Legal Assistance (ICLA)", "Protection", "Cash Assistance"],
    isActive: true,
    yearEstablished: 2022,
    description: "Providing humanitarian assistance to Ukrainian refugees",
  },
  {
    id: "ukraine",
    country: "Ukraine",
    region: "Europe",
    capital: "Kyiv",
    latitude: 50.4501,
    longitude: 30.5234,
    operationTypes: ["Shelter and Settlements", "WASH", "Legal Assistance (ICLA)", "Cash Assistance", "Protection", "Food Security"],
    isActive: true,
    yearEstablished: 2014,
    description: "Major emergency response supporting millions displaced by the ongoing conflict",
  },

  // AMERICAS
  {
    id: "colombia",
    country: "Colombia",
    region: "Americas",
    capital: "Bogotá",
    latitude: 4.711,
    longitude: -74.0721,
    operationTypes: ["Legal Assistance (ICLA)", "Shelter and Settlements", "Education", "Livelihoods"],
    isActive: true,
    yearEstablished: 1999,
    description: "Supporting displaced Colombians and Venezuelan refugees across multiple regions",
  },
  {
    id: "ecuador",
    country: "Ecuador",
    region: "Americas",
    capital: "Quito",
    latitude: -0.1807,
    longitude: -78.4678,
    operationTypes: ["Legal Assistance (ICLA)", "Shelter and Settlements", "Livelihoods"],
    isActive: true,
    description: "Supporting Venezuelan refugees and migrants with protection and assistance",
  },
  {
    id: "el-salvador",
    country: "El Salvador",
    region: "Americas",
    capital: "San Salvador",
    latitude: 13.6929,
    longitude: -89.2182,
    operationTypes: ["Legal Assistance (ICLA)", "Protection"],
    isActive: true,
    description: "Providing protection and legal assistance to vulnerable populations",
  },
  {
    id: "guatemala",
    country: "Guatemala",
    region: "Americas",
    capital: "Guatemala City",
    latitude: 14.6349,
    longitude: -90.5069,
    operationTypes: ["Legal Assistance (ICLA)", "Protection", "Shelter and Settlements"],
    isActive: true,
    description: "Supporting displaced populations and deportees with protection services",
  },
  {
    id: "honduras",
    country: "Honduras",
    region: "Americas",
    capital: "Tegucigalpa",
    latitude: 14.0723,
    longitude: -87.1921,
    operationTypes: ["Legal Assistance (ICLA)", "Protection", "Shelter and Settlements"],
    isActive: true,
    description: "Providing humanitarian assistance to vulnerable communities and displaced persons",
  },
  {
    id: "mexico",
    country: "Mexico",
    region: "Americas",
    capital: "Mexico City",
    latitude: 19.4326,
    longitude: -99.1332,
    operationTypes: ["Legal Assistance (ICLA)", "Protection", "Shelter and Settlements"],
    isActive: true,
    description: "Supporting migrants, refugees, and asylum seekers along migration routes",
  },
  {
    id: "panama",
    country: "Panama",
    region: "Americas",
    capital: "Panama City",
    latitude: 9.1012,
    longitude: -79.4029,
    operationTypes: ["Legal Assistance (ICLA)", "Protection", "WASH"],
    isActive: true,
    description: "Providing humanitarian assistance to migrants crossing the Darién Gap",
  },
  {
    id: "venezuela",
    country: "Venezuela",
    region: "Americas",
    capital: "Caracas",
    latitude: 10.4806,
    longitude: -66.9036,
    operationTypes: ["Food Security", "Shelter and Settlements", "WASH", "Livelihoods"],
    isActive: true,
    description: "Supporting vulnerable communities with food security and livelihoods assistance",
  },

  // REPRESENTATION OFFICES
  {
    id: "belgium",
    country: "Belgium",
    region: "Representation Office",
    capital: "Brussels",
    latitude: 50.8503,
    longitude: 4.3517,
    operationTypes: [],
    isActive: true,
    description: "NRC EU Representation Office for advocacy with European Union institutions",
  },
  {
    id: "switzerland",
    country: "Switzerland",
    region: "Representation Office",
    capital: "Geneva",
    latitude: 46.2044,
    longitude: 6.1432,
    operationTypes: [],
    isActive: true,
    description: "NRC Geneva Office for UN coordination and humanitarian policy",
  },
  {
    id: "usa",
    country: "United States",
    region: "Representation Office",
    capital: "Washington D.C.",
    latitude: 38.9072,
    longitude: -77.0369,
    operationTypes: [],
    isActive: true,
    description: "NRC USA Office for advocacy and partnership with US government",
  },
  {
    id: "germany",
    country: "Germany",
    region: "Representation Office",
    capital: "Berlin",
    latitude: 52.52,
    longitude: 13.405,
    operationTypes: [],
    isActive: true,
    description: "NRC Germany Office for advocacy and donor relations",
  },
  {
    id: "uk",
    country: "United Kingdom",
    region: "Representation Office",
    capital: "London",
    latitude: 51.5074,
    longitude: -0.1278,
    operationTypes: [],
    isActive: true,
    description: "NRC UK Office for advocacy and partnership development",
  },
];

export const regionColors: Record<NRCRegion, string> = {
  "East Africa and Yemen": "#FF6B35",
  "Central and West Africa": "#F7C948",
  "Southern Africa": "#E53E3E",
  "Middle East": "#3182CE",
  Asia: "#48BB78",
  Europe: "#805AD5",
  Americas: "#ED8936",
  "Representation Office": "#718096",
};

export const getOperationalLocations = (): NRCLocation[] =>
  nrcLocations.filter((loc) => loc.region !== "Representation Office" && loc.isActive);

export const getLocationsByRegion = (region: NRCRegion): NRCLocation[] =>
  nrcLocations.filter((loc) => loc.region === region);

export const nrcStatistics = {
  totalCountries: nrcLocations.filter((loc) => loc.region !== "Representation Office").length,
  activeOperations: nrcLocations.filter((loc) => loc.isActive && loc.region !== "Representation Office").length,
  regionCount: 6,
  staffCount: 16500,
  yearFounded: 1946,
};

// Countries with full crisis pin data
export const CRISIS_COUNTRIES = new Set(["Sudan", "Ethiopia"]);

export type CrisisPinType = "crisis" | "conflict" | "cholera" | "flood" | "drought" | "famine" | "team";

export interface CrisisPin {
  id: string;
  name: string;
  coordinates: [number, number];
  severity: "critical" | "high" | "medium" | "response";
  type: CrisisPinType;
  trend?: string;
  region?: string;
  cases?: number;
  affectedPopulation?: number;
  members?: number;
  status?: string;
}

export const sudanCrisisPins: CrisisPin[] = [
  // TODO(demo): static crisis pins — replace with live data from crisis detection API
  { id: "crisis-1", type: "crisis", name: "Multi-Hazard Crisis - Sudan", coordinates: [30.2, 15.6], severity: "critical", trend: "Deteriorating", region: "Khartoum", affectedPopulation: 7800000 },
  { id: "conflict-1", type: "conflict", name: "Active Conflict - Khartoum", coordinates: [32.53, 15.5], severity: "critical", trend: "Ongoing", region: "Khartoum", affectedPopulation: 2500000 },
  { id: "conflict-2", type: "conflict", name: "Armed Clashes - El Fasher", coordinates: [25.35, 13.63], severity: "critical", trend: "Escalating", region: "North Darfur", affectedPopulation: 450000 },
  { id: "displacement-1", type: "conflict", name: "IDP Camp - Zalingei", coordinates: [23.47, 12.91], severity: "critical", trend: "180k displaced", region: "Central Darfur", affectedPopulation: 180000 },
  { id: "food-1", type: "famine", name: "Famine Risk - West Darfur", coordinates: [22.45, 13.45], severity: "critical", trend: "IPC Phase 5", region: "West Darfur", affectedPopulation: 890000 },
  { id: "cholera-1", type: "cholera", name: "Cholera Outbreak - Port Sudan", coordinates: [37.22, 19.62], severity: "critical", cases: 1847, trend: "+89 in 24h", region: "Red Sea" },
  { id: "flooding-1", type: "flood", name: "Flood Risk - White Nile", coordinates: [32.5, 13.16], severity: "medium", trend: "Seasonal", region: "White Nile" },
  { id: "team-1", type: "team", name: "UNHCR Emergency Team", coordinates: [36.2, 15.3], severity: "response", status: "Active", members: 12, region: "Kassala" },
  { id: "team-2", type: "team", name: "WFP Distribution Team", coordinates: [23.0, 13.2], severity: "response", status: "Active", members: 8, region: "West Darfur" },
];

export const ethiopiaCrisisPins: CrisisPin[] = [
  { id: "cholera", type: "cholera", name: "Cholera Outbreak", coordinates: [42.79, 9.35], severity: "critical", cases: 247, trend: "+34 in 24h", region: "Somali" },
  { id: "cholera-2", type: "cholera", name: "Cholera Spread", coordinates: [44.2, 6.73], severity: "critical", cases: 89, trend: "+12 in 24h", region: "Somali" },
  { id: "flooding", type: "flood", name: "Flood Risk", coordinates: [39.76, 7.0], severity: "high", trend: "36h warning", region: "Oromia" },
  { id: "drought", type: "drought", name: "Drought Zone", coordinates: [40.0, 11.5], severity: "medium", trend: "Monitoring", region: "Afar" },
  { id: "team-1", type: "team", name: "WASH Team Alpha", coordinates: [42.5, 9.2], severity: "response", status: "Active", members: 6, region: "Somali" },
  { id: "team-2", type: "team", name: "Health Team Bravo", coordinates: [44.0, 6.5], severity: "response", status: "Active", members: 5, region: "Somali" },
];

export const getCrisisPins = (country: string): CrisisPin[] => {
  if (country === "Sudan") return sudanCrisisPins;
  if (country === "Ethiopia") return ethiopiaCrisisPins;
  return sudanCrisisPins; // default fallback
};
