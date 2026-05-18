"use client";

import { SegmentedControl, Center, Box } from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";

type ColorSchemeValue = "light" | "auto" | "dark";

const SEGMENTS: { value: ColorSchemeValue; icon: React.ReactNode }[] = [
  { value: "light", icon: <IconSun size={14} /> },
  { value: "auto", icon: <IconDeviceDesktop size={14} /> },
  { value: "dark", icon: <IconMoon size={14} /> },
];

export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme({
    keepTransitions: true,
  });

  return (
    <SegmentedControl
      size="xs"
      value={colorScheme}
      onChange={(v) => setColorScheme(v as ColorSchemeValue)}
      data={SEGMENTS.map(({ value, icon }) => ({
        value,
        label: (
          <Center>
            <Box style={{ display: "flex", alignItems: "center" }}>{icon}</Box>
          </Center>
        ),
      }))}
    />
  );
}
