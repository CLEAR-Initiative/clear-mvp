"use client";

import { Box, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { SOURCE_META, type CountryKey } from "./saf-data";

interface SourcesTabProps {
  countryKey: CountryKey;
}

const FRAMEWORK_SOURCES = [
  {
    org: "NRC Situation Analysis Framework",
    type: "Methodology",
    url: "https://www.nrc.no",
    linkLabel: "nrc.no",
    desc: "NRC's standardised framework for conducting humanitarian situation analyses across acute crisis contexts.",
  },
  {
    org: "CLEAR Automated Analysis",
    type: "AI Pipeline",
    url: "https://github.com/MediaMonitoringAndAnalysis/CLEAR-AutomatedAnalysis",
    linkLabel: "GitHub",
    desc: "Open-source media monitoring pipeline extracting structured humanitarian intelligence from news and field reports.",
  },
  {
    org: "IASC Humanitarian Standards",
    type: "Methodology",
    url: "https://interagencystandingcommittee.org",
    linkLabel: "iasc.org",
    desc: "Inter-Agency Standing Committee standards underpinning severity classification and sectoral analysis categories.",
  },
];

const SOURCE_TYPE_COLOR: Record<string, string> = {
  "UN Agency": "var(--color-info)",
  "Coordination Body": "var(--color-accent)",
  Government: "var(--color-success)",
  INGO: "var(--color-warning)",
  Methodology: "var(--color-text-muted)",
  "AI Pipeline": "var(--color-ai)",
};

export function SourcesTab({ countryKey }: SourcesTabProps) {
  const primarySources = SOURCE_META[countryKey] ?? [];
  const countryLabel =
    countryKey.charAt(0).toUpperCase() + countryKey.slice(1);

  return (
    <Stack gap={20} pb={32}>
      {/* ── Primary sources ─────────────────────────────────────── */}
      <SectionLabel>Primary Sources — {countryLabel}</SectionLabel>
      <SimpleGrid cols={3} spacing={10}>
        {primarySources.map((s) => (
          <SourceCard key={s.org} {...s} />
        ))}
      </SimpleGrid>

      {/* ── Framework & methodology ─────────────────────────────── */}
      <SectionLabel>Framework &amp; Methodology</SectionLabel>
      <SimpleGrid cols={3} spacing={10}>
        {FRAMEWORK_SOURCES.map((s) => (
          <SourceCard key={s.org} {...s} linkLabel={s.linkLabel} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Box pb={6} style={{ borderBottom: "1px solid var(--color-border)" }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--color-text-muted)",
        }}
      >
        {children}
      </Text>
    </Box>
  );
}

function SourceCard({
  org,
  type,
  url,
  linkLabel = "Visit source",
  desc,
}: {
  org: string;
  type: string;
  url: string;
  linkLabel?: string;
  desc: string;
}) {
  const typeColor = SOURCE_TYPE_COLOR[type] ?? "var(--color-text-muted)";

  return (
    <Box
      p="15px 17px"
      style={{
        background: "var(--color-bg-white)",
        border: "1px solid var(--color-border)",
      }}
    >
      <Text
        mb={2}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-primary)",
          lineHeight: 1.3,
        }}
      >
        {org}
      </Text>
      <Text
        mb={8}
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: typeColor,
        }}
      >
        {type}
      </Text>
      <Box
        component="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
      >
        <Group
          gap={4}
          align="center"
          style={{
            fontSize: 11,
            color: "var(--color-info)",
            border: "1px solid var(--color-info-light)",
            background: "var(--color-info-light)",
            padding: "2px 7px",
          }}
        >
          <IconExternalLink size={10} />
          <span>{linkLabel}</span>
        </Group>
      </Box>
      <Text
        mt={8}
        style={{
          fontSize: 11.5,
          color: "var(--color-text-secondary)",
          lineHeight: 1.5,
        }}
      >
        {desc}
      </Text>
    </Box>
  );
}
