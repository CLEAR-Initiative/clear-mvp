import type { StatItem } from "~/components/ui";

export const stats: StatItem[] = [
  { label: "Active Operations", value: "2", color: "#2563EB" },
  { label: "Field Teams Deployed", value: "12" },
  { label: "Staff Mobilized", value: "67" },
  { label: "Partner Orgs", value: "8" },
];

export const operations = [
  {
    name: "Cholera Response - Somali Region",
    severity: "Critical",
    severityColor: "#DC2626",
    severityBg: "#FEE2E2",
    barColor: "#DC2626",
    activated: "2 hours ago",
    opId: "ETH-2025-CHO-001",
    teams: "8 deployed",
    staff: "42 mobilized",
    coverage: "3 woredas",
    budget: "$245,000",
    tags: [
      { label: "WASH", bg: "#DBEAFE", color: "#2563EB" },
      { label: "Health", bg: "#D1FAE5", color: "#059669" },
      { label: "Logistics", bg: "#FEF3C7", color: "#D97706" },
      { label: "Community Engagement", bg: "#F3E8FF", color: "#7C3AED" },
    ],
  },
  {
    name: "Flood Preparedness - Oromia Region",
    severity: "High",
    severityColor: "#F59E0B",
    severityBg: "#FEF3C7",
    barColor: "#F59E0B",
    activated: "6 hours ago",
    opId: "ETH-2025-FLD-002",
    teams: "4 deployed",
    staff: "25 mobilized",
    coverage: "2 woredas",
    budget: "$120,000",
    tags: [
      { label: "Pre-positioning", bg: "#FEF3C7", color: "#D97706" },
      { label: "Shelter", bg: "#DBEAFE", color: "#2563EB" },
      { label: "Early Warning", bg: "#D1FAE5", color: "#059669" },
    ],
  },
];

export const fieldTeams = [
  { name: "WASH Team Alpha", members: "6 members", location: "Jijiga", status: "Active", statusColor: "#059669", lastCheckin: "15 min ago" },
  { name: "Health Team Bravo", members: "5 members", location: "Kebridehar", status: "Active", statusColor: "#059669", lastCheckin: "30 min ago" },
  { name: "Assessment Team", members: "4 members", location: "Gode", status: "En Route", statusColor: "#D97706", lastCheckin: "1h ago" },
  { name: "Logistics Support", members: "3 members", location: "Dire Dawa Hub", status: "Active", statusColor: "#059669", lastCheckin: "45 min ago" },
  { name: "Community Liaison", members: "4 members", location: "Jijiga", status: "Active", statusColor: "#059669", lastCheckin: "20 min ago" },
];

export const resources = [
  { name: "ORS Sachets", status: "Good stock", statusColor: "#059669", current: 15600, total: 20000, barColor: "#059669" },
  { name: "IV Fluids (Ringer's)", status: "Low stock", statusColor: "#D97706", current: 640, total: 2000, barColor: "#D97706" },
  { name: "Water Purification Tablets", status: "Good stock", statusColor: "#059669", current: 42500, total: 50000, barColor: "#059669" },
  { name: "Hygiene Kits", status: "Critical", statusColor: "#DC2626", current: 540, total: 3000, barColor: "#DC2626" },
  { name: "Vehicles Available", status: "Adequate", statusColor: "#059669", current: 8, total: 12, barColor: "#059669" },
];

export const partners = [
  { org: "NRC Ethiopia", role: "Lead Agency", coverage: "Jijiga, Kebridehar, Gode", contact: "Melese A. (Program Manager)", status: "Active", statusColor: "#059669" },
  { org: "WHO Ethiopia", role: "Health Coordination", coverage: "Regional support", contact: "Dr. Sarah M.", status: "Active", statusColor: "#059669" },
  { org: "UNICEF", role: "WASH Support", coverage: "Jijiga, Kebridehar", contact: "Ahmed H.", status: "Active", statusColor: "#059669" },
  { org: "WFP", role: "Logistics", coverage: "Regional hub", contact: "Maria L.", status: "Standby", statusColor: "#D97706" },
  { org: "Ethiopian Red Cross", role: "Community Mobilization", coverage: "Jijiga", contact: "Dawit T.", status: "Active", statusColor: "#059669" },
];

export const nrcCapacity = {
  totalStaff: 450,
  national: 380,
  international: 70,
  offices: 5,
  established: "2011",
  activePrograms: 8,
};

export const responsePhases = [
  {
    name: "Phase 1: Emergency",
    color: "#DC2626",
    colorBg: "#FEE2E2",
    duration: "Day 1-7",
    budget: "$120,000",
    activities: [
      "Deploy WASH rapid response teams to affected areas",
      "Establish oral rehydration points at 6 health facilities",
      "Begin water quality testing at all community water sources",
      "Activate community health worker surveillance network",
      "Pre-position cholera treatment supplies at regional hub",
    ],
  },
  {
    name: "Phase 2: Scale-Up",
    color: "#F59E0B",
    colorBg: "#FEF3C7",
    duration: "Week 2-4",
    budget: "$280,000",
    activities: [
      "Scale WASH coverage to all affected woredas",
      "Establish 3 cholera treatment centers",
      "Distribute hygiene kits to 5,000 households",
      "Launch community-based health education campaign",
      "Coordinate with government on water system rehabilitation",
    ],
  },
  {
    name: "Phase 3: Stabilization",
    color: "#059669",
    colorBg: "#D1FAE5",
    duration: "Month 2-3",
    budget: "$165,000",
    activities: [
      "Transition from emergency to sustained WASH programming",
      "Rehabilitation of damaged water infrastructure",
      "Community-based surveillance handover",
      "Monitoring and evaluation of response effectiveness",
    ],
  },
];

export const timeline = [
  { day: "Day 1", milestone: "Emergency activation and team deployment", color: "#DC2626" },
  { day: "Day 2-3", milestone: "Initial assessment and water testing completed", color: "#DC2626" },
  { day: "Day 4-5", milestone: "ORP and treatment supplies in place", color: "#DC2626" },
  { day: "Day 7", milestone: "Phase 1 objectives met, scale-up begins", color: "#F59E0B" },
  { day: "Week 2", milestone: "Cholera treatment centers operational", color: "#F59E0B" },
  { day: "Week 3", milestone: "Full WASH coverage in affected areas", color: "#F59E0B" },
  { day: "Month 2", milestone: "Transition to stabilization phase", color: "#059669" },
];

export const riskAssessment = [
  { risk: "Supply Chain Disruption", severity: "High", severityColor: "#F59E0B", severityBg: "#FEF3C7", description: "Road access compromised during rainy season", mitigation: "Pre-position supplies; establish alternative routes via Dire Dawa" },
  { risk: "Community Resistance", severity: "Medium", severityColor: "#D97706", severityBg: "#FEF3C7", description: "Mistrust of water treatment methods in some communities", mitigation: "Engage community leaders; conduct awareness campaigns" },
  { risk: "Security Deterioration", severity: "High", severityColor: "#F59E0B", severityBg: "#FEF3C7", description: "Inter-communal tensions in displacement sites", mitigation: "Coordinate with local authorities; establish safe access protocols" },
  { risk: "Funding Gaps", severity: "Critical", severityColor: "#DC2626", severityBg: "#FEE2E2", description: "Only 60% of required funding secured", mitigation: "Activate rapid funding mechanisms; reprioritize existing budgets" },
];

export const budgetBreakdown = [
  { phase: "Phase 1: Emergency", budget: 120000, pct: 21, color: "#DC2626" },
  { phase: "Phase 2: Scale-Up", budget: 280000, pct: 50, color: "#F59E0B" },
  { phase: "Phase 3: Stabilization", budget: 165000, pct: 29, color: "#059669" },
];

export const humanResources = [
  { label: "Surge Staff", value: 12, total: 20, color: "#DC2626" },
  { label: "Full Staffing Target", value: 67, total: 85, color: "#2563EB" },
  { label: "International Staff", value: 8, total: 12, color: "#7C3AED" },
  { label: "National Staff", value: 59, total: 73, color: "#059669" },
  { label: "Specialists (WASH/Health)", value: 15, total: 20, color: "#D97706" },
];

export const comparativeAdvantages = [
  { label: "WASH Emergency Response", desc: "Rapid deployment WASH teams with cholera response experience" },
  { label: "ICLA (Legal Assistance)", desc: "Housing, land and property rights for displaced populations" },
  { label: "Education in Emergencies", desc: "Temporary learning spaces and teacher training programs" },
  { label: "Camp Management", desc: "IDP site coordination and community governance support" },
];
