import { isPlatformAdmin } from "~/lib/roles";

/**
 * Whether the signed-in user may edit an organisation (details, members,
 * invites, teams): a platform admin, or a member of this org with the
 * `org_admin` role. clear-api enforces the same rule; this only decides
 * which controls the page shows.
 */
export function canEditOrg({
  userRole,
  userId,
  members,
}: {
  userRole: string;
  userId: string | undefined;
  members: { role: string; user: { id: string } }[] | undefined;
}): boolean {
  if (isPlatformAdmin(userRole)) return true;
  if (!userId) return false;
  return (members ?? []).some((m) => m.user.id === userId && m.role === "org_admin");
}
