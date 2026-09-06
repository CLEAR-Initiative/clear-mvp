/**
 * True once we know this team's location bindings (including "none").
 *
 * `locations === []` means two different things: teams still hydrating, or
 * an unscoped team. Treating the first as unscoped flashes "All Countries"
 * then snaps to Afghanistan when bindings arrive.
 */
export function isTeamScopeReady(args: {
  isLoading: boolean;
  teams: readonly unknown[] | undefined;
  activeTeam: unknown | null;
}): boolean {
  if (args.isLoading) return false;
  if (args.teams === undefined) return false;
  if (args.activeTeam) return true;
  return args.teams.length === 0;
}
