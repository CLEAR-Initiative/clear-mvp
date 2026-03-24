# Bead 002: Restrict Organization Creation to Org Admins

## Status: done

## Summary
Only users with `org_admin` (or `admin`) role should be able to create an Organization. Remove or hide the create-org flow for regular users.

## Requirements
1. **Backend guard** — The `createOrganisation` mutation (or equivalent) must check that the calling user has `org_admin` or `admin` role. Reject otherwise.
2. **Frontend guard** — Hide "Create Organization" UI elements for users without the required role.
3. **Feedback** — If a non-authorized user somehow hits the endpoint, return a clear error message.

## Existing Code
- Org settings page: `src/app/(app)/settings/org/page.tsx`
- Teams router: `src/server/api/routers/teams.ts` (has org/team mutations)

## Tasks
- [ ] Add role check to `createOrganisation` mutation
- [ ] Conditionally render create-org UI based on user role
- [ ] Add appropriate error handling / user feedback
