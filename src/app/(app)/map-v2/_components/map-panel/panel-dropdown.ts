import type { ComboboxProps } from "@mantine/core";

export const panelDropdownProps = {
  position: "bottom-start",
  offset: 4,
  width: "target",
  middlewares: {
    flip: true,
    shift: true,
    size: {
      apply: ({ availableHeight, elements }) =>
        elements.floating.style.setProperty("--panel-dropdown-room", `${availableHeight}px`),
    },
  },
} satisfies Partial<ComboboxProps>;
