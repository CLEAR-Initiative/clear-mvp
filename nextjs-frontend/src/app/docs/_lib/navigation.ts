export interface NavItem {
  title: string;
  href: string;
  icon?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const docsNav: NavGroup[] = [
  {
    title: "GET STARTED",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Quickstart", href: "/docs/quickstart" },
      { title: "Configuration", href: "/docs/configuration" },
    ],
  },
  {
    title: "PLATFORM",
    items: [
      { title: "Dashboard", href: "/docs/platform/dashboard" },
      { title: "Crisis Management", href: "/docs/platform/crises" },
      { title: "Interactive Map", href: "/docs/platform/map" },
    ],
  },
  {
    title: "DATA & INTELLIGENCE",
    items: [
      { title: "Live Data Feeds", href: "/docs/data/feeds" },
      { title: "Data Sources", href: "/docs/data/sources" },
      { title: "Gap Analysis", href: "/docs/data/gap-analysis" },
    ],
  },
  {
    title: "FIELD OPERATIONS",
    items: [
      { title: "Survey System", href: "/docs/field/surveys" },
      { title: "Vulnerability Assessment", href: "/docs/field/assessments" },
      { title: "Secure Referrals", href: "/docs/field/referrals" },
    ],
  },
  {
    title: "ACCOUNTABILITY",
    items: [
      { title: "Audit Trail", href: "/docs/accountability/audit" },
      { title: "Feedback System", href: "/docs/accountability/feedback" },
    ],
  },
  {
    title: "INTEGRATIONS",
    items: [
      { title: "KoBoToolbox", href: "/docs/integrations/kobo" },
      { title: "External APIs", href: "/docs/integrations/apis" },
    ],
  },
  {
    title: "ARCHITECTURE",
    items: [
      { title: "Tech Stack", href: "/docs/architecture/stack" },
      { title: "API Reference", href: "/docs/architecture/api" },
    ],
  },
];
