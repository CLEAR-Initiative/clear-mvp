"use client";

import { ActionIcon, Menu } from "@mantine/core";
import { useTranslations } from "next-intl";
import { IconDots, IconMapPinCog } from "@tabler/icons-react";

/**
 * The ⋯ menu at the top right of a Signal, next to its "Signal" label.
 * Renders nothing when the reader has no action on the Signal; today the
 * only one is changing its location (the active team's analysts and
 * platform admins), which the team's admin then decides.
 */
export function SignalActionsMenu({
  canChangeLocation,
  hasOpenChange,
  onChangeLocation,
}: {
  canChangeLocation: boolean;
  /** The Signal has an open location change: the item edits it. */
  hasOpenChange: boolean;
  onChangeLocation: () => void;
}) {
  const t = useTranslations("signalDetail");
  const tChange = useTranslations("locationChallenge");
  if (!canChangeLocation) return null;

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={t("actions.menu")}
          data-testid="signal-actions-menu"
        >
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconMapPinCog size={14} />}
          onClick={onChangeLocation}
          data-testid="signal-change-location"
        >
          {hasOpenChange ? tChange("actions.editChange") : tChange("actions.changeLocation")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
