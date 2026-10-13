/**
 * Per-persona authentication for the role-access matrix spec.
 *
 * The default suite reuses ONE storageState (the analyst, from global-setup).
 * The role-access spec needs a signed-in context per persona, so we sign in
 * through Better Auth's REST endpoint (same path global-setup and
 * enableFeatureFlags use) and reuse the resulting storageState to build browser
 * contexts. Storage states are cached per-persona for the whole run.
 */
import { request, type Browser, type BrowserContext } from "@playwright/test";
import { BASE_URL } from "../data";
import { CREDS, MATRIX_FLAGS, type Persona, type Creds } from "./personas";

/** Playwright's storageState shape, inferred (not a named public export). */
type StorageState = Awaited<ReturnType<typeof signIn>>;
const stateCache = new Map<Persona, StorageState>();

/** Sign in via the API and capture the session as a storageState. */
async function signIn(creds: Creds) {
  const api = await request.newContext({ baseURL: BASE_URL });
  try {
    const res = await api.post("/api/auth/sign-in/email", {
      data: { email: creds.email, password: creds.password },
      headers: { Origin: BASE_URL },
    });
    if (!res.ok()) {
      throw new Error(
        `sign-in failed for ${creds.email}: ${res.status()} ${await res.text()}`,
      );
    }
    return await api.storageState();
  } finally {
    await api.dispose();
  }
}

/** The storageState for a persona, or null when no credentials are configured. */
export async function storageStateFor(persona: Persona): Promise<StorageState | null> {
  if (stateCache.has(persona)) return stateCache.get(persona)!;
  const creds = CREDS[persona];
  if (!creds) return null;
  const state = await signIn(creds);
  stateCache.set(persona, state);
  return state;
}

/**
 * A fresh browser context authenticated as `persona`, with the `en` locale
 * cookie pinned (next-intl reads NEXT_LOCALE — see e2e/support/test.ts).
 * Returns null when the persona has no configured credentials; the caller
 * should skip. Dispose the context when done.
 */
export async function contextFor(
  browser: Browser,
  persona: Persona,
): Promise<BrowserContext | null> {
  const state = await storageStateFor(persona);
  if (!state) return null;
  const ctx = await browser.newContext({ storageState: state, locale: "en" });
  await ctx.addCookies([{ name: "NEXT_LOCALE", value: "en", url: BASE_URL }]);
  return ctx;
}

/** Enable the matrix's feature flags once, as the seeded admin, via the app's
 *  own admin-only toggle. Safe to call in a beforeAll. */
export async function enableMatrixFlags(): Promise<void> {
  const admin = CREDS.admin;
  if (!admin) throw new Error("admin credentials required to enable flags");
  const api = await request.newContext({ baseURL: BASE_URL });
  try {
    await api.post("/api/auth/sign-in/email", {
      data: { email: admin.email, password: admin.password },
      headers: { Origin: BASE_URL },
    });
    for (const key of MATRIX_FLAGS) {
      await api.post("/api/trpc/featureFlags.toggle", {
        data: { json: { key, enabled: true } },
      });
    }
  } finally {
    await api.dispose();
  }
}
