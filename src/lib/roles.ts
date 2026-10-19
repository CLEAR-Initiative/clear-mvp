/**
 * Global-admin bypass predicate — the client-side twin of clear-api's
 * `isPlatformAdmin`. Every UI gate that hides or restricts a control
 * based on org/team membership should short-circuit on this so a
 * platform admin isn't accidentally locked out of a surface.
 *
 * Centralised so a future rename of the global admin role (planned:
 * `admin` → `superadmin`) touches exactly one line instead of every
 * `role === "admin"` check scattered across the app.
 */
export function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}

/**
 * The team role that holds elevated, LOCATION-SCOPED powers — a value of
 * `teamMemberships[].role`, NOT a global role. `analyst` used to be a global
 * role; after the taxonomy split it is a team role (clear-api's team
 * `ANALYST`). A team analyst may raise/promote alerts, decide tasks & case
 * proposals, manage analyses and act on events/alerts/crises — but the server
 * scopes every one of those to the team's LOCATION scope and enforces it.
 */
export const TEAM_ANALYST = "analyst";

/**
 * Whether the user is an `analyst` on any team. The elevated-action helpers
 * below are optimistic UI gates — they only decide which chrome to show; the
 * server (clear-api's location-scoped `requireRole`) is the real gate, so
 * "is a team analyst anywhere" is the right client-side approximation.
 */
export function isTeamAnalyst(
  teamMemberships: { role: string }[] | null | undefined,
): boolean {
  return !!teamMemberships?.some((m) => m.role === TEAM_ANALYST);
}

/**
 * Client twin of clear-api `addEventToCrisis` / `createAlert`
 * `requireRole(["admin", "analyst"])`. Use this for Add-to-crisis and
 * Raise-alert chrome — NOT `isPlatformAdmin`, which is admin-only and
 * would hide those actions from team analysts.
 *
 * `analyst` is now a TEAM role, so pass the user's `teamMemberships`: the gate
 * is admin OR a team analyst on some team. Optimistic — the server enforces
 * the real location-scoped check. Call sites that cannot supply memberships
 * fall back to admin-only.
 *
 * `createCrisisFromEvents` is wider (team writers via `teamId`); do not
 * reuse this helper to hide Create Crisis.
 */
export function canWriteCrisisEvents(
  role: string | null | undefined,
  teamMemberships?: { role: string }[] | null,
): boolean {
  return isPlatformAdmin(role) || isTeamAnalyst(teamMemberships);
}

/**
 * Client twin of clear-api `createAnalysisAutomation` /
 * `deleteAnalysisAutomation` `requireRole(["admin", "analyst"])`: who may
 * create or remove an analysis. Admin OR a team analyst (optimistic — the
 * server enforces the team's location scope).
 */
export function canManageAnalyses(
  role: string | null | undefined,
  teamMemberships?: { role: string }[] | null,
): boolean {
  return isPlatformAdmin(role) || isTeamAnalyst(teamMemberships);
}

/**
 * Twin of clear-api `requireContentReader`: only approved global roles may
 * read platform content. `pending` (awaiting admin approval) and any unknown
 * role are refused — this is an allowlist, not a `!== "pending"` check.
 */
const CONTENT_READER_ROLES: ReadonlySet<string> = new Set(["admin", "member"]);

export function canReadContent(role: string | null | undefined): boolean {
  return !!role && CONTENT_READER_ROLES.has(role);
}

/**
 * Client twin of clear-api `decideCaseProposal` / `caseProposals`
 * `requireRole(["admin", "analyst"])`: who may decide a proposed signal
 * (a web case, clear-api CaseProposal). Admin OR a team analyst (optimistic —
 * the server is the real, location-scoped gate).
 */
export function canDecideCaseProposals(
  role: string | null | undefined,
  teamMemberships?: { role: string }[] | null,
): boolean {
  return isPlatformAdmin(role) || isTeamAnalyst(teamMemberships);
}

/**
 * The team role that triages the hotline inbox. A TEAM role (a value of
 * `teamMemberships[].role`), NOT a global role — mirrors clear-api's
 * `EMERGENCY_RESPONSE_MANAGER`. An ERM carries the global `member` role plus
 * this membership.
 */
export const EMERGENCY_RESPONSE_MANAGER = "emergency_response_manager";

/**
 * Whether the user is an `emergency_response_manager` on any team — the role
 * that unlocks the hotline inbox (Phase 1). The server (clear-api's
 * `requireGroundInboxAccess`) is the real gate; this only decides which UI to
 * show. Phase 2 will scope an ERM to the hotline numbers their team
 * subscribes to.
 */
export function isEmergencyResponseManager(
  teamMemberships: { role: string }[] | null | undefined,
): boolean {
  return !!teamMemberships?.some((m) => m.role === EMERGENCY_RESPONSE_MANAGER);
}
