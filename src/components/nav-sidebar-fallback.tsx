import { Box } from "@mantine/core";

/** Layout-stable placeholder while NavSidebar Suspense resolves. */
export function NavSidebarFallback() {
  return (
    <Box
      visibleFrom="sm"
      style={{
        width: 240,
        flexShrink: 0,
        minHeight: "100vh",
        background: "var(--color-bg-white)",
        borderInlineEnd: "1px solid var(--color-border)",
      }}
      aria-hidden
    />
  );
}
