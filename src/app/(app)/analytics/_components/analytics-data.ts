import type { StatItem } from "~/components/ui/stats-grid";

// Hero stats for StatsGrid
export const heroStats: StatItem[] = [
  {
    label: "Countries Monitored",
    value: "7",
    sub: "East Africa, West Africa, SE Asia",
    color: "#2563EB",
  },
  {
    label: "Active Alerts",
    value: "24",
    sub: "+38% vs last quarter",
    subColor: "#059669",
  },
  {
    label: "Alerts Acted On",
    value: "18",
    sub: "75% action rate",
    subColor: "#059669",
  },
  {
    label: "Daily Active Users",
    value: "42",
    sub: "Across 3 NRC offices",
  },
  {
    label: "Local Partners",
    value: "12",
    sub: "8 actively engaged",
    subColor: "#059669",
  },
];

// 6-month trend: alerts generated vs acted on
export const alertsTrendData = [
  { month: "Oct", generated: 14, actedOn: 8 },
  { month: "Nov", generated: 18, actedOn: 11 },
  { month: "Dec", generated: 16, actedOn: 12 },
  { month: "Jan", generated: 22, actedOn: 16 },
  { month: "Feb", generated: 28, actedOn: 21 },
  { month: "Mar", generated: 24, actedOn: 18 },
];

// Alert relevance donut
export const alertRelevanceData = [
  { name: "Relevant", value: 82, color: "#059669" },
  { name: "Partially Relevant", value: 12, color: "#D97706" },
  { name: "Dismissed", value: 6, color: "#DC2626" },
];

// Monthly active users
export const monthlyUsersData = [
  { month: "Oct", users: 18 },
  { month: "Nov", users: 24 },
  { month: "Dec", users: 22 },
  { month: "Jan", users: 31 },
  { month: "Feb", users: 38 },
  { month: "Mar", users: 42 },
];

// Response time trend (hours)
export const responseTimeData = [
  { month: "Oct", hours: 48 },
  { month: "Nov", hours: 36 },
  { month: "Dec", hours: 28 },
  { month: "Jan", hours: 20 },
  { month: "Feb", hours: 14 },
  { month: "Mar", hours: 12 },
];

// Data sources by type
export const dataSourcesData = [
  { name: "News & Media", count: 847, color: "#2563EB" },
  { name: "Social Media", count: 412, color: "#7C3AED" },
  { name: "Government Reports", count: 234, color: "#059669" },
  { name: "Satellite Imagery", count: 156, color: "#D97706" },
  { name: "Field Reports", count: 89, color: "#E85D3D" },
];

// Pipeline health stats
export const pipelineHealth = [
  { label: "System Uptime", value: "99.4%", sub: "Last 90 days", color: "#059669" },
  { label: "Records Processed", value: "1.74M", sub: "Since launch" },
  { label: "Avg Processing Time", value: "2.3s", sub: "Per data record" },
];

// Geographic coverage
export const geographicCoverage = [
  { country: "Sudan", alerts: 8, severity: "critical" as const, color: "#DC2626", activeSince: "Sep 2025" },
  { country: "Ethiopia", alerts: 6, severity: "high" as const, color: "#F59E0B", activeSince: "Oct 2025" },
  { country: "Somalia", alerts: 4, severity: "high" as const, color: "#F59E0B", activeSince: "Oct 2025" },
  { country: "DRC", alerts: 3, severity: "medium" as const, color: "#D97706", activeSince: "Nov 2025" },
  { country: "Myanmar", alerts: 2, severity: "medium" as const, color: "#D97706", activeSince: "Dec 2025" },
  { country: "Cameroon", alerts: 1, severity: "low" as const, color: "#059669", activeSince: "Jan 2026" },
  { country: "Nigeria", alerts: 1, severity: "low" as const, color: "#059669", activeSince: "Jan 2026" },
];
