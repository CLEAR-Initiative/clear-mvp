import { useTranslations } from "next-intl";
import { Box, Text, Group, Stack, Collapse, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import { signalIconUrl } from "~/lib/signals/resolve-icon";

// labelKey: i18n keys under map.severities.* - resolved via t() at render time.
const SEVERITY_ITEMS = [
  { labelKey: "critical", color: "#DC2626" },
  { labelKey: "high",     color: "#D97706" },
  { labelKey: "medium",   color: "#FBBF24" },
  { labelKey: "low",      color: "#059669" },
] as const;

// Grouped icon categories for the UI kit legend
const ICON_CATEGORIES = [
  {
    name: "Natural Disasters",
    icons: [
      { slug: "flood", label: "Flood" },
      { slug: "drought", label: "Drought" },
      { slug: "earthquake", label: "Earthquake" },
      { slug: "cyclone", label: "Cyclone/Storm" },
      { slug: "wildfire", label: "Wildfire" },
      { slug: "landslide", label: "Landslide" },
      { slug: "weather", label: "Weather" },
    ],
  },
  {
    name: "Conflict & Security",
    icons: [
      { slug: "conflict", label: "Conflict" },
      { slug: "explosive-hazard", label: "Explosive Hazard" },
      { slug: "human-rights", label: "Human Rights" },
      { slug: "gbv-risk", label: "GBV Risk" },
    ],
  },
  {
    name: "Health & WASH",
    icons: [
      { slug: "disease", label: "Disease/Outbreak" },
      { slug: "hospital", label: "Hospital" },
      { slug: "water-wash", label: "Water/WASH" },
    ],
  },
  {
    name: "Displacement & Migration",
    icons: [
      { slug: "refugees", label: "Refugees/IDPs" },
      { slug: "movement", label: "Movement" },
      { slug: "migration", label: "Migration" },
      { slug: "border-crossing", label: "Border Crossing" },
    ],
  },
  {
    name: "Food & Economic",
    icons: [
      { slug: "food-insecurity", label: "Food Insecurity" },
      { slug: "econ-shock", label: "Economic Shock" },
      { slug: "market-access", label: "Market Access" },
    ],
  },
  {
    name: "Infrastructure & Services",
    icons: [
      { slug: "road-closure", label: "Road Closure" },
      { slug: "power-grid", label: "Power Grid" },
      { slug: "telecomms", label: "Telecommunications" },
      { slug: "school-closure", label: "School Closure" },
      { slug: "supply-chain", label: "Supply Chain" },
    ],
  },
  {
    name: "Operations",
    icons: [
      { slug: "aid-delivery", label: "Aid Delivery" },
      { slug: "cash-assist", label: "Cash Assistance" },
      { slug: "shelter", label: "Shelter" },
      { slug: "protection", label: "Protection" },
      { slug: "logistics", label: "Logistics" },
    ],
  },
  {
    name: "Governance",
    icons: [
      { slug: "gov-policy", label: "Gov Policy" },
    ],
  },
] as const;

interface DisasterType {
  id: string;
  disasterType: string;
  disasterClass: string;
  glideNumber: string;
}

interface MapLegendPanelProps {
  eventTypes?: DisasterType[];
}

export function MapLegendPanel({ eventTypes = [] }: MapLegendPanelProps) {
  const t = useTranslations("map");
  const [showIconGuide, setShowIconGuide] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <Box
      className="absolute z-10 bg-[var(--color-bg-white)] border border-[var(--color-border)]"
      p={12}
      style={{ 
        bottom: 100, 
        left: 16, 
        minWidth: 140,
        maxWidth: 280,
        maxHeight: "calc(100vh - 200px)",
        overflowY: "auto",
      }}
    >
      <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 10, letterSpacing: "0.05em" }} mb={8}>
        {t("panels.legend")}
      </Text>

      <Stack gap={4}>
        <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={2}>
          {t("panels.severity")}
        </Text>
        {SEVERITY_ITEMS.map((item) => (
          <Group key={item.labelKey} gap={8}>
            <Box w={10} h={10} style={{ borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
            <Text size="xs" style={{ fontSize: 11 }}>{t(`severities.${item.labelKey}`)}</Text>
          </Group>
        ))}
      </Stack>

      {eventTypes.length > 0 && (
        <Stack gap={4} mt={10}>
          <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em" }} mb={2}>
            {t("panels.eventType")}
          </Text>
          {eventTypes.map((dt) => (
            <Group key={dt.id} gap={8}>
              <Text size="xs" c="var(--color-text-muted)" style={{ fontSize: 10, fontFamily: "monospace", minWidth: 18 }}>
                {dt.glideNumber.toUpperCase()}
              </Text>
              <Text size="xs" style={{ fontSize: 11, textTransform: "capitalize" }}>{dt.disasterType}</Text>
            </Group>
          ))}
        </Stack>
      )}

      {/* Icon Guide Section */}
      <Box mt={10} style={{ borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
        <UnstyledButton
          onClick={() => setShowIconGuide(!showIconGuide)}
          style={{ width: "100%", textAlign: "left" }}
        >
          <Group gap={6}>
            <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em" }}>
              ICON GUIDE
            </Text>
            <Text c="var(--color-text-muted)" style={{ fontSize: 10 }}>
              {showIconGuide ? "▼" : "▶"}
            </Text>
          </Group>
        </UnstyledButton>

        <Collapse in={showIconGuide}>
          <Stack gap={8} mt={6}>
            {ICON_CATEGORIES.map((category) => (
              <Box key={category.name}>
                <UnstyledButton
                  onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                  style={{ width: "100%", textAlign: "left" }}
                  mb={4}
                >
                  <Group gap={4}>
                    <Text size="xs" fw={600} style={{ fontSize: 10 }}>
                      {expandedCategory === category.name ? "▼" : "▶"}
                    </Text>
                    <Text size="xs" fw={600} style={{ fontSize: 10 }}>
                      {category.name}
                    </Text>
                  </Group>
                </UnstyledButton>

                <Collapse in={expandedCategory === category.name}>
                  <Stack gap={3} pl={12}>
                    {category.icons.map((icon) => (
                      <Group key={icon.slug} gap={6} wrap="nowrap">
                        <Box
                          style={{
                            width: 16,
                            height: 16,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "var(--color-bg-muted)",
                            borderRadius: 2,
                          }}
                        >
                          <img
                            src={signalIconUrl(icon.slug)}
                            alt={icon.label}
                            style={{ width: 12, height: 12, filter: "brightness(0)" }}
                          />
                        </Box>
                        <Text size="xs" style={{ fontSize: 10 }}>
                          {icon.label}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Collapse>
              </Box>
            ))}
          </Stack>
        </Collapse>
      </Box>
    </Box>
  );
}
