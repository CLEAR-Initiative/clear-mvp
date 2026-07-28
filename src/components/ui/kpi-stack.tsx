"use client";

import { Box, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { ReactNode } from "react";

export interface KpiItem {
  icon: ReactNode;
  iconBg: string;
  value: string;
  label: string;
}

export interface KpiSection {
  title: string;
  items: KpiItem[];
}

function ImpactRow({ icon, iconBg, value, label }: KpiItem) {
  return (
    <Box px={12} py={10} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Box
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box style={{ minWidth: 0 }}>
        <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: 17, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {value}
        </Text>
        <Text size="xs" c="var(--color-text-muted)" mt={2} truncate>
          {label}
        </Text>
      </Box>
    </Box>
  );
}

export function KpiStack({ sections }: { sections: KpiSection[] }) {
  const isMobile = useMediaQuery("(max-width: 48em)") === true;

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        width: "100%",
        background: "var(--color-bg-white)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {sections.map((section, si) => (
        <Box
          key={section.title}
          style={{
            flex: 1,
            minWidth: 0,
            borderInlineEnd:
              !isMobile && si < sections.length - 1 ? "1px solid var(--color-border)" : undefined,
            borderBottom:
              isMobile && si < sections.length - 1 ? "1px solid var(--color-border)" : undefined,
          }}
        >
          <Box
            px={12}
            py={6}
            style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-muted)" }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              {section.title}
            </Text>
          </Box>
          <Box style={{ display: "flex" }}>
            {section.items.map((item, ii) => (
              <Box
                key={ii}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderInlineEnd: ii < section.items.length - 1 ? "1px solid var(--color-border)" : undefined,
                }}
              >
                <ImpactRow {...item} />
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
