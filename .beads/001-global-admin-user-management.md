# Bead 001: Global Admin — User Management Page

## Status: done

## Summary
Enhance the existing admin page (`/admin`) so global admins can manage all users and promote users to Organization Admin.

## Requirements
1. **User list** — The existing `/admin` page already lists users with roles. Ensure it shows ALL registered users (not just team members) with search/filter.
2. **Mark as Org Admin** — Add a role option `org_admin` (Organization Admin) to the role selector on the admin page. When a global admin sets a user's role to `org_admin`, that user gains the ability to create and manage organizations.
3. **Invite to create org** — Global admin can send an invitation (or simply grant the `org_admin` role) to a user, enabling the "Create Organization" flow for that user.

## Existing Code
- Admin page: `src/app/(app)/admin/page.tsx` (637 lines, has `UsersPanel` with role selector)
- Auth router: `src/server/api/routers/auth.ts` (has `listUsers` query, user has `role` field)
- Nav sidebar: `src/components/nav-sidebar.tsx` (checks `role === "admin"`)

## Tasks
- [ ] Add `org_admin` to the role enum/options in the backend (GraphQL + any DB schema)
- [ ] Update the admin page role selector to include `org_admin` option
- [ ] Ensure `org_admin` users see the "Create Organization" option in their nav/settings
- [ ] Add guard: only `admin` role can set/change `org_admin` role
