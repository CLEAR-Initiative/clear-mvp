// @ts-nocheck — this script executes inside the clear-api seed image
// (bind-mounted to /app/e2e-invite-seed.ts), where "./src/lib/*.js" resolves
// against clear-api's source tree. It is never imported by the clear-mvp app
// or its tests, so clear-mvp's tsc must not try to resolve clear-api's modules.
/**
 * Pending invitations for the welcome-flow spec (case 26).
 *
 * Runs INSIDE the clear-api seed image (docker-compose.e2e.yml service
 * `seed-invite`), AFTER the main `seed` (which creates the admin and the
 * "CLEAR Platform" org). The invite email only ever carries the token, so the
 * spec cannot get one from the UI; this script writes invitations with known
 * tokens instead.
 *
 * Accepting an invitation consumes it, and CI retries a failed test twice, so
 * there is one invitation per attempt (WELCOME_INVITES[testInfo.retry]). All of
 * them add the invitee to one dedicated team, so the invitee lands with exactly
 * one team and the other specs' teams are untouched.
 *
 * Idempotent: re-running resets every invitation to pending, so a kept-up stack
 * can be reseeded with `bun run e2e:seed`. An invitee account left by an earlier
 * run is fine: clear-api accepts an invite for an existing email without
 * touching its password, and onboarding progress lives in the browser context.
 *
 * Keep tokens and emails in lockstep with WELCOME_INVITES in e2e/support/data.ts.
 */
import { prisma } from "./src/lib/prisma.js";

const ORG_SLUG = "clear-platform"; // created by prisma/seed.ts
const TEAM_SLUG = "e2e-welcome-team";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@clearinitiative.io";
const ATTEMPTS = 3; // first run + CI's two retries (playwright.config.ts)
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

async function main() {
  const org = await prisma.organisations.findFirst({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`[invite-seed] expected org "${ORG_SLUG}" from the main seed`);
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) throw new Error(`[invite-seed] expected admin ${ADMIN_EMAIL} from the main seed`);

  const team = await prisma.teams.upsert({
    where: { organisationId_slug: { organisationId: org.id, slug: TEAM_SLUG } },
    update: {},
    create: { organisationId: org.id, name: "E2E Welcome Team", slug: TEAM_SLUG },
  });

  for (let i = 0; i < ATTEMPTS; i++) {
    const token = `e2e-welcome-invite-${i}`;
    const email = `e2e-invitee-${i}@clearinitiative.io`;

    const invitation = await prisma.invitations.upsert({
      where: { token },
      update: { acceptedAt: null, expiresAt: new Date(Date.now() + ONE_YEAR_MS) },
      create: {
        email,
        organisationId: org.id,
        role: "member",
        token,
        expiresAt: new Date(Date.now() + ONE_YEAR_MS),
        invitedById: admin.id,
      },
    });
    await prisma.invitationTeams.deleteMany({ where: { invitationId: invitation.id } });
    await prisma.invitationTeams.create({
      data: { invitationId: invitation.id, teamId: team.id, teamRole: "team_member" },
    });
  }

  console.log(`[invite-seed] ${ATTEMPTS} pending invitations to team ${team.id} (${TEAM_SLUG})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("[invite-seed] failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
