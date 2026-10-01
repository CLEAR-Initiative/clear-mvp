"use client";

/**
 * A deep-linked country the page can't show (outside the active team's
 * scope) is dropped with a word to the user, instead of the page quietly
 * showing another country under the Agent's "Moved you to …".
 */

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { notifications } from "@mantine/notifications";

export function useDeepLinkCountryScope({
  linkCountry,
  selectedCountry,
  scopeReady,
  drop,
}: {
  linkCountry: string | undefined;
  selectedCountry: string;
  scopeReady: boolean;
  drop: () => void;
}): void {
  const t = useTranslations("agent.navigation");
  const unhonoured = scopeReady && !!linkCountry && selectedCountry !== linkCountry;
  useEffect(() => {
    if (!unhonoured || !linkCountry) return;
    notifications.show({ color: "yellow", message: t("outOfScope", { country: linkCountry }) });
    drop();
  }, [unhonoured, linkCountry, t, drop]);
}
