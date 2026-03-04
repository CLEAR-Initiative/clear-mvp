import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client configured to use same-origin BFF proxy.
 * All auth requests go to /api/auth/* which is proxied server-to-server
 * to the Apollo API — the browser never makes cross-origin calls.
 *
 * During SSR/build, Better Auth validates the URL format so we provide
 * a placeholder absolute URL. The client methods (signIn, signOut, etc.)
 * are only ever called from browser event handlers, never during SSR.
 */
const baseURL =
  typeof window !== "undefined"
    ? "/api/auth"
    : "http://localhost/api/auth";

export const authClient = createAuthClient({ baseURL });
