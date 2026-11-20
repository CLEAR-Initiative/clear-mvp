"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * False on the server and while this component hydrates; true from the
 * render right after hydration, and on every client-only render.
 *
 * Use it to gate markup on client-fetched state (a React Query result, a
 * context fed by one). The server renders that state as "loading". If the
 * data lands before a later Suspense boundary hydrates, the boundary
 * hydrates with the data, renders markup the server never sent, and React
 * throws #418. Behind this gate the boundary hydrates the server markup,
 * then catches up one render later.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
