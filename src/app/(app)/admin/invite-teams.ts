/** The team fields a pending invitation carries. Current invites list their
 *  teams in `teams`; invites made before multi-team support only set the
 *  legacy single `team` / `teamRole`. */
export interface InviteTeamFields {
  teams?: { team: { id: string; name: string }; teamRole: string }[] | null;
  team?: { id: string; name: string } | null;
  teamRole?: string | null;
}

/** "Alpha (team_member), Beta (analyst)" for the Invitations table, or null
 *  when the invite names no team. */
export function inviteTeamsLabel(invite: InviteTeamFields): string | null {
  if (invite.teams && invite.teams.length > 0) {
    return invite.teams.map((t) => `${t.team.name} (${t.teamRole})`).join(", ");
  }
  if (invite.team) {
    return `${invite.team.name} (${invite.teamRole ?? "team_member"})`;
  }
  return null;
}
