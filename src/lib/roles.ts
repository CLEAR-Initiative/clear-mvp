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
