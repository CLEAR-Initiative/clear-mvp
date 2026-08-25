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
