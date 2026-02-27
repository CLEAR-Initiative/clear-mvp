export interface NRCRegionCountry {
  name: string;
  activities: string[];
  description?: string;
}

export interface NRCRegionData {
  color: string;
  countries: NRCRegionCountry[];
}

export const nrcRegions: Record<string, NRCRegionData> = {
  "East Africa & Yemen": {
    color: "#E85D3D",
    countries: [
      { name: "Ethiopia", activities: ["Education", "WASH", "Shelter", "ICLA", "Food Security"], description: "Multi-sector emergency response" },
      { name: "Kenya", activities: ["Education", "WASH", "Shelter"], description: "Refugee and host community support" },
      { name: "Somalia", activities: ["Education", "WASH", "Shelter", "ICLA"], description: "Complex emergency response" },
      { name: "South Sudan", activities: ["Education", "WASH", "Shelter", "Camp Management"], description: "Conflict and displacement response" },
      { name: "Uganda", activities: ["Education", "WASH", "ICLA"], description: "Refugee response and integration" },
      { name: "Yemen", activities: ["Education", "WASH", "Shelter", "ICLA", "Food Security"], description: "Largest humanitarian crisis" },
    ],
  },
  "Central & West Africa": {
    color: "#2563EB",
    countries: [
      { name: "Cameroon", activities: ["Education", "Shelter", "ICLA"] },
      { name: "DRC", activities: ["Education", "WASH", "Shelter", "ICLA", "Camp Management"] },
      { name: "Mali", activities: ["Education", "WASH", "Shelter"] },
      { name: "Niger", activities: ["Education", "Shelter", "ICLA"] },
      { name: "Nigeria", activities: ["Education", "WASH", "Shelter", "ICLA", "Food Security"] },
      { name: "Burkina Faso", activities: ["Education", "Shelter"] },
      { name: "CAR", activities: ["Education", "WASH", "Shelter", "ICLA"] },
    ],
  },
  "Middle East": {
    color: "#059669",
    countries: [
      { name: "Iraq", activities: ["Education", "Shelter", "ICLA", "Camp Management"] },
      { name: "Jordan", activities: ["Education", "ICLA"] },
      { name: "Lebanon", activities: ["Education", "Shelter", "ICLA"] },
      { name: "Syria", activities: ["Education", "WASH", "Shelter", "ICLA"] },
      { name: "Palestine", activities: ["Education", "Shelter", "ICLA"] },
    ],
  },
  Asia: {
    color: "#7C3AED",
    countries: [
      { name: "Afghanistan", activities: ["Education", "WASH", "Shelter", "ICLA"] },
      { name: "Myanmar", activities: ["Education", "Shelter", "ICLA"] },
      { name: "Pakistan", activities: ["Education", "WASH", "Shelter"] },
    ],
  },
  Europe: {
    color: "#0891B2",
    countries: [
      { name: "Ukraine", activities: ["Education", "Shelter", "ICLA", "WASH", "Food Security"] },
    ],
  },
  Americas: {
    color: "#D97706",
    countries: [
      { name: "Colombia", activities: ["Education", "ICLA", "Shelter"] },
      { name: "Venezuela", activities: ["Education", "ICLA"] },
    ],
  },
};

export const nrcTotalCountries = Object.values(nrcRegions).reduce(
  (sum, r) => sum + r.countries.length,
  0,
);
