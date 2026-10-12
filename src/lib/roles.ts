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
 * Client twin of clear-api `addEventToCrisis` / `createAlert`
 * `requireRole(["admin", "analyst"])`. Use this for Add-to-crisis and
 * Raise-alert chrome — NOT `isPlatformAdmin`, which is admin-only and
 * would hide those actions from analysts.
 *
 * `createCrisisFromEvents` is wider (team writers via `teamId`); do not
 * reuse this helper to hide Create Crisis.
 */
export function canWriteCrisisEvents(role: string | null | undefined): boolean {
  return isPlatformAdmin(role) || role === "analyst";
}

/**
 * Client twin of clear-api `createAnalysisAutomation` /
 * `deleteAnalysisAutomation` `requireRole(["admin", "analyst"])`: who may
 * create or remove an analysis.
 */
export function canManageAnalyses(role: string | null | undefined): boolean {
  return isPlatformAdmin(role) || role === "analyst";
}

/**
 * Twin of clear-api `requireContentReader`: only approved global roles may
 * read platform content. `pending` (awaiting admin approval) and any unknown
 * role are refused — this is an allowlist, not a `!== "pending"` check.
 */
const CONTENT_READER_ROLES: ReadonlySet<string> = new Set(["admin", "analyst", "viewer"]);

export function canReadContent(role: string | null | undefined): boolean {
  return !!role && CONTENT_READER_ROLES.has(role);
}

/**
 * Client twin of clear-api `decideCaseProposal` / `caseProposals`
 * `requireRole(["admin", "analyst"])`: who may decide a proposed signal
 * (a web case, clear-api CaseProposal). The server is the real gate.
 */
export function canDecideCaseProposals(role: string | null | undefined): boolean {
  return isPlatformAdmin(role) || role === "analyst";
}

/**
 * The team role that triages the hotline inbox. A TEAM role (a value of
 * `teamMemberships[].role`), NOT a global role — mirrors clear-api's
 * `EMERGENCY_RESPONSE_MANAGER`. An ERM carries the global `viewer` role plus
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
