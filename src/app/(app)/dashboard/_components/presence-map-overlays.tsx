"use client";

import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Box, Text, UnstyledButton } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { NRC_ORANGE, NrcLogoMark } from "~/components/ui/nrc-logo-mark";
import type { PresenceHover } from "~/components/map/crisis-map";
import { nrcOperatingCountry } from "~/lib/data/nrc-operating-countries";
import {
  SUDAN_NRC_OFFICE_COLORS,
  SUDAN_NRC_OFFICES,
  type SudanNrcOfficeType,
} from "~/lib/data/sudan-nrc-offices";

/**
 * Overlays of the Overview presence map ("NRC presence map" design
 * handoff): the presence card, the hover tooltip, the office legend and
 * "Back to world". Surfaces use the --map-glass-bg / --map-tooltip-bg tokens.
 */

const glass: CSSProperties = {
  position: "absolute",
  background: "var(--map-glass-bg)",
  backdropFilter: "blur(16px) saturate(1.2)",
  WebkitBackdropFilter: "blur(16px) saturate(1.2)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
};

export function PresenceCard({ count }: { count: number }) {
  const t = useTranslations("dashboard.worldMap");
  return (
    <Box
      style={{ ...glass, top: 14, left: 14, zIndex: 5, padding: "10px 14px 10px 10px", pointerEvents: "none" }}
      className="flex items-center gap-[10px]"
    >
      <Box style={{ borderRadius: 4, overflow: "hidden", lineHeight: 0 }}>
        <NrcLogoMark size={36} />
      </Box>
      <Box>
        <Text
          fw={700}
          tt="uppercase"
          c="var(--color-text-secondary)"
          style={{ fontSize: 10, letterSpacing: "0.06em", lineHeight: 1.3 }}
        >
          {t("presenceEyebrow")}
        </Text>
        <Box className="flex items-baseline gap-[6px]">
          <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: 20, lineHeight: 1.2 }}>
            {count}
          </Text>
          <Text c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
            {t("presenceCount")}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

export function BackToWorldButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("dashboard.worldMap");
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        ...glass,
        top: 11,
        left: 11,
        zIndex: 5,
        height: 28,
        padding: "0 10px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "var(--map-tooltip-bg)",
        border: "1px solid var(--color-border-dark)",
        color: "var(--color-text-primary)",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <IconArrowLeft size={14} />
      {t("backToWorld")}
    </UnstyledButton>
  );
}

export function PresenceTooltip({ hover }: { hover: PresenceHover }) {
  const t = useTranslations("dashboard.worldMap");
  const tMap = useTranslations("map.nrcOffices");
  let title: string;
  let sub: string;
  if (hover.kind === "country") {
    const country = nrcOperatingCountry(hover.iso2);
    if (!country) return null;
    title = country.name;
    sub = t("countryTooltip", { city: country.pinCity });
  } else if (hover.kind === "countryOffice") {
    const country = nrcOperatingCountry(hover.iso2);
    if (!country) return null;
    title = t("countryOfficeName", { city: country.pinCity });
    sub = `${tMap("types.country_office")} · ${country.name}`;
  } else {
    const office = SUDAN_NRC_OFFICES.find((o) => o.id === hover.officeId);
    if (!office) return null;
    title = office.name;
    sub = `${tMap(`types.${office.officeType}`)} · ${office.state}`;
  }
  return (
    <Box
      style={{
        position: "absolute",
        left: hover.x + 14,
        top: hover.y - 12,
        zIndex: 6,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        padding: "6px 10px",
        borderRadius: 6,
        background: "var(--map-tooltip-bg)",
        border: "1px solid var(--color-border-dark)",
        boxShadow: "0 2px 8px var(--map-overlay-shadow)",
      }}
    >
      <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 12 }}>{title}</Text>
      <Text c="var(--color-text-secondary)" style={{ fontSize: 11 }}>{sub}</Text>
    </Box>
  );
}

const OFFICE_TYPE_ORDER: SudanNrcOfficeType[] = [
  "country_office",
  "area_office",
  "field_office",
  "planned_or_expansion",
  "former_country_office",
];

/** Office types shown for a country: Sudan's from its office data, elsewhere the country office only. */
export function officeTypesFor(iso2: string): SudanNrcOfficeType[] {
  if (iso2 !== "SD") return ["country_office"];
  const present = new Set(SUDAN_NRC_OFFICES.map((o) => o.officeType));
  return OFFICE_TYPE_ORDER.filter((type) => present.has(type));
}

function Swatch({ type }: { type: SudanNrcOfficeType }): ReactNode {
  if (type === "country_office") {
    return (
      <Box
        style={{
          width: 11,
          height: 11,
          borderRadius: "50%",
          background: NRC_ORANGE,
          border: "1px solid #FFFFFF",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <Box style={{ width: 11, height: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Box
        style={{
          width: 8,
          height: 8,
          borderRadius: 1,
          transform: "rotate(45deg)",
          background: SUDAN_NRC_OFFICE_COLORS[type],
        }}
      />
    </Box>
  );
}

export function OfficeLegend({ iso2 }: { iso2: string }) {
  const tMap = useTranslations("map.nrcOffices");
  return (
    <Box style={{ ...glass, left: 14, bottom: 14, zIndex: 5, padding: "9px 12px" }} className="flex flex-col gap-[5px]">
      {officeTypesFor(iso2).map((type) => (
        <Box key={type} className="flex items-center gap-[7px]">
          <Swatch type={type} />
          <Text c="var(--color-text-secondary)" style={{ fontSize: 10 }}>
            {tMap(`types.${type}`)}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
