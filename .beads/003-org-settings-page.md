# Bead 003: Organization Settings Page for Org Admins

## Status: done

## Summary
Give `org_admin` users a full Organization Settings page where they can edit org details, manage teams, and invite users.

## Requirements
1. **Edit Organization** — Org admin can update org name, slug, description, and other metadata.
2. **Create & Edit Teams** — Org admin can create new teams within their org, edit team names, and delete teams.
3. **Invite Users to Organization** — Org admin can invite users (by email or from the existing user list) to join their organization with a specified role (member, team_lead, etc.).
4. **View Org Members** — List all members of the organization with their roles, with ability to change roles or remove members.

## Existing Code
- Org settings: `src/app/(app)/settings/org/page.tsx` (shows orgs user belongs to)
- Team settings: `src/app/(app)/settings/team/[id]/page.tsx`
- Teams router: `src/server/api/routers/teams.ts` (has `addOrgMember`, `addTeamMember`, `updateTeamMemberRole` mutations)

## Tasks
- [ ] Enhance org settings page with edit form (name, slug, description)
- [ ] Add "Create Team" button and form within org settings
- [ ] Add "Invite User" flow — search/select user, assign org role, send invite
- [ ] Add org member list with role management and remove option
- [ ] Ensure all mutations are guarded — only org admins of *that* org can manage it
- [ ] Navigation: show org settings link for `org_admin` users in the sidebar
