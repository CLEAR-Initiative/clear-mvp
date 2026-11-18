import { Suspense } from "react";
import { AppShell } from "./app-shell";

/**
 * The shell is async (it waits for auth.me), so its output reaches the
 * browser as a lazy reference in a later RSC row. Next.js renders every
 * layout as the array `[assets, layout]`. When hydration started before that
 * row had streamed in, the lazy suspended inside the array, and React's
 * replay left the array's level out of every `useId` below. Mantine's
 * generated class names and ids then differed from the server HTML ("A tree
 * hydrated but some attributes ... didn't match"). A Suspense boundary here
 * gives the array a plain element, and a suspended shell hydrates later from
 * this boundary with its `useId` path intact.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
