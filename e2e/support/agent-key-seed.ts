// @ts-nocheck — this script executes inside the clear-api seed image
// (bind-mounted to /app/e2e-agent-key-seed.ts), where "./src/..." resolves
// against clear-api's source tree. It is never imported by the clear-mvp app
// or its tests, so clear-mvp's tsc must not try to resolve clear-api's modules.
/**
 * The CLEAR Agent's clear-api key for the e2e stack.
 *
 * clear-api only takes Conversation writes that carry both the user's session
 * and the Agent's key in X-Clear-Agent-Key (clear-api#182, ADR-0009). In an
 * environment the key is minted by clear-api's scripts/create-agent-user.ts,
 * which prints a random key once; here the key is a fixed, test-only value
 * that docker-compose.e2e.yml also gives the web service as
 * CLEAR_AGENT_API_KEY, so both sides agree without passing output around.
 *
 * Runs INSIDE the clear-api seed image (service `seed-agent-key`), after
 * `seed`. Idempotent: the user is found-or-created and the key upserted by
 * its hash, so re-running against a kept-up stack is safe.
 */

import { prisma } from "./src/lib/prisma.js";
import { hashKey } from "./src/utils/api-key.js";
import { AGENT_ROLE } from "./src/utils/request-auth.js";

const EMAIL = "agent@clear.dev";

async function main() {
  const key = process.env.CLEAR_AGENT_API_KEY;
  if (!key?.startsWith("sk_live_")) throw new Error("CLEAR_AGENT_API_KEY must be set to an sk_live_ key");

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { role: AGENT_ROLE, isActive: true },
    create: { name: "CLEAR Agent", email: EMAIL, role: AGENT_ROLE, emailVerified: true, isActive: true },
  });
  const keyHash = hashKey(key);
  await prisma.apiKeys.upsert({
    where: { keyHash },
    update: { userId: user.id, revokedAt: null, expiresAt: null },
    create: { userId: user.id, name: "e2e-agent", prefix: key.slice(0, 16), keyHash },
  });
  console.log(`[agent-key-seed] ${EMAIL} (role ${AGENT_ROLE}) holds the e2e Agent key`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
