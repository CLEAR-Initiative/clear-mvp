"use client";

import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";

interface ColorSchemeToggleProps {
  size?: number;
}

export function ColorSchemeToggle({ size = 16 }: ColorSchemeToggleProps) {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });

  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="sm"
      onClick={() => setColorScheme(computed === "light" ? "dark" : "light")}
      aria-label="Toggle color scheme"
    >
      {computed === "dark" ? <IconSun size={size} /> : <IconMoon size={size} />}
    </ActionIcon>
  );
}
