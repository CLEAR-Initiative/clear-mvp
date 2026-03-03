import { createAuthClient } from "better-auth/react";

const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_AUTH_URL) {
  throw new Error(
    "Missing NEXT_PUBLIC_AUTH_URL environment variable. This is required in production."
  );
}

export const authClient = createAuthClient({
  baseURL: authUrl,
});
