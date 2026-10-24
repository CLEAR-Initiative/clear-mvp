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
  role: string; // "team_admin" | "analyst" | "emergency_response_manager" | "team_member"
  createdAt: string;
}

export interface TeamLocation {
  id: string;
  name: string;
  level: number; // 0 = country, 1 = state, 2 = locality
  parent: { id: string; name: string } | null;
  children: TeamLocation[];
}

/**
 * An outbound webhook a team configures so a CLEAR alert fires an HTTP POST to
 * `targetUrl` (alongside email). Mirrors clear-api's `WebhookSubscription`.
 *
 * `secret` is the signing secret shown ONCE on create / rotate responses and
 * scrubbed (null) everywhere else — never persist or re-display it.
 */
export interface WebhookSubscription {
  id: string;
  name: string;
  targetUrl: string;
  source: string | null;
  teamId: string;
  alertTypeFilter: string[];
  minSeverity: number | null;
  active: boolean;
  createdAt: string;
  secret: string | null;
}
