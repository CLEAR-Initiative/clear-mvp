"use client";

import { Center, Loader } from "@mantine/core";

/** The Map panel's loading state: the app's small accent loader, centred, as in data tables and cards. */
export function PanelLoader({ label }: { label: string }) {
  return (
    <Center p={32}>
      <Loader size="sm" aria-label={label} />
    </Center>
  );
}
