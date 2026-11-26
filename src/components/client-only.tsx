"use client";

import type { ReactNode } from "react";

import { useHydrated } from "~/hooks/use-hydrated";

/**
 * Renders `children` only in the browser. The server and the hydrating
 * render show `fallback`; the children mount one render after hydration.
 * On a client-side navigation there is no hydration, so the children
 * render at once.
 *
 * Use it for a subtree that seeds its state from the browser (cookies,
 * sessionStorage, localStorage) in render or in a `useState` initializer.
 * The server cannot see those values, so a hydrated render of that subtree
 * would not match the server markup, and React throws #418.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useHydrated() ? children : fallback;
}
