/* ─── Multi-tenancy types matching the Apollo Server schema ─── */

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  teams: Team[];
  members: OrgMember[];
}

export interface OrgMember {
  id: string;
  user: { id: string; name: string; email: string };
  role: string; // "org_admin" | "member"
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  organisation: { id: string; name: string };
  members: TeamMember[];
  locations: TeamLocation[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  user: { id: string; name: string; email: string };
  role: string; // "team_admin" | "field_coordinator" | "team_member"
  createdAt: string;
}

export interface TeamLocation {
  id: string;
  name: string;
  level: number; // 0 = country, 1 = state, 2 = locality
  parent: { id: string; name: string } | null;
  children: TeamLocation[];
}
