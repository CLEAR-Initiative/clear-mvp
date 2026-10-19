// @ts-nocheck — this script executes inside the clear-api seed image
// (bind-mounted to /app/e2e-roles-seed.ts), where "./src/lib/*.js" resolves
// against clear-api's source tree. It is never imported by the clear-mvp app
// or its tests, so clear-mvp's tsc must not try to resolve clear-api's modules.
/**
 * Role-persona E2E fixture seed.
 *
 * Runs INSIDE the clear-api seed image (docker-compose.e2e.yml service
 * `seed-roles`), AFTER the main `seed` (which creates admin/analyst/member,
 * the `emr.user` ERM account, and the "CLEAR Platform" org). After the
 * role-taxonomy split the main seed's `analyst@…` is a GLOBAL `member`; this
 * script gives it the elevated `analyst` membership on the E2E team so it acts
 * as a TEAM analyst. It provisions the personas the role-access matrix needs
 * beyond the seeded accounts, all with the shared `password123` (ERM keeps its
 * own strong password from the main seed):
 *
 *   • completes the ERM — assigns emr.user the `emergency_response_manager`
 *     team role on a seeded team (the main seed left this as a TODO)
 *   • completes the ANALYST — assigns analyst@… the team `analyst` membership
 *     on the E2E team (the team has NO teamLocations, i.e. "wide-open" location
 *     scope, so the team analyst can act on any event/alert/crisis/signal —
 *     intended, it keeps the matrix deterministic)
 *   • e2e-pending@…            global role `pending` (unapproved)
 *   • e2e-team-admin@…         team `team_admin`
 *   • e2e-team-member@…        team `team_member`
 *   • e2e-org-admin@…          org `org_admin`
 *
 * Mirrors clear-api's own user-minting (public sign-up is disabled, so users
 * are created through Better Auth's internal adapter + a hashed credential
 * account). Idempotent: upserts memberships, getOrCreate for users.
 *
 * Keep the emails/passwords in lockstep with e2e/support/data.ts.
 */
import { prisma } from "./src/lib/prisma.js";
import { auth } from "./src/lib/auth.js";

const ORG_SLUG = "clear-platform"; // created by prisma/seed.ts
const TEAM_SLUG = "e2e-response-team";
const PW = "password123";

async function main() {
  const authCtx = await auth.$context;

  async function getOrCreateUser(name: string, email: string, password: string, role: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { emailVerified: true, role } });
      return existing;
    }
    const user = await authCtx.internalAdapter.createUser({ email, name, emailVerified: true });
    await authCtx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await authCtx.password.hash(password),
    });
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, role } });
    return user;
  }

  const org = await prisma.organisations.findFirst({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`[roles-seed] expected org "${ORG_SLUG}" from the main seed`);

  const team = await prisma.teams.upsert({
    where: { organisationId_slug: { organisationId: org.id, slug: TEAM_SLUG } },
    update: {},
    create: { organisationId: org.id, name: "E2E Response Team", slug: TEAM_SLUG },
  });

  const addToOrg = (userId: string, role: string) =>
    prisma.organisationUsers.upsert({
      where: { userId_organisationId: { userId, organisationId: org.id } },
      update: { role },
      create: { userId, organisationId: org.id, role },
    });
  const addToTeam = (userId: string, role: string) =>
    prisma.teamMembers.upsert({
      where: { teamId_userId: { teamId: team.id, userId } },
      update: { role },
      create: { teamId: team.id, userId, role },
    });

  // ERM: emr.user already exists (global `member`). Give it the team role that
  // actually unlocks the hotline inbox — the piece the main seed deferred.
  const emr = await prisma.user.findUnique({ where: { email: "emr.user@clearinitiative.io" } });
  if (!emr) throw new Error("[roles-seed] expected emr.user from the main seed");
  await addToOrg(emr.id, "member");
  await addToTeam(emr.id, "emergency_response_manager");

  // ANALYST: analyst@… already exists (global `member` after the taxonomy
  // split). Give it the elevated `analyst` team membership on the E2E team.
  // The team has NO teamLocations ("wide-open" scope), so the team analyst's
  // location-scoped powers succeed on any event/alert/crisis/signal — intended,
  // to keep the matrix deterministic.
  const analyst = await prisma.user.findUnique({ where: { email: "analyst@clearinitiative.io" } });
  if (!analyst) throw new Error("[roles-seed] expected analyst@clearinitiative.io from the main seed");
  await addToOrg(analyst.id, "member");
  await addToTeam(analyst.id, "analyst");

  // Pending: created but NOT approved — keep the global `pending` role.
  await getOrCreateUser("E2E Pending", "e2e-pending@clearinitiative.io", PW, "pending");

  // Team/org personas: global `member`; privilege comes from the team/org role.
  const teamAdmin = await getOrCreateUser("E2E Team Admin", "e2e-team-admin@clearinitiative.io", PW, "member");
  await addToOrg(teamAdmin.id, "member");
  await addToTeam(teamAdmin.id, "team_admin");

  const teamMember = await getOrCreateUser("E2E Team Member", "e2e-team-member@clearinitiative.io", PW, "member");
  await addToOrg(teamMember.id, "member");
  await addToTeam(teamMember.id, "team_member");

  const orgAdmin = await getOrCreateUser("E2E Org Admin", "e2e-org-admin@clearinitiative.io", PW, "member");
  await addToOrg(orgAdmin.id, "org_admin");

  const counts = {
    orgMembers: await prisma.organisationUsers.count({ where: { organisationId: org.id } }),
    teamMembers: await prisma.teamMembers.count({ where: { teamId: team.id } }),
  };
  console.log(`[roles-seed] team ${team.id} (${TEAM_SLUG}) ready:`, counts);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("[roles-seed] failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
