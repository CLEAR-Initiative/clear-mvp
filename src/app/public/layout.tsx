import type { Metadata } from "next";

/**
 * Layout for the /public/* bucket. Routes here are unauthenticated and
 * do not get the auth nav, sidebar, team provider, or onboarding gate
 * — those live under `(app)/layout.tsx` and don't bleed into other
 * top-level groups.
 *
 * We don't need our own providers either: Mantine, i18n, and the
 * tRPC client are already set up in the root `layout.tsx`. This shell
 * just renders children verbatim. Future tweak: add an opengraph
 * Metadata defaults block when we have a real share-card design.
 */
export const metadata: Metadata = {
  // Search engines should not index public share links — the URL is
  // the only access control, and indexing would leak it.
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
