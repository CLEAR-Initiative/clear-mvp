"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Menu, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { useTeam } from "~/providers/team-provider";
import { useWorkingCountry } from "~/providers/working-country-provider";
import { isoForCountryName } from "~/lib/constants/countries";
import { shortCountryName } from "~/lib/constants/country-config";
import { colors, fontSizesPx, spacingPx } from "~/lib/tokens";

/**
 * Teams already started on their first country in this page session. Shared
 * by every picker instance: the mobile menu mounts a fresh one each time it
 * opens, and that must not reset a later "All Countries" from a page.
 */
const defaultedTeams = new Set<string>();

/** Test seam: forget which teams were defaulted. */
export function resetDefaultedTeamsForTest() {
  defaultedTeams.clear();
}

/**
 * The app-wide working country, picked under the sidebar logo. Shown only
 * when the active team is scoped to two or more countries; one country is
 * pinned and an unscoped team has nothing to pick. There is no "All
 * Countries" option: the app works on one country at a time. Plain text and
 * a chevron, no field box; collapsed, it shrinks to the ISO code.
 */
export function SidebarCountryPicker({ collapsed = false }: { collapsed?: boolean }) {
  const t = useTranslations("nav.country");
  const { activeTeamId } = useTeam();
  const { countries, countryId, countryName, showCountrySelector, scopeReady, setWorkingCountry } =
    useWorkingCountry();

  // A multi-country team with no stored pick starts on its first country,
  // once per team, so a later "All Countries" on a page is not overridden.
  useEffect(() => {
    if (!scopeReady || !showCountrySelector || !activeTeamId) return;
    if (defaultedTeams.has(activeTeamId)) return;
    defaultedTeams.add(activeTeamId);
    const first = countries[0];
    if (!countryId && first) setWorkingCountry(first.id);
  }, [scopeReady, showCountrySelector, activeTeamId, countryId, countries, setWorkingCountry]);

  if (!scopeReady || !showCountrySelector) return null;

  const label = collapsed
    ? (isoForCountryName(countryName) ?? "--")
    : countryName
      ? shortCountryName(countryName)
      : t("placeholder");

  return (
    <Menu position={collapsed ? "right-start" : "bottom-start"} offset={6} withArrow={collapsed}>
      <Menu.Target>
        <UnstyledButton
          aria-label={t("label")}
          title={collapsed && countryName ? shortCountryName(countryName) : undefined}
          data-testid="sidebar-country-picker"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: spacingPx[1],
            maxWidth: "100%",
            marginTop: 2,
            color: colors.textSecondary,
            background: "transparent",
          }}
          className="hover:!text-[var(--color-text-primary)] transition-colors"
        >
          <Text
            component="span"
            fw={500}
            style={{
              fontSize: fontSizesPx.md,
              letterSpacing: collapsed ? "0.05em" : undefined,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </Text>
          <IconChevronDown size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {countries.map((c) => (
          <Menu.Item
            key={c.id}
            onClick={() => setWorkingCountry(c.id)}
            fw={c.id === countryId ? 600 : undefined}
          >
            {shortCountryName(c.name)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
