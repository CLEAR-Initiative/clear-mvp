import type { ReactNode } from "react";
import { Group, Select, Text } from "@mantine/core";

const LABEL_STYLE = {
  fontSize: 10,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const INPUT_STYLE = {
  fontWeight: 600,
  fontSize: 13,
  border: "1px solid var(--color-border)",
};

function FilterLabel({ children }: { children: string }) {
  return (
    <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={LABEL_STYLE}>
      {children}
    </Text>
  );
}

interface FilterBarProps {
  country: string;
  onCountryChange: (value: string) => void;
  region?: string;
  onRegionChange?: (value: string) => void;
  countries: string[];
  regions?: string[];
  /** Replaces the default Region select. Use to render a custom picker (e.g. RegionPicker). */
  regionsContent?: ReactNode;
  date?: string;
  onDateChange?: (value: string) => void;
  dateOptions?: string[];
  children?: ReactNode;
}

export function FilterBar({
  country,
  onCountryChange,
  region,
  onRegionChange,
  countries,
  regions,
  regionsContent,
  date,
  onDateChange,
  dateOptions,
  children,
}: FilterBarProps) {
  return (
    <Group gap={12}>
      <Select
        size="xs"
        value={country}
        onChange={(v) => onCountryChange(v ?? country)}
        data={countries}
        style={{ minWidth: 130 }}
        styles={{ input: INPUT_STYLE }}
        label={<FilterLabel>Country</FilterLabel>}
      />
      {regionsContent ?? (region != null && regions != null && onRegionChange != null && (
        <Select
          size="xs"
          value={region}
          onChange={(v) => onRegionChange(v ?? "All Regions")}
          data={regions}
          style={{ minWidth: 130 }}
          styles={{ input: INPUT_STYLE }}
          label={<FilterLabel>Region</FilterLabel>}
        />
      ))}
      {date != null && onDateChange && dateOptions && (
        <Select
          size="xs"
          value={date}
          onChange={(v) => onDateChange(v ?? date)}
          data={dateOptions}
          style={{ minWidth: 120 }}
          styles={{ input: INPUT_STYLE }}
          label={<FilterLabel>Date</FilterLabel>}
        />
      )}
      {children}
    </Group>
  );
}
